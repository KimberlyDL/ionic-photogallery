<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/albums" text="" />
        </ion-buttons>
        <ion-title>
          {{ albumTitle }}
          <span class="header-count">{{ albumPhotos.length }}</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <CameraComponent />

      <PhotoGalleryComponent :photos="albumPhotos" :current-album-id="albumId" />
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
  IonButtons,
  IonBackButton,
  IonRefresher,
  IonRefresherContent,
} from "@ionic/vue";
import type { RefresherCustomEvent } from "@ionic/vue";
import { useRoute } from "vue-router";
import CameraComponent from "@/components/CameraComponent.vue";
import PhotoGalleryComponent from "@/components/PhotoGalleryComponent.vue";
import { usePhotoGallery } from "@/composables/usePhotoGallery";
import { useAlbums, DEFAULT_ALBUM_ID } from "@/composables/useAlbums";
import type { GalleryPhoto } from "@/types/gallery";

const route = useRoute();
const albumId = computed(() => route.params.id as string);

const { photos } = usePhotoGallery();
const { albumName } = useAlbums();

const albumTitle = computed(() => albumName(albumId.value === DEFAULT_ALBUM_ID ? undefined : albumId.value));

const albumPhotos = computed<GalleryPhoto[]>(() =>
  photos.value
    .filter((p) => (albumId.value === DEFAULT_ALBUM_ID ? !p.albumId : p.albumId === albumId.value))
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
  font-size: 13px;
  font-weight: normal;
  opacity: 0.8;
  margin-left: 6px;
}
</style>
