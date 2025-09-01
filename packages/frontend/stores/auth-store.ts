import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session } from "../modules/auth";

type AuthState = {
  session: Session;
  setSession: (s: Session) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (s) => set({ session: s }),
      signOut: () => set({ session: null }),
    }),
    { name: "streamfi-auth" }
  )
);
