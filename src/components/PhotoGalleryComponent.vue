<template>
  <ion-grid v-if="photos.length">
    <ion-row>
      <ion-col size="6" v-for="(photo, index) in photos" :key="index">
        <ion-img :src="photo" />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script setup lang="ts">
import { IonGrid, IonRow, IonCol, IonImg } from "@ionic/vue";

defineProps<{
  photos: string[];
}>();
</script>