import { ref, watch } from "vue";
import { Camera, CameraResultType, CameraSource, Photo } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { ref as dbRef, push, set, update, remove, onValue } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/composables/useAuth";

export interface UserPhoto {
  id: string;
  filepath: string;
  webviewPath?: string;
  name: string;
  size: number;
  albumId?: string;
  createdAt: number;
}

const photos = ref<UserPhoto[]>([]);
let unsubscribe: (() => void) | null = null;

const { currentUser } = useAuth();

const enrichWebviewPaths = async (
  entries: Array<Omit<UserPhoto, "webviewPath">>
): Promise<UserPhoto[]> => {
  if (Capacitor.getPlatform() === "web") {
    return Promise.all(
      entries.map(async (photo) => {
        try {
          const file = await Filesystem.readFile({
            path: photo.filepath,
            directory: Directory.Data,
          });
          return { ...photo, webviewPath: `data:image/jpeg;base64,${file.data}` };
        } catch {
          return { ...photo, webviewPath: undefined };
        }
      })
    );
  }

  return entries.map((photo) => ({
    ...photo,
    webviewPath: Capacitor.convertFileSrc(photo.filepath),
  }));
};

watch(
  currentUser,
  (user) => {
    unsubscribe?.();
    unsubscribe = null;
    photos.value = [];

    if (!user) return;

    unsubscribe = onValue(dbRef(db, `photos/${user.uid}`), async (snapshot) => {
      const data = (snapshot.val() ?? {}) as Record<
        string,
        Omit<UserPhoto, "id" | "webviewPath">
      >;
      const entries = Object.entries(data).map(([id, value]) => ({ id, ...value }));
      const enriched = await enrichWebviewPaths(entries);
      photos.value = enriched.sort((a, b) => b.createdAt - a.createdAt);
    });
  },
  { immediate: true }
);

const convertBlobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const BLACK_BORDER_THRESHOLD = 12;

// The web fallback camera (@ionic/pwa-elements) can pad captured frames with
// solid black bars when the webcam's native aspect ratio doesn't match the
// capture canvas. Trim any solid-black rows/columns from the outer edges
// before saving so the stored photo matches what the camera actually saw.
const cropBlackBorders = (image: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);

  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  const isNearBlack = (i: number) =>
    data[i] <= BLACK_BORDER_THRESHOLD &&
    data[i + 1] <= BLACK_BORDER_THRESHOLD &&
    data[i + 2] <= BLACK_BORDER_THRESHOLD;

  const isBlackColumn = (x: number) => {
    for (let y = 0; y < height; y++) {
      if (!isNearBlack((y * width + x) * 4)) return false;
    }
    return true;
  };
  const isBlackRow = (y: number) => {
    for (let x = 0; x < width; x++) {
      if (!isNearBlack((y * width + x) * 4)) return false;
    }
    return true;
  };

  let left = 0;
  while (left < width / 2 && isBlackColumn(left)) left++;
  let right = width - 1;
  while (right > width / 2 && isBlackColumn(right)) right--;
  let top = 0;
  while (top < height / 2 && isBlackRow(top)) top++;
  let bottom = height - 1;
  while (bottom > height / 2 && isBlackRow(bottom)) bottom--;

  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  if (cropWidth === width && cropHeight === height) return canvas;

  const cropped = document.createElement("canvas");
  cropped.width = cropWidth;
  cropped.height = cropHeight;
  cropped
    .getContext("2d")!
    .drawImage(canvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return cropped;
};

const canvasToBase64 = (canvas: HTMLCanvasElement) =>
  new Promise<string>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode image"));
        return;
      }
      convertBlobToBase64(blob).then(resolve, reject);
    }, "image/jpeg", 0.92);
  });

const pad = (n: number) => String(n).padStart(2, "0");

const buildTimestamp = (date: Date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}${pad(date.getMilliseconds() % 100)}`;

const generateFileName = (stamp: string) => {
  const uniqueSuffix = Math.floor(Math.random() * 900 + 100);
  return `IMG_${stamp}_${uniqueSuffix}.jpeg`;
};

const saveImageFile = async (
  photo: Photo,
  fileName: string
): Promise<{ filepath: string; size: number }> => {
  let base64Data: string;

  if (Capacitor.getPlatform() !== "web") {
    const file = await Filesystem.readFile({ path: photo.path! });
    base64Data = file.data as string;
  } else {
    const image = await loadImage(photo.webPath!);
    const cropped = cropBlackBorders(image);
    base64Data = await canvasToBase64(cropped);
  }

  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Data,
  });

  let size = 0;
  try {
    const stat = await Filesystem.stat({ path: fileName, directory: Directory.Data });
    size = stat.size;
  } catch {
    // best-effort; details view will just show an unknown size
  }

  return {
    filepath: Capacitor.getPlatform() === "web" ? fileName : savedFile.uri,
    size,
  };
};

const requireUid = () => {
  const uid = currentUser.value?.uid;
  if (!uid) throw new Error("Not signed in");
  return uid;
};

export function usePhotoGallery() {
  const takePhoto = async () => {
    const uid = requireUid();
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 90,
    });

    const now = new Date();
    const stamp = buildTimestamp(now);
    const fileName = generateFileName(stamp);
    const { filepath, size } = await saveImageFile(capturedPhoto, fileName);

    const newRef = push(dbRef(db, `photos/${uid}`));
    await set(newRef, {
      filepath,
      size,
      name: `IMG_${stamp}`,
      albumId: null,
      createdAt: now.getTime(),
    });
  };

  const deletePhotos = async (ids: string[]) => {
    const uid = requireUid();
    const toDelete = photos.value.filter((p) => ids.includes(p.id));

    await Promise.all(ids.map((id) => remove(dbRef(db, `photos/${uid}/${id}`))));

    await Promise.all(
      toDelete.map(async (photo) => {
        const filename = photo.filepath.substring(photo.filepath.lastIndexOf("/") + 1);
        try {
          await Filesystem.deleteFile({ path: filename, directory: Directory.Data });
        } catch {
          // file already gone, nothing left to clean up
        }
      })
    );
  };

  const deletePhoto = (id: string) => deletePhotos([id]);

  const renamePhoto = async (id: string, name: string) => {
    const uid = requireUid();
    await update(dbRef(db, `photos/${uid}/${id}`), { name });
  };

  const moveToAlbum = async (ids: string[], albumId?: string) => {
    const uid = requireUid();
    await Promise.all(
      ids.map((id) => update(dbRef(db, `photos/${uid}/${id}`), { albumId: albumId ?? null }))
    );
  };

  const unassignAlbum = async (albumId: string) => {
    const uid = requireUid();
    const affected = photos.value.filter((p) => p.albumId === albumId);
    await Promise.all(
      affected.map((p) => update(dbRef(db, `photos/${uid}/${p.id}`), { albumId: null }))
    );
  };

  return {
    photos,
    takePhoto,
    deletePhoto,
    deletePhotos,
    renamePhoto,
    moveToAlbum,
    unassignAlbum,
  };
}
