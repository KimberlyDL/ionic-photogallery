<template>
  <ion-tabs>
    <ion-router-outlet />
    <ion-tab-bar slot="bottom">
      <ion-tab-button tab="photos" href="/tabs/photos">
        <ion-icon :icon="imagesOutline" />
        <ion-label>Photos</ion-label>
      </ion-tab-button>
      <ion-tab-button tab="albums" href="/tabs/albums">
        <ion-icon :icon="albumsOutline" />
        <ion-label>Albums</ion-label>
      </ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>
</template>

<script setup lang="ts">
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
} from "@ionic/vue";
import { imagesOutline, albumsOutline } from "ionicons/icons";
</script>
