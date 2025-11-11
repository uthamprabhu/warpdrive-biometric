import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import PageLayout from "@/components/PageLayout";
import CameraPreview from "@/components/CameraPreview";
import {
  getEmbedding,
  listRegisteredUsers,
  setOfflineSession,
  UserRegistryRecord,
} from "@/lib/biometricStore";
import {
  compareDescriptors,
  getDescriptorFromVideo,
  loadFaceModels,
} from "@/lib/faceRecognition";
import useAuthStore from "@/store/useAuthStore";

const BiometricLoginPage = () => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setBiometrics = useAuthStore((state) => state.setBiometrics);

  const [profiles, setProfiles] = useState<UserRegistryRecord[]>([]);
  const [selectedUid, setSelectedUid] = useState<string>("");
  const [status, setStatus] = useState("Loading camera...");
  const [isProcessing, setIsProcessing] = useState(false);
  const [ready, setReady] = useState(false);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.uid === selectedUid) ?? null,
    [profiles, selectedUid]
  );

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const [records] = await Promise.all([
          listRegisteredUsers(),
          loadFaceModels(),
        ]);
        if (!mounted) return;

        setProfiles(records);
        if (records.length > 0) {
          setSelectedUid(records[0].uid);
        }

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
          setReady(true);
          setStatus("Center your face and tap Authenticate.");
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unable to start camera.";
        toast.error(message);
        setStatus("Camera unavailable. Check permissions.");
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleAuthenticate = async () => {
    if (!videoRef.current || !selectedProfile) {
      toast.error("Select an account to authenticate.");
      return;
    }

    setIsProcessing(true);
    setStatus("Capturing face...");

    try {
      const stored = await getEmbedding(selectedProfile.uid);
      if (!stored) {
        toast.error("No stored embedding for this account.");
        setStatus("No embedding found. Ask user to enroll first.");
        return;
      }

      const liveDescriptor = await getDescriptorFromVideo(videoRef.current);
      if (!liveDescriptor) {
        toast.error("No face detected. Try again.");
        setStatus("No face detected. Adjust camera and retry.");
        return;
      }

      const match = compareDescriptors(
        new Float32Array(stored.descriptor),
        liveDescriptor
      );

      if (!match.match) {
        toast.error("Face mismatch.");
        setStatus(`Face mismatch · distance ${match.distance.toFixed(3)}`);
        return;
      }

      await setOfflineSession({
        uid: selectedProfile.uid,
        email: selectedProfile.email,
        displayName: selectedProfile.displayName,
      });
      setUser({
        uid: selectedProfile.uid,
        email: selectedProfile.email,
        displayName: selectedProfile.displayName,
        biometricEnrolled: true,
      });
      setBiometrics(true);
      setLoading(false);
      toast.success("Face matched. Welcome back!");
      setStatus("Match confirmed. Redirecting...");
      setTimeout(() => router.replace("/dashboard"), 800);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Authentication failed.";
      toast.error(message);
      setStatus("Authentication failed. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageLayout
      title="Biometric Login"
      subtitle="Authenticate via live camera match against stored embeddings."
    >
      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-3xl font-semibold text-white">
            Choose an account to unlock
          </h2>
          <p className="text-white/70">
            We compare the live face descriptor captured with your camera
            against the stored embedding to unlock your session. No passwords
            required.
          </p>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Available accounts
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
              value={selectedUid}
              onChange={(event) => setSelectedUid(event.target.value)}
            >
              {profiles.length === 0 ? (
                <option value="">No enrolled users</option>
              ) : null}
              {profiles.map((profile) => (
                <option key={profile.uid} value={profile.uid}>
                  {profile.displayName ?? profile.email ?? profile.uid}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAuthenticate}
            disabled={!ready || !selectedUid || isProcessing}
            className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {isProcessing ? "Verifying..." : "Authenticate"}
          </button>
          <div className="rounded-2xl bg-slate-900/60 p-4 text-sm text-white/70">
            <p className="font-semibold text-white">Need a fallback?</p>
            <p className="mt-2">
              Use Firebase credentials instead.{" "}
              <button
                type="button"
                onClick={() => router.push("/")}
                className="font-semibold text-emerald-300 underline underline-offset-4"
              >
                Go to login
              </button>
            </p>
          </div>
          <p className="text-xs uppercase tracking-wide text-white/40">
            {status}
          </p>
        </div>
        <CameraPreview
          videoRef={videoRef}
          status={ready ? "Live" : "Loading"}
          overlayText={isProcessing ? "Verifying..." : undefined}
        />
      </div>
    </PageLayout>
  );
};

export default BiometricLoginPage;

