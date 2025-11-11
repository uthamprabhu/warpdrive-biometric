import type { AppProps } from "next/app";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Toaster } from "react-hot-toast";
import { auth } from "@/lib/firebase";
import {
  clearOfflineSession,
  getEmbedding,
  getOfflineSession,
  updateUserRegistry,
} from "@/lib/biometricStore";
import useAuthStore from "@/store/useAuthStore";
import "@/styles/globals.css";

const App = ({ Component, pageProps }: AppProps) => {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setBiometrics = useAuthStore((state) => state.setBiometrics);

  useEffect(() => {
    let mounted = true;

    const syncUser = async () => {
      const offline = await getOfflineSession();
      if (offline && mounted) {
        const embedding = offline.uid
          ? await getEmbedding(offline.uid)
          : null;
        setUser({
          uid: offline.uid,
          email: offline.email,
          displayName: offline.displayName,
          biometricEnrolled: Boolean(embedding),
        });
        setBiometrics(Boolean(embedding));
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      if (firebaseUser) {
        const embedding = await getEmbedding(firebaseUser.uid);
        const userPayload = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          biometricEnrolled: Boolean(embedding),
        };

        setUser(userPayload);
        setBiometrics(Boolean(embedding));
        await updateUserRegistry({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          biometricEnrolled: Boolean(embedding),
        });
        await clearOfflineSession();
      } else {
        await syncUser();
      }

      if (mounted) {
        setLoading(false);
      }
    });

    syncUser();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setUser, setLoading, setBiometrics]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/service-worker.js");
      } catch {
        // no-op
      }
    };

    if (process.env.NODE_ENV === "production") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-center" />
    </>
  );
};

export default App;

