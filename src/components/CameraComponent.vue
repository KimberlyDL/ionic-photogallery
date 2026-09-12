<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Camera</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ion-button expand="block" @click="takePicture">
        <ion-icon slot="start" :icon="cameraIcon" /> Take Picture
      </ion-button>
      <ion-text v-if="errorMessage" color="danger">
        <p>{{ errorMessage }}</p>
      </ion-text>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonText,
} from "@ionic/vue";
import { camera as cameraIcon } from "ionicons/icons";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

const emit = defineEmits<{
  (e: "photo-captured", photo: string): void;
}>();

const errorMessage = ref("");

const takePicture = async () => {
  errorMessage.value = "";

  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 90,
    });

    if (photo.webPath) {
      emit("photo-captured", photo.webPath);
    }
  } catch (error) {
    errorMessage.value = "Could not take photo. Please try again.";
  }
};
</script>