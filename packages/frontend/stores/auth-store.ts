import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session } from "../modules/auth";

type AuthState = {
  connectWallet: any;
  walletAddress: any;
  session: Session | null;
  setSession: (s: Session) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      connectWallet: async () => {},
      walletAddress: null,
      session: null,
      setSession: (s) => set({ session: s }),
      signOut: () => set({ session: null, walletAddress: null }),
    }),
    { name: "streamfi-auth" }
  )
);
