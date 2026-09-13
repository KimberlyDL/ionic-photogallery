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
      <ion-toolbar>
        <ion-segment v-model="viewMode" class="albums-segment">
          <ion-segment-button value="list">
            <ion-icon :icon="listOutline" />
          </ion-segment-button>
          <ion-segment-button value="grid">
            <ion-icon :icon="gridOutline" />
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <ion-list v-if="viewMode === 'list'">
        <ion-item-sliding v-for="album in allAlbums" :key="album.id">
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
          <ion-item-options v-if="!album.isDefault" side="end">
            <ion-item-option @click="promptRenameAlbum(album)">Rename</ion-item-option>
            <ion-item-option color="danger" @click="confirmDeleteAlbum(album)">
              Delete
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <ion-grid v-else-if="allAlbums.length">
        <ion-row>
          <ion-col size="6" v-for="album in allAlbums" :key="album.id">
            <div
              class="album-card"
              @pointerdown="!album.isDefault && longPress.start(album)"
              @pointerup="longPress.cancel()"
              @pointerleave="longPress.cancel()"
              @pointercancel="longPress.cancel()"
              @click="handleCardTap(album)"
            >
              <div class="album-thumb">
                <img v-if="albumThumbnail(album.id)" :src="albumThumbnail(album.id)" />
                <ion-icon v-else :icon="albumsOutline" class="thumb-placeholder" />
              </div>
              <div class="album-name">{{ album.name }}</div>
              <div class="album-count">{{ photoCount(album.id) }} photo(s)</div>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>

      <div v-if="!allAlbums.length" class="empty-state">
        <ion-icon :icon="albumsOutline" />
        <p>No albums yet.</p>
        <ion-button @click="promptCreateAlbum">Create your first album</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
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
  IonGrid,
  IonRow,
  IonCol,
  IonSegment,
  IonSegmentButton,
  IonRefresher,
  IonRefresherContent,
  alertController,
  actionSheetController,
} from "@ionic/vue";
import type { RefresherCustomEvent } from "@ionic/vue";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { addOutline, albumsOutline, gridOutline, listOutline } from "ionicons/icons";
import { useRouter } from "vue-router";
import { useAlbums, DEFAULT_ALBUM_ID } from "@/composables/useAlbums";
import type { Album } from "@/composables/useAlbums";
import { usePhotoGallery } from "@/composables/usePhotoGallery";
import { useLongPress } from "@/composables/useLongPress";

const { allAlbums, createAlbum, renameAlbum, deleteAlbum } = useAlbums();
const { photos, unassignAlbum } = usePhotoGallery();
const router = useRouter();

const viewMode = ref<"list" | "grid">("list");

const handleRefresh = (event: RefresherCustomEvent) => {
  // Data is realtime via Firebase listeners; nothing to fetch, just acknowledge the gesture.
  event.target.complete();
};

const photosInAlbum = (albumId: string) =>
  albumId === DEFAULT_ALBUM_ID
    ? photos.value.filter((p) => !p.albumId)
    : photos.value.filter((p) => p.albumId === albumId);

const photoCount = (albumId: string) => photosInAlbum(albumId).length;

const albumThumbnail = (albumId: string) =>
  photosInAlbum(albumId).find((p) => p.webviewPath)?.webviewPath;

const openAlbum = (id: string) => router.push(`/tabs/albums/${id}`);

const longPress = useLongPress<Album>((album) => {
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  openAlbumMenu(album);
});

const handleCardTap = (album: Album) => {
  if (longPress.wasLongPress(album)) return;
  openAlbum(album.id);
};

const openAlbumMenu = async (album: Album) => {
  const sheet = await actionSheetController.create({
    header: album.name,
    buttons: [
      { text: "Rename", handler: () => promptRenameAlbum(album) },
      { text: "Delete", role: "destructive", handler: () => confirmDeleteAlbum(album) },
      { text: "Cancel", role: "cancel" },
    ],
  });
  await sheet.present();
};

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
    subHeader: "Photos inside will move to Camera, not be deleted.",
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
.albums-segment {
  max-width: 160px;
  margin: 0 auto;
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
.empty-state ion-button {
  margin-top: 16px;
}
.thumb-placeholder {
  font-size: 24px;
  color: var(--ion-color-medium);
}
.album-card {
  user-select: none;
  -webkit-user-select: none;
}
.album-thumb {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: var(--ion-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
}
.album-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.album-thumb .thumb-placeholder {
  font-size: 40px;
}
.album-name {
  margin-top: 6px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.album-count {
  font-size: 12px;
  color: var(--ion-color-medium);
}
</style>
