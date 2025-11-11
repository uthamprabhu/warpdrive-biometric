import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import useRequireAuth from "@/hooks/useRequireAuth";
import { loadFaceModels, getDescriptorFromVideo } from "@/lib/faceRecognition";
import {
  saveEmbedding,
  getEmbedding,
  updateUserRegistry,
} from "@/lib/biometricStore";
import useAuthStore from "@/store/useAuthStore";
import PageLayout from "@/components/PageLayout";
import CameraPreview from "@/components/CameraPreview";

const BiometricSetupPage = () => {
  const router = useRouter();
  const { user, loading } = useRequireAuth();
  const setBiometrics = useAuthStore((state) => state.setBiometrics);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Preparing camera...");

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const initialize = async () => {
      try {
        const existing = await getEmbedding(user.uid);
        if (existing && mounted) {
          setStatus("You have an enrolled face. Capture again to refresh.");
        }

        await loadFaceModels();
        if (!mounted) return;

        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        if (mounted) {
          setStatus("Camera ready. Center your face and capture.");
          setReady(true);
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unable to access camera.";
        toast.error(message);
        setStatus("Camera access failed. Please allow permissions.");
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="animate-pulse text-sm uppercase tracking-[0.3em] text-white/60">
          Setting up camera...
        </p>
      </div>
    );
  }

  const handleCapture = async () => {
    if (!videoRef.current) return;

    setIsProcessing(true);
    setStatus("Capturing face...");

    try {
      const descriptor = await getDescriptorFromVideo(videoRef.current);
      if (!descriptor) {
        toast.error("No face detected. Try again with better lighting.");
        setStatus("No face detected. Adjust framing and retry.");
        return;
      }

      await saveEmbedding({
        uid: user.uid,
        descriptor: Array.from(descriptor),
        updatedAt: Date.now(),
      });

      await updateUserRegistry({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        biometricEnrolled: true,
      });

      setBiometrics(true);
      toast.success("Face enrolled successfully.");
      setStatus("Face enrolled. Redirecting...");
      setTimeout(() => router.replace("/dashboard"), 1200);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to capture face.";
      toast.error(message);
      setStatus("Capture failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageLayout
      title="Biometric Enrollment"
      subtitle="Capture and store an encrypted face embedding using face-api.js."
    >
      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-3xl font-semibold text-white">
            Enroll your biometric signature
          </h2>
          <p className="text-white/70">
            We capture a single facial descriptor using{" "}
            <span className="font-medium text-emerald-300">face-api.js</span> and
            store it locally via IndexedDB. Your raw image never leaves the
            device in this demo.
          </p>
          <ul className="space-y-3 text-sm text-white/70">
            <li>• Use a well-lit environment and look straight at the camera.</li>
            <li>• Keep your face centered inside the preview window.</li>
            <li>• The embedding powers offline-friendly face login.</li>
          </ul>
          <button
            type="button"
            onClick={handleCapture}
            disabled={!ready || isProcessing}
            className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {isProcessing ? "Capturing..." : "Capture face"}
          </button>
          <p className="text-xs uppercase tracking-wide text-white/40">
            {status}
          </p>
        </div>
        <CameraPreview
          videoRef={videoRef}
          status={ready ? "Live" : "Loading"}
          overlayText={isProcessing ? "Processing..." : undefined}
        />
      </div>
    </PageLayout>
  );
};

export default BiometricSetupPage;

