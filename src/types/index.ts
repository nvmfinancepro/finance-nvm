// ─── Utilisateurs & Auth ─────────────────────────────────────────────────────
export type UserRole = "ADMIN" | "CLIENT";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  clientId?: number;      // uniquement pour role CLIENT
  firstLogin: boolean;
}

// ─── Client (dossier) ────────────────────────────────────────────────────────
export interface ClientKpis {
  ca: number;
  marge: number;
  charges: number;
  salaires: number;
  ebe: number;
  result: number;
  tresorerie: number;
}

export interface Emprunt {
  id: number;
  libelle: string;
  capital: number;
  taux: number;        // taux mensuel en %
  duree: number;       // en mois
  dateDebut: string;   // "YYYY-MM-DD"
  assurance: number;   // mensuelle
}

export interface Investissement {
  id: number;
  libelle: string;
  dateAchat: string;
  dateMEP: string;
  montantHT: number;
  tauxTVA: number;
  duree: number;       // durée amortissement en mois
}

export interface AjustementTreso {
  id: number;
  mois: string;        // "YYYY-MM"
  libelle: string;
  montant: number;
  type: "encaissement" | "decaissement";
}

export interface Tresorerie {
  soldeInitial: number;
  ajustements: AjustementTreso[];
}

export interface ISData {
  totalPrecedent: number;
  taux: number;
}

export interface ImportCSV {
  id: number;
  type: CSVModuleType;
  label: string;
  mois: string;        // "YYYY-MM"
  rows: Record<string, string>[];
  count: number;
  importedAt: string;
}

export type CSVModuleType =
  | "ventes_produits"
  | "autres_ventes"
  | "charges"
  | "salaires"
  | "catalogue"
  | "creances_clients"
  | "dettes_fournisseurs";

export interface Client {
  id: number;
  name: string;
  sector: string;
  color: string;
  manager: string;
  since: string;
  status: "healthy" | "warning" | "critical";
  email?: string;
  kpis: ClientKpis;
  emprunts: Emprunt[];
  investissements: Investissement[];
  tresorerie: Tresorerie;
  is: ISData;
  imports: ImportCSV[];
}

// ─── Alertes ─────────────────────────────────────────────────────────────────
export interface Alerte {
  level: "red" | "orange" | "green";
  kpi: string;
  current: string;
  threshold: string;
  msg: string;
  action?: string;
  clientName?: string;
}

// ─── KPIs calculés ───────────────────────────────────────────────────────────
export interface MonthKpis {
  ca: number;
  marge: number;
  charges: number;
  salaires: number;
  ebe: number;
  result: number;
  amort: number;
  provIS: number;
  hasData: boolean;
}

// ─── Demandes reset MP ───────────────────────────────────────────────────────
export interface ResetRequest {
  id: number;
  email: string;
  name: string;
  date: string;
  status: "pending" | "done";
}
