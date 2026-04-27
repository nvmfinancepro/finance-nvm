import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Client, User, ResetRequest } from "@/types";

interface AppState {
  // Auth
  user: User | null;
  setUser: (u: User | null) => void;

  // Clients
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (client: Client) => void;
  updateClient: (id: number, patch: Partial<Client>) => void;
  deleteClient: (id: number) => void;

  // Navigation
  view: string;
  setView: (v: string) => void;

  // Mois sélectionné (format "YYYY-MM")
  moisCourant: string;
  setMoisCourant: (m: string) => void;

  // Demandes reset MP
  resetRequests: ResetRequest[];
  addResetRequest: (req: ResetRequest) => void;
  resolveResetRequest: (email: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),

      clients: [],
      setClients: (clients) => set({ clients }),
      addClient: (client) => set((s) => ({ clients: [...s.clients, client] })),
      updateClient: (id, patch) =>
        set((s) => ({
          clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteClient: (id) =>
        set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),

      view: "dashboard",
      setView: (view) => set({ view }),

      moisCourant: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
      setMoisCourant: (moisCourant) => set({ moisCourant }),

      resetRequests: [],
      addResetRequest: (req) =>
        set((s) => ({ resetRequests: [...s.resetRequests, req] })),
      resolveResetRequest: (email) =>
        set((s) => ({
          resetRequests: s.resetRequests.map((r) =>
            r.email === email ? { ...r, status: "done" as const } : r
          ),
        })),
    }),
    {
      name: "nvm-finance-store",
      // Ne pas persister l'user (géré par Supabase Auth)
      partialize: (s) => ({
        clients:       s.clients,
        resetRequests: s.resetRequests,
        moisCourant:   s.moisCourant,
      }),
    }
  )
);
