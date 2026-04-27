"use client";

import { LogoSVG } from "@/components/ui/Logo";

interface NavItem {
  id: string;
  label: string;
  badge?: number;
  badgeColor?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "clients",   label: "Gestion clients" },
  { id: "acces",     label: "Accès clients" },
  { id: "saisie",    label: "Saisie & Import CSV" },
  { id: "financier", label: "Données financières" },
  { id: "alertes",   label: "Alertes" },
  { id: "rapports",  label: "Rapports IA" },
];

interface AdminSidebarProps {
  view: string;
  setView: (v: string) => void;
  onLogout: () => void;
  clientCount?: number;
  alertCount?: number;
  resetCount?: number;
}

export function AdminSidebar({ view, setView, onLogout, clientCount = 0, alertCount = 0, resetCount = 0 }: AdminSidebarProps) {
  const items = NAV_ITEMS.map(item => ({
    ...item,
    badge: item.id === "clients" ? clientCount
         : item.id === "alertes" ? alertCount
         : item.id === "acces"   ? resetCount
         : undefined,
    badgeColor: item.id === "alertes" ? "#dc2626" : item.id === "acces" ? "#d97706" : undefined,
  }));

  return (
    <aside className="w-56 flex flex-col h-screen sticky top-0 shrink-0" style={{ background: "#005653" }}>
      <div className="px-4 py-4 border-b border-white/10 flex justify-center">
        <LogoSVG width={110} showLabel fillColor="white" brightGreen="#21C45D" labelColor="white"/>
      </div>
      <div className="px-4 py-1.5 border-b border-white/8 text-center">
        <span className="text-[9px] text-white/40 font-bold tracking-widest uppercase">Espace Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {items.map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            className={`
              w-full flex items-center gap-2 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-semibold transition-all text-left
              ${view === item.id ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/8 hover:text-white"}
            `}>
            <span className="flex-1">{item.label}</span>
            {!!item.badge && (
              <span className="text-xs font-black rounded-full px-1.5 py-0.5 min-w-[20px] text-center text-white"
                style={{ background: item.badgeColor ?? "#059669" }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button onClick={onLogout}
          className="w-full py-2 text-xs text-white/50 hover:text-white font-bold transition-colors">
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
