<template>
  <div class="gallery-toolbar">
    <ion-searchbar
      v-model="search"
      placeholder="Search captions"
      class="gallery-search"
    />
    <div class="toolbar-row">
      <ion-segment v-model="viewMode" class="gallery-segment">
        <ion-segment-button value="grid">
          <ion-icon :icon="gridOutline" />
        </ion-segment-button>
        <ion-segment-button value="list">
          <ion-icon :icon="listOutline" />
        </ion-segment-button>
      </ion-segment>
      <ion-button fill="outline" size="small" @click="toggleSelectionMode">
        {{ selectionMode ? "Cancel" : "Select" }}
      </ion-button>
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
        <div class="grid-item" @click="handleItemTap(photo)">
          <ion-img :src="photo.url" />
          <div v-if="selectionMode" class="select-overlay">
            <ion-icon
              :icon="selectedIds.has(photo.id) ? checkmarkCircle : ellipseOutline"
              :color="selectedIds.has(photo.id) ? 'primary' : 'light'"
            />
          </div>
        </div>
      </ion-col>
    </ion-row>
  </ion-grid>

  <ion-list v-else-if="viewMode === 'list' && pagedPhotos.length">
    <ion-item v-for="photo in pagedPhotos" :key="photo.id" button @click="handleItemTap(photo)">
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
        <h2>{{ photo.caption || "Untitled" }}</h2>
      </ion-label>
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

  <ion-modal :is-open="!!selectedPhoto" @didDismiss="closeDetail">
    <ion-header>
      <ion-toolbar>
        <ion-title>Photo</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="closeDetail">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding" v-if="selectedPhoto">
      <ion-img :src="selectedPhoto.url" />

      <ion-item>
        <ion-input label="Caption" label-placement="floating" v-model="captionDraft" />
      </ion-item>
      <ion-button expand="block" @click="saveCaption">Save Caption</ion-button>

      <ion-button expand="block" color="secondary" @click="handleMoveOne">
        Move to Album
      </ion-button>

      <ion-button expand="block" color="danger" @click="handleDeleteOne">
        Delete
      </ion-button>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
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
  IonInput,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from "@ionic/vue";
import type { InfiniteScrollCustomEvent } from "@ionic/vue";
import {
  imagesOutline,
  gridOutline,
  listOutline,
  checkmarkCircle,
  ellipseOutline,
} from "ionicons/icons";
import type { GalleryPhoto } from "@/types/gallery";

const props = defineProps<{
  photos: GalleryPhoto[];
}>();

const emit = defineEmits<{
  (e: "delete", ids: string[]): void;
  (e: "edit-caption", id: string, caption: string): void;
  (e: "move-to-album", ids: string[]): void;
}>();

const PAGE_SIZE = 12;

const viewMode = ref<"grid" | "list">("grid");
const search = ref("");
const visibleCount = ref(PAGE_SIZE);
const selectedPhoto = ref<GalleryPhoto | null>(null);
const captionDraft = ref("");

const selectionMode = ref(false);
const selectedIds = ref<Set<string>>(new Set());

const filteredPhotos = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return props.photos;
  return props.photos.filter((p) => (p.caption ?? "").toLowerCase().includes(term));
});

const pagedPhotos = computed(() => filteredPhotos.value.slice(0, visibleCount.value));
const canLoadMore = computed(() => filteredPhotos.value.length > visibleCount.value);

watch(search, () => {
  visibleCount.value = PAGE_SIZE;
});

const handleInfinite = (ev: InfiniteScrollCustomEvent) => {
  visibleCount.value += PAGE_SIZE;
  ev.target.complete();
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

const handleItemTap = (photo: GalleryPhoto) => {
  if (selectionMode.value) {
    toggleSelect(photo.id);
  } else {
    openDetail(photo);
  }
};

const openDetail = (photo: GalleryPhoto) => {
  selectedPhoto.value = photo;
  captionDraft.value = photo.caption ?? "";
};

const closeDetail = () => {
  selectedPhoto.value = null;
};

const saveCaption = () => {
  if (!selectedPhoto.value) return;
  emit("edit-caption", selectedPhoto.value.id, captionDraft.value.trim());
  closeDetail();
};

const handleDeleteOne = () => {
  if (!selectedPhoto.value) return;
  emit("delete", [selectedPhoto.value.id]);
  closeDetail();
};

const handleMoveOne = () => {
  if (!selectedPhoto.value) return;
  emit("move-to-album", [selectedPhoto.value.id]);
  closeDetail();
};

const handleBulkDelete = () => {
  emit("delete", Array.from(selectedIds.value));
  toggleSelectionMode();
};

const handleBulkMove = () => {
  emit("move-to-album", Array.from(selectedIds.value));
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
}

.gallery-segment {
  max-width: 160px;
}

.selection-bar {
  --background: var(--ion-color-light);
  margin-bottom: 8px;
  border-radius: 8px;
}

.grid-item {
  position: relative;
}

.select-overlay {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 24px;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.6));
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
</style>
