import { create } from "zustand";

export type AuthUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  biometricEnrolled?: boolean;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setBiometrics: (enabled: boolean) => void;
};

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setBiometrics: (enabled) =>
    set((state) =>
      state.user
        ? { user: { ...state.user, biometricEnrolled: enabled } }
        : state
    ),
}));

export default useAuthStore;

