<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Albums</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="promptCreateAlbum">
            <ion-icon slot="icon-only" :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <ion-list v-if="albums.length">
        <ion-item-sliding v-for="album in albums" :key="album.id">
          <ion-item button @click="openAlbum(album.id)">
            <ion-thumbnail slot="start">
              <img v-if="albumThumbnail(album.id)" :src="albumThumbnail(album.id)" />
              <ion-icon v-else :icon="albumsOutline" class="thumb-placeholder" />
            </ion-thumbnail>
            <ion-label>
              <h2>{{ album.name }}</h2>
              <p>{{ photoCount(album.id) }} photo(s)</p>
            </ion-label>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option @click="promptRenameAlbum(album)">Rename</ion-item-option>
            <ion-item-option color="danger" @click="confirmDeleteAlbum(album)">
              Delete
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div v-else class="empty-state">
        <ion-icon :icon="albumsOutline" />
        <p>No albums yet.</p>
        <ion-button @click="promptCreateAlbum">Create your first album</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonRefresher,
  IonRefresherContent,
  alertController,
  actionSheetController,
} from "@ionic/vue";
import type { RefresherCustomEvent } from "@ionic/vue";
import { addOutline, albumsOutline } from "ionicons/icons";
import { useRouter } from "vue-router";
import { useAlbums } from "@/composables/useAlbums";
import type { Album } from "@/composables/useAlbums";
import { usePhotoGallery } from "@/composables/usePhotoGallery";

const { albums, createAlbum, renameAlbum, deleteAlbum } = useAlbums();
const { photos, unassignAlbum } = usePhotoGallery();
const router = useRouter();

const handleRefresh = (event: RefresherCustomEvent) => {
  // Data is realtime via Firebase listeners; nothing to fetch, just acknowledge the gesture.
  event.target.complete();
};

const photoCount = (albumId: string) =>
  photos.value.filter((p) => p.albumId === albumId).length;

const albumThumbnail = (albumId: string) =>
  photos.value.find((p) => p.albumId === albumId && p.webviewPath)?.webviewPath;

const openAlbum = (id: string) => router.push(`/tabs/albums/${id}`);

const promptCreateAlbum = async () => {
  const alert = await alertController.create({
    header: "New Album",
    inputs: [{ name: "name", type: "text", placeholder: "Album name" }],
    buttons: [
      { text: "Cancel", role: "cancel" },
      {
        text: "Create",
        handler: (data) => {
          const name = data.name?.trim();
          if (name) createAlbum(name);
        },
      },
    ],
  });
  await alert.present();
};

const promptRenameAlbum = async (album: Album) => {
  const alert = await alertController.create({
    header: "Rename Album",
    inputs: [{ name: "name", type: "text", value: album.name }],
    buttons: [
      { text: "Cancel", role: "cancel" },
      {
        text: "Save",
        handler: (data) => {
          const name = data.name?.trim();
          if (name) renameAlbum(album.id, name);
        },
      },
    ],
  });
  await alert.present();
};

const confirmDeleteAlbum = async (album: Album) => {
  const sheet = await actionSheetController.create({
    header: `Delete "${album.name}"?`,
    subHeader: "Photos inside will become unfiled, not deleted.",
    buttons: [
      {
        text: "Delete Album",
        role: "destructive",
        handler: async () => {
          await unassignAlbum(album.id);
          await deleteAlbum(album.id);
        },
      },
      { text: "Cancel", role: "cancel" },
    ],
  });
  await sheet.present();
};
</script>

<style scoped>
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
.empty-state ion-button {
  margin-top: 16px;
}
.thumb-placeholder {
  font-size: 24px;
  color: var(--ion-color-medium);
}
</style>
