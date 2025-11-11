import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { toast } from "react-hot-toast";
import { auth, googleProvider, popupResolver } from "@/lib/firebase";
import { updateUserRegistry } from "@/lib/biometricStore";
import useAuthStore from "@/store/useAuthStore";
import useDeviceType from "@/hooks/useDeviceType";

const LoginPage = () => {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const { deviceType, isStandalone } = useDeviceType();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "register") {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await updateUserRegistry({
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: credential.user.displayName,
        });
        toast.success("Account created. You are now signed in.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Welcome back.");
      }
      router.replace("/dashboard");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Authentication failed.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setSubmitting(true);
    try {
      const credential = await signInWithPopup(
        auth,
        googleProvider,
        popupResolver
      );
      await updateUserRegistry({
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName,
        photoURL: credential.user.photoURL,
      });
      toast.success("Signed in with Google.");
      router.replace("/dashboard");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Google sign-in failed.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col items-center justify-between px-4 py-12 lg:flex-row">
        <div className="max-w-xl space-y-6 text-center lg:text-left">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            Biometric ready · {deviceType}
            {isStandalone ? " · PWA" : ""}
          </span>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">
            Seamless biometric sign-in with WarpDrive.
          </h1>
          <p className="text-lg text-white/70">
            Login with Firebase, enroll your face once, and unlock frictionless
            access across desktop, mobile, and installable PWAs.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
            <span>• Offline-friendly face embeddings</span>
            <span>• Google & Email sign-in</span>
            <span>• Admin visibility into enrollment</span>
          </div>
        </div>

        <div className="mt-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium text-white/70">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-4 py-2 ${
                mode === "login"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-full px-4 py-2 ${
                mode === "register"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Email
              </label>
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                placeholder="you@warpdrive.io"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Password
              </label>
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {submitting
                ? mode === "register"
                  ? "Creating..."
                  : "Signing in..."
                : mode === "register"
                ? "Create account"
                : "Sign in"}
            </button>
          </form>

          <div className="mt-6">
            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleAuth}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
            >
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-800/80 p-4 text-sm text-white/70">
            <p className="font-medium text-white">
              Face sign-in already enrolled?
            </p>
            <button
              type="button"
              onClick={() => router.push("/biometric-login")}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/30"
            >
              Launch biometric login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

