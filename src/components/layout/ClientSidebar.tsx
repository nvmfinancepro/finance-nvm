"use client";

import { LogoSVG } from "@/components/ui/Logo";

interface Section {
  label: string;
  items: { id: string; label: string; badge?: number; badgeColor?: string }[];
}

const SECTIONS: Section[] = [
  { label: "VUE GÉNÉRALE", items: [
    { id: "dashboard", label: "Tableau de bord" },
    { id: "alertes",   label: "Mes alertes" },
  ]},
  { label: "MON ACTIVITÉ", items: [
    { id: "ventes",    label: "Mes ventes" },
    { id: "achats",    label: "Mes coûts d'achat" },
    { id: "charges",   label: "Mes charges" },
    { id: "salaires",  label: "Ma masse salariale" },
    { id: "creances",  label: "Mes créances clients" },
    { id: "dettes",    label: "Mes dettes fournisseurs" },
  ]},
  { label: "MES FINANCES", items: [
    { id: "resultat",        label: "Mon résultat" },
    { id: "is",              label: "Mon impôt (IS)" },
    { id: "tresorerie",      label: "Ma trésorerie" },
    { id: "emprunts",        label: "Mes emprunts" },
    { id: "investissements", label: "Mes investissements" },
  ]},
  { label: "CATALOGUE", items: [
    { id: "catalogue", label: "Mon catalogue produits" },
  ]},
  { label: "ANALYSE", items: [
    { id: "comparaison", label: "Comparaison périodes" },
  ]},
];

interface ClientSidebarProps {
  view: string;
  setView: (v: string) => void;
  onLogout: () => void;
  clientName: string;
  alertCount?: number;
}

export function ClientSidebar({ view, setView, onLogout, clientName, alertCount = 0 }: ClientSidebarProps) {
  const sections = SECTIONS.map(sec => ({
    ...sec,
    items: sec.items.map(item => ({
      ...item,
      badge: item.id === "alertes" ? alertCount : undefined,
      badgeColor: item.id === "alertes" ? "#dc2626" : undefined,
    })),
  }));

  return (
    <aside className="w-56 flex flex-col h-screen sticky top-0 shrink-0" style={{ background: "#005653" }}>
      <div className="px-4 py-4 border-b border-white/10 flex justify-center">
        <LogoSVG width={110} showLabel fillColor="white" brightGreen="#21C45D" labelColor="white"/>
      </div>
      <div className="px-4 py-1.5 border-b border-white/8 text-center">
        <span className="text-[10px] text-white/80 font-bold">{clientName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {sections.map(sec => (
          <div key={sec.label} className="mb-2">
            <div className="text-[9px] text-white/35 font-black tracking-widest uppercase px-2.5 py-2">
              {sec.label}
            </div>
            {sec.items.map(item => (
              <button key={item.id} onClick={() => setView(item.id)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 text-sm transition-all text-left
                  ${view === item.id ? "bg-white/15 text-white font-bold border-l-2 border-white" : "text-white/60 hover:bg-white/8 hover:text-white font-medium border-l-2 border-transparent"}
                `}>
                <span className="flex-1">{item.label}</span>
                {!!item.badge && (
                  <span className="text-xs font-black rounded-full px-1.5 py-0.5 text-white min-w-[20px] text-center"
                    style={{ background: item.badgeColor ?? "#059669" }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button onClick={onLogout} className="w-full py-2 text-xs text-white/50 hover:text-white font-bold transition-colors">
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
