import { ref } from "vue";
import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { auth } from "@/firebase";

const currentUser = ref<User | null>(null);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch(() => {
      // best-effort; the gallery will simply stay empty until this succeeds
    });
    return;
  }
  currentUser.value = user;
});

export function useAuth() {
  return { currentUser };
}
