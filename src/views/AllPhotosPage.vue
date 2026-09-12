<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
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

      <PhotoGalleryComponent
        :photos="galleryPhotos"
        @delete="handleDelete"
        @edit-caption="handleEditCaption"
        @move-to-album="handleMoveToAlbum"
      />
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
  actionSheetController,
} from "@ionic/vue";
import type { RefresherCustomEvent } from "@ionic/vue";
import CameraComponent from "@/components/CameraComponent.vue";
import PhotoGalleryComponent from "@/components/PhotoGalleryComponent.vue";
import { usePhotoGallery } from "@/composables/usePhotoGallery";
import { useAlbums } from "@/composables/useAlbums";
import type { GalleryPhoto } from "@/types/gallery";

const { photos, deletePhotos, updateCaption, moveToAlbum } = usePhotoGallery();
const { albums } = useAlbums();

const galleryPhotos = computed<GalleryPhoto[]>(() =>
  photos.value
    .filter((p) => !!p.webviewPath)
    .map((p) => ({ id: p.id, url: p.webviewPath!, caption: p.caption }))
);

const handleRefresh = (event: RefresherCustomEvent) => {
  // Data is realtime via Firebase listeners; nothing to fetch, just acknowledge the gesture.
  event.target.complete();
};

const handleDelete = (ids: string[]) => deletePhotos(ids);
const handleEditCaption = (id: string, caption: string) => updateCaption(id, caption);

const handleMoveToAlbum = async (ids: string[]) => {
  const buttons = [
    ...albums.value.map((album) => ({
      text: album.name,
      handler: () => moveToAlbum(ids, album.id),
    })),
    { text: "No Album (Unfiled)", handler: () => moveToAlbum(ids, undefined) },
    { text: "Cancel", role: "cancel" as const },
  ];

  const sheet = await actionSheetController.create({
    header: "Move to Album",
    buttons,
  });
  await sheet.present();
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
