import { FormEvent, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import PageLayout from "@/components/PageLayout";
import { listRegisteredUsers, UserRegistryRecord } from "@/lib/biometricStore";

const ADMIN_PASSWORD = "warpdrive@123";

const AdminPage = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [records, setRecords] = useState<UserRegistryRecord[]>([]);

  useEffect(() => {
    if (!unlocked) return;
    const load = async () => {
      const users = await listRegisteredUsers();
      setRecords(users);
    };
    load();
  }, [unlocked]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    setChecking(true);
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        setUnlocked(true);
        toast.success("Admin access granted.");
      } else {
        toast.error("Invalid admin password.");
      }
      setChecking(false);
    }, 600);
  };

  if (!unlocked) {
    return (
      <PageLayout
        title="Admin Access"
        subtitle="Enter the admin passphrase to audit biometric enrollment."
      >
        <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white">
            WarpDrive Admin Panel
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Password is shared out-of-band for demo purposes.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Admin password
              </label>
              <input
                type="password"
                name="password"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={checking}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {checking ? "Checking..." : "Unlock"}
            </button>
          </form>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Admin Dashboard"
      subtitle="Overview of registered accounts and biometric enrollment."
    >
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold text-white">Registered users</h2>
          <p className="text-sm text-white/60">
            {records.length} account{records.length === 1 ? "" : "s"} tracked
            locally
          </p>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Biometrics</th>
                <th className="px-4 py-3">Last update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-950/50">
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-white/50"
                  >
                    No users tracked yet. Ask users to sign in at least once.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.uid}>
                    <td className="px-4 py-3 font-medium text-white">
                      {record.displayName ?? "—"}
                    </td>
                    <td className="px-4 py-3">{record.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                          record.biometricEnrolled
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {record.biometricEnrolled ? "Enrolled" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(record.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminPage;

