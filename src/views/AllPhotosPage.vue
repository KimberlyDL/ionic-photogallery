<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>
          All Photos
          <span class="header-count">{{ galleryPhotos.length }}</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <CameraComponent />

      <PhotoGalleryComponent :photos="galleryPhotos" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonRefresher,
  IonRefresherContent,
} from "@ionic/vue";
import type { RefresherCustomEvent } from "@ionic/vue";
import CameraComponent from "@/components/CameraComponent.vue";
import PhotoGalleryComponent from "@/components/PhotoGalleryComponent.vue";
import { usePhotoGallery } from "@/composables/usePhotoGallery";
import type { GalleryPhoto } from "@/types/gallery";

const { photos } = usePhotoGallery();

const galleryPhotos = computed<GalleryPhoto[]>(() =>
  photos.value
    .filter((p) => !!p.webviewPath)
    .map((p) => ({ id: p.id, url: p.webviewPath!, name: p.name, size: p.size, createdAt: p.createdAt, albumId: p.albumId }))
);

const handleRefresh = (event: RefresherCustomEvent) => {
  // Data is realtime via Firebase listeners; nothing to fetch, just acknowledge the gesture.
  event.target.complete();
};
</script>

<style scoped>
.header-count {
  font-size: 12px;
  font-weight: 600;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent);
  color: var(--ion-color-primary);
}
</style>
