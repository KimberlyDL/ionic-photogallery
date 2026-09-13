import { ref, computed, watch } from "vue";
import { ref as dbRef, push, set, update, remove, onValue } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/composables/useAuth";

export interface Album {
  id: string;
  name: string;
  createdAt: number;
  isDefault?: boolean;
}

export const DEFAULT_ALBUM_ID = "default";
export const DEFAULT_ALBUM_NAME = "Camera";

const albums = ref<Album[]>([]);
let unsubscribe: (() => void) | null = null;

const { currentUser } = useAuth();

watch(
  currentUser,
  (user) => {
    unsubscribe?.();
    unsubscribe = null;
    albums.value = [];

    if (!user) return;

    unsubscribe = onValue(dbRef(db, `albums/${user.uid}`), (snapshot) => {
      const data = (snapshot.val() ?? {}) as Record<string, Omit<Album, "id">>;
      albums.value = Object.entries(data)
        .map(([id, value]) => ({ id, ...value }))
        .sort((a, b) => b.createdAt - a.createdAt);
    });
  },
  { immediate: true }
);

const requireUid = () => {
  const uid = currentUser.value?.uid;
  if (!uid) throw new Error("Not signed in");
  return uid;
};

export function useAlbums() {
  // The "Camera" album is the default home for every captured photo, the way
  // a stock gallery app keeps a Camera/Recents bucket alongside user albums.
  // It always exists and can't be renamed or deleted.
  const allAlbums = computed<Album[]>(() => [
    { id: DEFAULT_ALBUM_ID, name: DEFAULT_ALBUM_NAME, createdAt: 0, isDefault: true },
    ...albums.value,
  ]);

  const createAlbum = async (name: string) => {
    const uid = requireUid();
    const newRef = push(dbRef(db, `albums/${uid}`));
    await set(newRef, { name, createdAt: Date.now() });
  };

  const renameAlbum = async (id: string, name: string) => {
    if (id === DEFAULT_ALBUM_ID) return;
    const uid = requireUid();
    await update(dbRef(db, `albums/${uid}/${id}`), { name });
  };

  const deleteAlbum = async (id: string) => {
    if (id === DEFAULT_ALBUM_ID) return;
    const uid = requireUid();
    await remove(dbRef(db, `albums/${uid}/${id}`));
  };

  const albumName = (id?: string) =>
    id ? allAlbums.value.find((a) => a.id === id)?.name ?? "Unknown Album" : DEFAULT_ALBUM_NAME;

  return { albums, allAlbums, createAlbum, renameAlbum, deleteAlbum, albumName };
}
