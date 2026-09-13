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

const pad = (n: number) => String(n).padStart(2, "0");

const generateFileName = (date: Date) => {
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}${pad(date.getMilliseconds() % 100)}`;
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
    const response = await fetch(photo.webPath!);
    const blob = await response.blob();
    base64Data = await convertBlobToBase64(blob);
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
    const fileName = generateFileName(now);
    const { filepath, size } = await saveImageFile(capturedPhoto, fileName);

    const newRef = push(dbRef(db, `photos/${uid}`));
    await set(newRef, {
      filepath,
      size,
      name: now.toLocaleString(),
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
