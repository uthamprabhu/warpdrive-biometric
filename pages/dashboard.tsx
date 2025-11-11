import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import useRequireAuth from "@/hooks/useRequireAuth";
import PageLayout from "@/components/PageLayout";
import useAuthStore from "@/store/useAuthStore";
import useDeviceType from "@/hooks/useDeviceType";

const DashboardPage = () => {
  const router = useRouter();
  const { logout, loading } = useRequireAuth();
  const user = useAuthStore((state) => state.user);
  const { deviceType, isStandalone } = useDeviceType();

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="animate-pulse text-sm uppercase tracking-[0.3em] text-white/60">
          Loading dashboard...
        </p>
      </div>
    );
  }

  const handleSignOut = async () => {
    await logout();
    toast.success("Signed out.");
    router.replace("/");
  };

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Monitor biometric enrollment and jump back into WarpDrive."
      footer={<span>{deviceType} · {isStandalone ? "PWA mode" : "Browser mode"}</span>}
    >
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
            Welcome back
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {user.displayName ?? user.email}
          </h2>
          <p className="mt-4 text-sm text-white/70">
            You are authenticated with Firebase. Use the quick links to manage
            biometrics or launch camera-first sign-in.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/biometric-setup"
              className="rounded-full bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              {user.biometricEnrolled ? "Re-enroll face" : "Set up biometrics"}
            </Link>
            <Link
              href="/biometric-login"
              className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
            >
              Launch face login
            </Link>
            <Link
              href="/admin"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white/70 transition hover:bg-white/10"
            >
              Open admin panel
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white">Biometric status</h3>
          <p className="mt-2 text-sm text-white/70">
            Face embeddings are stored locally on this device using secure
            IndexedDB via localforage. They never leave the device in this demo.
          </p>
          <div className="mt-6 rounded-2xl bg-slate-800/70 p-5">
            <p className="text-sm font-medium text-white/80 uppercase tracking-wide">
              Enrollment
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {user.biometricEnrolled ? "Active" : "Pending"}
            </p>
            <p className="mt-2 text-sm text-white/60">
              {user.biometricEnrolled
                ? "You can sign in with face unlock offline."
                : "Complete enrollment to enable offline ready face login."}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-800/60 p-5">
            <div>
              <p className="text-sm font-semibold text-white/80 uppercase tracking-wide">
                Session mode
              </p>
              <p className="mt-1 text-sm text-white/70">
                {isStandalone ? "Installed PWA" : "Browser"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/20"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
            1. Authenticate
          </h4>
          <p className="mt-2 text-sm text-white/70">
            Use Firebase Auth for the first sign-in. Your session persists
            across devices and works offline.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
            2. Enroll face
          </h4>
          <p className="mt-2 text-sm text-white/70">
            Capture a single face descriptor with face-api.js and store it
            locally or in Firebase if desired.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
            3. Instant login
          </h4>
          <p className="mt-2 text-sm text-white/70">
            Launch biometric login to compare live camera descriptors with the
            stored embedding. Redirect instantly on a match.
          </p>
        </div>
      </section>
    </PageLayout>
  );
};

export default DashboardPage;

