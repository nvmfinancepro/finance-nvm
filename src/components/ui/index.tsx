import { ReactNode } from "react";

// ─── Formatters ──────────────────────────────────────────────────────────────
export const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n ?? 0);
export const pct = (n: number) => `${Math.round(n ?? 0)} %`;

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

// ─── SectionHead ─────────────────────────────────────────────────────────────
export function SectionHead({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
      <div>
        <div className="text-sm font-extrabold text-gray-800">{title}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────
export function KpiCard({
  label, value, sub, color = "#005653",
}: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Pill badge ──────────────────────────────────────────────────────────────
export function Pill({ color, bg, children }: { color: string; bg?: string; children: ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-extrabold"
      style={{ color, background: bg ?? color + "18" }}>
      {children}
    </span>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "success" | "ghost" | "orange" | "danger";

const variantStyles: Record<BtnVariant, string> = {
  primary: "bg-primary text-white hover:opacity-90",
  success: "bg-emerald-600 text-white hover:opacity-90",
  ghost:   "border border-gray-200 text-gray-600 hover:bg-gray-50",
  orange:  "bg-amber-600 text-white hover:opacity-90",
  danger:  "bg-red-600 text-white hover:opacity-90",
};

export function Btn({
  children, onClick, disabled, variant = "primary", small = false, className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: BtnVariant;
  small?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-1.5 rounded-lg font-bold transition-all
        ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}
        ${variantStyles[variant]}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}>
      {children}
    </button>
  );
}

// ─── Table primitives ─────────────────────────────────────────────────────────
export function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-2.5 text-xs font-extrabold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

export function Td({ children, right, mono, bold, color, style }: {
  children: ReactNode; right?: boolean; mono?: boolean; bold?: boolean; color?: string; style?: React.CSSProperties;
}) {
  return (
    <td className={`px-4 py-3 text-sm border-b border-gray-50 ${right ? "text-right" : ""} ${mono ? "font-mono" : ""} ${bold ? "font-bold" : ""}`}
      style={{ color, ...style }}>
      {children}
    </td>
  );
}

export function Tr({ children, style, className }: { children: ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <tr className={`hover:bg-emerald-50 transition-colors ${className ?? ""}`} style={style}>
      {children}
    </tr>
  );
}

// ─── FormRow ─────────────────────────────────────────────────────────────────
export function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
