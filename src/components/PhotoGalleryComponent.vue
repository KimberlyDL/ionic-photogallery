<template>
  <ion-grid v-if="photos.length">
    <ion-row>
      <ion-col size="6" v-for="(photo, index) in photos" :key="index">
        <ion-img :src="photo" />
      </ion-col>
    </ion-row>
  </ion-grid>
  <div v-else class="empty-state">
    <ion-icon :icon="imagesOutline" />
    <p>No photos yet. Tap "Take Picture" to add one.</p>
  </div>
</template>

<script setup lang="ts">
import { IonGrid, IonRow, IonCol, IonImg, IonIcon } from "@ionic/vue";
import { imagesOutline } from "ionicons/icons";

defineProps<{
  photos: string[];
}>();
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
</style>