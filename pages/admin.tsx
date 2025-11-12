import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import PageLayout from "@/components/PageLayout";
import {
  deleteUserRecord,
  listRegisteredUsers,
  updateUserRegistry,
  UserRegistryRecord,
} from "@/lib/biometricStore";

const ADMIN_PASSWORD = "warpdrive@123";

const AdminPage = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [records, setRecords] = useState<UserRegistryRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    displayName: "",
    email: "",
    biometricEnrolled: false,
  });

  const selectedRecord = useMemo(
    () => records.find((record) => record.uid === selectedUid) ?? null,
    [records, selectedUid]
  );

  const loadRecords = async () => {
    setRefreshing(true);
    try {
      const users = await listRegisteredUsers();
      setRecords(users);
      if (!selectedUid && users.length > 0) {
        setSelectedUid(users[0].uid);
      }
    } catch {
      toast.error("Failed to load registry. Check your connection.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!unlocked) return;
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  useEffect(() => {
    if (!selectedRecord) {
      setFormState({
        displayName: "",
        email: "",
        biometricEnrolled: false,
      });
      return;
    }

    setFormState({
      displayName: selectedRecord.displayName ?? "",
      email: selectedRecord.email ?? "",
      biometricEnrolled: Boolean(selectedRecord.biometricEnrolled),
    });
  }, [selectedRecord]);

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

  const handleDelete = async (uid: string) => {
    if (!window.confirm("Delete this user record permanently?")) {
      return;
    }

    try {
      await deleteUserRecord(uid);
      toast.success("User deleted.");
      if (selectedUid === uid) {
        setSelectedUid(null);
      }
      await loadRecords();
    } catch {
      toast.error("Failed to delete user.");
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRecord) return;

    setSaving(true);
    try {
      await updateUserRegistry({
        uid: selectedRecord.uid,
        displayName: formState.displayName || null,
        email: formState.email || null,
        biometricEnrolled: formState.biometricEnrolled,
      });
      toast.success("User updated.");
      await loadRecords();
    } catch {
      toast.error("Failed to update user.");
    } finally {
      setSaving(false);
    }
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold text-white">Registered users</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
            <span>
              {records.length} account{records.length === 1 ? "" : "s"} synced
              via Firestore
            </span>
            <button
              type="button"
              onClick={loadRecords}
              disabled={refreshing}
              className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/40 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Biometrics</th>
                <th className="px-4 py-3">Last update</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-950/50">
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-white/50"
                  >
                    No users tracked yet. Ask users to sign in at least once.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr
                    key={record.uid}
                    className={
                      selectedUid === record.uid ? "bg-emerald-500/5" : ""
                    }
                  >
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedUid(record.uid)}
                          className="rounded-full border border-emerald-400/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/10"
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(record.uid)}
                          className="rounded-full border border-red-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h3 className="text-lg font-semibold text-white">
              Manage selected user
            </h3>
            <span className="text-xs uppercase tracking-wide text-white/40">
              {selectedRecord
                ? `UID: ${selectedRecord.uid}`
                : "Select a user to edit"}
            </span>
          </div>
          <form
            onSubmit={handleUpdate}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            <label className="space-y-2 text-sm text-white/70">
              <span className="block text-xs font-semibold uppercase tracking-wide text-white/40">
                Display name
              </span>
              <input
                type="text"
                value={formState.displayName}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    displayName: event.target.value,
                  }))
                }
                disabled={!selectedRecord}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-40"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              <span className="block text-xs font-semibold uppercase tracking-wide text-white/40">
                Email
              </span>
              <input
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    email: event.target.value,
                  }))
                }
                disabled={!selectedRecord}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-40"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/70 md:col-span-2">
              <input
                type="checkbox"
                checked={formState.biometricEnrolled}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    biometricEnrolled: event.target.checked,
                  }))
                }
                disabled={!selectedRecord}
                className="h-4 w-4 rounded border-white/30 bg-white/10 text-emerald-500 focus:ring-emerald-400"
              />
              <span className="font-semibold uppercase tracking-wide text-white/60">
                Biometrics enrolled
              </span>
            </label>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedUid(null)}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/60 transition hover:bg-white/10"
              >
                Clear selection
              </button>
              <button
                type="submit"
                disabled={!selectedRecord || saving}
                className="rounded-full bg-emerald-500 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminPage;

