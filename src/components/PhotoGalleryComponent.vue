<template>
  <div class="gallery-toolbar">
    <ion-searchbar v-model="search" placeholder="Search by name" class="gallery-search" />
    <div class="toolbar-row">
      <ion-segment v-model="viewMode" class="gallery-segment pill-segment">
        <ion-segment-button value="grid">
          <ion-icon :icon="gridOutline" />
        </ion-segment-button>
        <ion-segment-button value="list">
          <ion-icon :icon="listOutline" />
        </ion-segment-button>
      </ion-segment>
      <ion-buttons>
        <ion-button fill="outline" size="small" @click="openSortSheet">
          <ion-icon slot="start" :icon="swapVerticalOutline" />
          {{ sortLabel }}
        </ion-button>
        <ion-button
          :fill="selectionMode ? 'solid' : 'outline'"
          :color="selectionMode ? 'primary' : undefined"
          size="small"
          @click="toggleSelectionMode"
        >
          {{ selectionMode ? "Cancel" : "Select" }}
        </ion-button>
      </ion-buttons>
    </div>
  </div>

  <ion-toolbar v-if="selectionMode" color="light" class="selection-bar">
    <ion-buttons slot="start">
      <ion-button @click="selectAll">Select All</ion-button>
    </ion-buttons>
    <ion-title size="small">{{ selectedIds.size }} selected</ion-title>
    <ion-buttons slot="end">
      <ion-button :disabled="!selectedIds.size" @click="handleBulkMove">
        Move
      </ion-button>
      <ion-button :disabled="!selectedIds.size" color="danger" @click="handleBulkDelete">
        Delete
      </ion-button>
    </ion-buttons>
  </ion-toolbar>

  <ion-grid v-if="viewMode === 'grid' && pagedPhotos.length">
    <ion-row>
      <ion-col size="6" v-for="photo in pagedPhotos" :key="photo.id">
        <div
          class="grid-item"
          @pointerdown="longPress.start(photo)"
          @pointerup="longPress.cancel()"
          @pointerleave="longPress.cancel()"
          @pointercancel="longPress.cancel()"
          @click="handleItemTap(photo)"
        >
          <div class="grid-item-thumb">
            <img :src="photo.url" loading="lazy" class="grid-item-img" />
            <div v-if="selectionMode" class="select-overlay">
              <ion-icon
                :icon="selectedIds.has(photo.id) ? checkmarkCircle : ellipseOutline"
                :color="selectedIds.has(photo.id) ? 'primary' : 'light'"
              />
            </div>
            <ion-button
              v-else
              fill="clear"
              class="grid-menu-button"
              @pointerdown.stop
              @click.stop="openItemMenu(photo)"
            >
              <ion-icon slot="icon-only" :icon="ellipsisVertical" />
            </ion-button>
          </div>
          <div class="grid-item-name">{{ photo.name }}</div>
        </div>
      </ion-col>
    </ion-row>
  </ion-grid>

  <ion-list v-else-if="viewMode === 'list' && pagedPhotos.length">
    <ion-item
      v-for="photo in pagedPhotos"
      :key="photo.id"
      button
      lines="none"
      class="photo-row"
      @pointerdown="longPress.start(photo)"
      @pointerup="longPress.cancel()"
      @pointerleave="longPress.cancel()"
      @pointercancel="longPress.cancel()"
      @click="handleItemTap(photo)"
    >
      <ion-checkbox
        v-if="selectionMode"
        slot="start"
        :checked="selectedIds.has(photo.id)"
        style="pointer-events: none"
      />
      <ion-thumbnail v-else slot="start">
        <img :src="photo.url" />
      </ion-thumbnail>
      <ion-label>
        <h2>{{ photo.name }}</h2>
        <p>{{ formatDate(photo.createdAt) }} &middot; {{ formatBytes(photo.size) }}</p>
      </ion-label>
      <ion-button
        v-if="!selectionMode"
        slot="end"
        fill="clear"
        class="row-menu-button"
        @pointerdown.stop
        @click.stop="openItemMenu(photo)"
      >
        <ion-icon slot="icon-only" :icon="ellipsisVertical" />
      </ion-button>
    </ion-item>
  </ion-list>

  <div v-else class="empty-state">
    <ion-icon :icon="imagesOutline" />
    <p>No photos {{ search ? "match your search" : "yet" }}.</p>
  </div>

  <ion-infinite-scroll
    v-if="!selectionMode"
    :disabled="!canLoadMore"
    threshold="120px"
    @ionInfinite="handleInfinite"
  >
    <ion-infinite-scroll-content loading-text="Loading more photos..." />
  </ion-infinite-scroll>

  <ion-modal :is-open="!!selectedPhoto" @didDismiss="closeViewer">
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-button @click="closeViewer">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title class="viewer-title">{{ selectedPhoto?.name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="selectedPhoto" @click="openItemMenu(selectedPhoto)">
            <ion-icon slot="icon-only" :icon="ellipsisVertical" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="viewer-content" v-if="selectedPhoto">
      <div
        ref="viewerWrapRef"
        class="viewer-image-wrap"
        @pointerdown="onViewerPointerDown"
        @pointermove="onViewerPointerMove"
        @pointerup="onViewerPointerUp"
        @pointercancel="onViewerPointerUp"
        @pointerleave="onViewerPointerUp"
      >
        <img
          :src="selectedPhoto.url"
          class="viewer-image"
          :class="{ 'viewer-image-zoomed': zoomScale > 1 }"
          :style="{ transform: `translate(${panX}px, ${panY}px) scale(${zoomScale})` }"
        />
      </div>
    </ion-content>
  </ion-modal>

  <ion-modal :is-open="!!detailsPhoto" @didDismiss="closeDetails">
    <ion-header>
      <ion-toolbar>
        <ion-title>Photo Details</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="closeDetails">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content v-if="detailsPhoto">
      <ion-list>
        <ion-item>
          <ion-label>
            <p>Name</p>
            <h3>{{ detailsPhoto.photo.name }}</h3>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <p>Date</p>
            <h3>{{ formatDate(detailsPhoto.photo.createdAt) }}</h3>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <p>Size</p>
            <h3>{{ formatBytes(detailsPhoto.photo.size) }}</h3>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <p>Dimensions</p>
            <h3>{{ detailsPhoto.width }} &times; {{ detailsPhoto.height }}</h3>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-label>
            <p>Album</p>
            <h3>{{ albumName(detailsPhoto.photo.albumId) }}</h3>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonCheckbox,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  alertController,
  actionSheetController,
} from "@ionic/vue";
import type { InfiniteScrollCustomEvent } from "@ionic/vue";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import {
  imagesOutline,
  gridOutline,
  listOutline,
  checkmarkCircle,
  ellipseOutline,
  closeOutline,
  ellipsisVertical,
  swapVerticalOutline,
} from "ionicons/icons";
import type { GalleryPhoto } from "@/types/gallery";
import { usePhotoGallery } from "@/composables/usePhotoGallery";
import { useAlbums, DEFAULT_ALBUM_ID } from "@/composables/useAlbums";
import { useLongPress } from "@/composables/useLongPress";

const props = defineProps<{
  photos: GalleryPhoto[];
  currentAlbumId?: string;
}>();

const { deletePhotos, renamePhoto, moveToAlbum } = usePhotoGallery();
const { allAlbums, albumName } = useAlbums();

const PAGE_SIZE = 12;

type SortField = "name" | "date" | "size";
type SortDir = "asc" | "desc";

const viewMode = ref<"grid" | "list">("grid");
const search = ref("");
const visibleCount = ref(PAGE_SIZE);
const sortField = ref<SortField>("date");
const sortDir = ref<SortDir>("desc");
const selectedPhotoId = ref<string | null>(null);
const selectedPhoto = computed(
  () => props.photos.find((p) => p.id === selectedPhotoId.value) ?? null
);

const selectionMode = ref(false);
const selectedIds = ref<Set<string>>(new Set());

const sortLabel = computed(() => {
  const field = { name: "Name", date: "Date", size: "Size" }[sortField.value];
  return `${field} ${sortDir.value === "asc" ? "↑" : "↓"}`;
});

const filteredPhotos = computed(() => {
  const term = search.value.trim().toLowerCase();
  const base = term ? props.photos.filter((p) => p.name.toLowerCase().includes(term)) : props.photos;
  const dir = sortDir.value === "asc" ? 1 : -1;

  return [...base].sort((a, b) => {
    if (sortField.value === "name") return a.name.localeCompare(b.name) * dir;
    if (sortField.value === "size") return (a.size - b.size) * dir;
    return (a.createdAt - b.createdAt) * dir;
  });
});

const pagedPhotos = computed(() => filteredPhotos.value.slice(0, visibleCount.value));
const canLoadMore = computed(() => filteredPhotos.value.length > visibleCount.value);

watch([search, sortField, sortDir], () => {
  visibleCount.value = PAGE_SIZE;
});

const handleInfinite = (ev: InfiniteScrollCustomEvent) => {
  visibleCount.value += PAGE_SIZE;
  ev.target.complete();
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

const getImageDimensions = (url: string) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });

const openSortSheet = async () => {
  const sheet = await actionSheetController.create({
    header: "Sort by",
    buttons: [
      { text: "Name (A → Z)", handler: () => setSort("name", "asc") },
      { text: "Name (Z → A)", handler: () => setSort("name", "desc") },
      { text: "Date (Newest first)", handler: () => setSort("date", "desc") },
      { text: "Date (Oldest first)", handler: () => setSort("date", "asc") },
      { text: "Size (Largest first)", handler: () => setSort("size", "desc") },
      { text: "Size (Smallest first)", handler: () => setSort("size", "asc") },
      { text: "Cancel", role: "cancel" },
    ],
  });
  await sheet.present();
};

const setSort = (field: SortField, dir: SortDir) => {
  sortField.value = field;
  sortDir.value = dir;
};

const toggleSelectionMode = () => {
  selectionMode.value = !selectionMode.value;
  selectedIds.value = new Set();
};

const toggleSelect = (id: string) => {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
};

const selectAll = () => {
  selectedIds.value = new Set(pagedPhotos.value.map((p) => p.id));
};

const longPress = useLongPress<GalleryPhoto>((photo) => {
  if (!selectionMode.value) {
    selectionMode.value = true;
    selectedIds.value = new Set();
  }
  toggleSelect(photo.id);
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
});

const handleItemTap = (photo: GalleryPhoto) => {
  if (longPress.wasLongPress(photo)) return;
  if (selectionMode.value) {
    toggleSelect(photo.id);
  } else {
    selectedPhotoId.value = photo.id;
  }
};

const closeViewer = () => {
  selectedPhotoId.value = null;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MAX_DELAY_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 20;

const viewerWrapRef = ref<HTMLDivElement | null>(null);
const zoomScale = ref(1);
const panX = ref(0);
const panY = ref(0);

const activePointers = new Map<number, { x: number; y: number }>();
let pinchStartDistance = 0;
let pinchStartScale = 1;
let panOrigin = { x: 0, y: 0 };
let panStart = { x: 0, y: 0 };
let lastTap = { time: 0, x: 0, y: 0 };

const pointerDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const resetZoom = () => {
  zoomScale.value = 1;
  panX.value = 0;
  panY.value = 0;
};

watch(selectedPhotoId, resetZoom);

const clampPan = () => {
  const rect = viewerWrapRef.value?.getBoundingClientRect();
  if (!rect) return;
  const maxX = (rect.width * (zoomScale.value - 1)) / 2;
  const maxY = (rect.height * (zoomScale.value - 1)) / 2;
  panX.value = Math.min(maxX, Math.max(-maxX, panX.value));
  panY.value = Math.min(maxY, Math.max(-maxY, panY.value));
};

const onViewerPointerDown = (event: PointerEvent) => {
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (activePointers.size === 2) {
    const [a, b] = [...activePointers.values()];
    pinchStartDistance = pointerDistance(a, b);
    pinchStartScale = zoomScale.value;
    return;
  }

  if (activePointers.size === 1) {
    panStart = { x: event.clientX, y: event.clientY };
    panOrigin = { x: panX.value, y: panY.value };

    const now = Date.now();
    const isDoubleTap =
      now - lastTap.time < DOUBLE_TAP_MAX_DELAY_MS &&
      pointerDistance(lastTap, { x: event.clientX, y: event.clientY }) < DOUBLE_TAP_MAX_DISTANCE_PX;

    if (isDoubleTap) {
      if (zoomScale.value > 1) {
        resetZoom();
      } else {
        zoomScale.value = DOUBLE_TAP_ZOOM;
      }
      lastTap = { time: 0, x: 0, y: 0 };
    } else {
      lastTap = { time: now, x: event.clientX, y: event.clientY };
    }
  }
};

const onViewerPointerMove = (event: PointerEvent) => {
  if (!activePointers.has(event.pointerId)) return;
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (activePointers.size === 2) {
    const [a, b] = [...activePointers.values()];
    if (pinchStartDistance > 0) {
      const nextScale = pinchStartScale * (pointerDistance(a, b) / pinchStartDistance);
      zoomScale.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale));
      clampPan();
    }
    return;
  }

  if (activePointers.size === 1 && zoomScale.value > 1) {
    const point = [...activePointers.values()][0];
    panX.value = panOrigin.x + (point.x - panStart.x);
    panY.value = panOrigin.y + (point.y - panStart.y);
    clampPan();
  }
};

const onViewerPointerUp = (event: PointerEvent) => {
  activePointers.delete(event.pointerId);

  if (zoomScale.value <= 1) {
    resetZoom();
    return;
  }

  const remaining = [...activePointers.entries()];
  if (remaining.length === 1) {
    const [, point] = remaining[0];
    panStart = point;
    panOrigin = { x: panX.value, y: panY.value };
  }
};

const detailsPhoto = ref<{ photo: GalleryPhoto; width: number; height: number } | null>(null);

const viewDetails = async (photo: GalleryPhoto) => {
  const { width, height } = await getImageDimensions(photo.url);
  detailsPhoto.value = { photo, width, height };
};

const closeDetails = () => {
  detailsPhoto.value = null;
};

const promptRename = async (photo: GalleryPhoto) => {
  const alert = await alertController.create({
    header: "Rename Photo",
    inputs: [{ name: "name", type: "text", value: photo.name }],
    buttons: [
      { text: "Cancel", role: "cancel" },
      {
        text: "Save",
        handler: (data) => {
          const name = data.name?.trim();
          if (name) renamePhoto(photo.id, name);
        },
      },
    ],
  });
  await alert.present();
};

const moveOneToAlbum = async (photo: GalleryPhoto) => {
  await presentMoveSheet([photo.id]);
};

const confirmDeleteOne = async (photo: GalleryPhoto) => {
  const sheet = await actionSheetController.create({
    header: `Delete "${photo.name}"?`,
    buttons: [
      {
        text: "Delete",
        role: "destructive",
        handler: () => deletePhotos([photo.id]),
      },
      { text: "Cancel", role: "cancel" },
    ],
  });
  await sheet.present();
};

const openItemMenu = async (photo: GalleryPhoto) => {
  const sheet = await actionSheetController.create({
    header: photo.name,
    buttons: [
      { text: "View Details", handler: () => viewDetails(photo) },
      { text: "Rename", handler: () => promptRename(photo) },
      { text: "Move to Album", handler: () => moveOneToAlbum(photo) },
      {
        text: "Delete",
        role: "destructive",
        handler: () => {
          confirmDeleteOne(photo);
          closeViewer();
        },
      },
      { text: "Cancel", role: "cancel" },
    ],
  });
  await sheet.present();
};

const presentMoveSheet = async (ids: string[]) => {
  const destinations = allAlbums.value.filter((a) => a.id !== props.currentAlbumId);
  const sheet = await actionSheetController.create({
    header: "Move to Album",
    buttons: [
      ...destinations.map((album) => ({
        text: album.name,
        handler: () => moveToAlbum(ids, album.id === DEFAULT_ALBUM_ID ? undefined : album.id),
      })),
      { text: "Cancel", role: "cancel" as const },
    ],
  });
  await sheet.present();
};

const handleBulkDelete = async () => {
  const ids = Array.from(selectedIds.value);
  const sheet = await actionSheetController.create({
    header: `Delete ${ids.length} photo(s)?`,
    buttons: [
      {
        text: "Delete",
        role: "destructive",
        handler: () => {
          deletePhotos(ids);
          toggleSelectionMode();
        },
      },
      { text: "Cancel", role: "cancel" },
    ],
  });
  await sheet.present();
};

const handleBulkMove = async () => {
  const ids = Array.from(selectedIds.value);
  await presentMoveSheet(ids);
  toggleSelectionMode();
};
</script>

<style scoped>
.gallery-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.gallery-segment {
  max-width: 160px;
}

.selection-bar {
  --background: var(--ion-color-light);
  margin-bottom: 8px;
  border-radius: 8px;
}

.photo-row {
  --border-radius: var(--app-radius-md);
  margin: 6px 12px;
  border-radius: var(--app-radius-md);
  overflow: hidden;
}

.grid-item {
  user-select: none;
  -webkit-user-select: none;
}

.grid-item-thumb {
  position: relative;
  border-radius: var(--app-radius-md);
  box-shadow: var(--app-shadow-card);
  background: var(--ion-item-background);
}

.grid-item-img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: inherit;
}

.grid-menu-button {
  position: absolute;
  top: 6px;
  right: 6px;
  margin: 0;
  --padding-start: 4px;
  --padding-end: 4px;
  --background: rgba(0, 0, 0, 0.45);
  --background-hover: rgba(0, 0, 0, 0.6);
  --border-radius: 50%;
  --border-width: 1px;
  --border-style: solid;
  --border-color: rgba(255, 255, 255, 0.25);
  --color: #fff;
  width: 28px;
  height: 28px;
}

.row-menu-button {
  --background: color-mix(in srgb, currentColor 7%, transparent);
  --background-hover: color-mix(in srgb, currentColor 14%, transparent);
  --border-radius: 8px;
  --border-width: 1px;
  --border-style: solid;
  --border-color: color-mix(in srgb, currentColor 18%, transparent);
  --color: var(--ion-color-medium);
  --padding-start: 6px;
  --padding-end: 6px;
  width: 32px;
  height: 32px;
  margin: 0;
}

.select-overlay {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 24px;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.6));
}

.grid-item-name {
  font-size: 12px;
  margin-top: 6px;
  padding: 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: var(--ion-color-medium);
  text-align: center;
}

.empty-state ion-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.viewer-title {
  font-size: 15px;
}

.viewer-content {
  --background: black;
}

.viewer-image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  touch-action: none;
  overflow: hidden;
}

.viewer-image {
  max-width: 100%;
  max-height: 100vh;
  object-fit: contain;
  will-change: transform;
}

.viewer-image-zoomed {
  cursor: grab;
}
</style>
