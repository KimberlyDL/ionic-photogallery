<template>
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button @click="handleTakePicture">
      <ion-icon :icon="cameraIcon" />
    </ion-fab-button>
  </ion-fab>

  <ion-toast
    :is-open="!!errorMessage"
    :message="errorMessage"
    duration="2500"
    color="danger"
    @didDismiss="errorMessage = ''"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { IonFab, IonFabButton, IonIcon, IonToast } from "@ionic/vue";
import { camera as cameraIcon } from "ionicons/icons";
import { usePhotoGallery } from "@/composables/usePhotoGallery";

const { takePhoto } = usePhotoGallery();
const errorMessage = ref("");

const handleTakePicture = async () => {
  errorMessage.value = "";
  try {
    await takePhoto();
  } catch (error) {
    errorMessage.value = "Could not take photo. Please try again.";
  }
};
</script>
