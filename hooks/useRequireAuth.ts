import { useRouter } from "next/router";
import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import useAuthStore from "@/store/useAuthStore";

const useRequireAuth = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setLoading(false);
      router.replace("/");
    } catch {
      // no-op for now
    }
  };

  return { user, loading, logout: handleLogout };
};

export default useRequireAuth;

