import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface AuthState {
  session: Session | null;
  loading: boolean;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, loading: false });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, loading: false });
    });
  },
}));
