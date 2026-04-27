import type { CSVModuleType } from "@/types";

export const CSV_MODULES: { id: CSVModuleType; label: string; hint: string }[] = [
  { id: "ventes_produits",    label: "Ventes produits",        hint: "Ventes par produit / service" },
  { id: "autres_ventes",      label: "Autres ventes",          hint: "Subventions, cessions, prestations" },
  { id: "charges",            label: "Charges",                hint: "Charges fixes et variables avec TVA" },
  { id: "salaires",           label: "Masse salariale",        hint: "Coût total employeur" },
  { id: "catalogue",          label: "Catalogue produits",     hint: "Tarifs, marges et références" },
  { id: "creances_clients",   label: "Créances clients",       hint: "Balance âgée compte 411" },
  { id: "dettes_fournisseurs",label: "Dettes fournisseurs",    hint: "Balance âgée compte 401" },
];

const TEMPLATES: Record<string, string> = {
  ventes_produits:
    "reference;nom_produit;quantite_vendue;ca_ht;cout_achat_ht;marge_ht;canal_vente\nPRD-001;Produit A;50;10000;4000;6000;Site propre",
  autres_ventes:
    "libelle;nature;encaissement;ca_ht;taux_tva;cout;marge\nSubvention ADEME;subvention;3500;3500;0;0;3500",
  charges:
    "date;fournisseur;libelle;montant_ht;taux_tva;tva_recuperable;type\n2024-04-01;Fournisseur A;Loyer;1800;0;non;fixe",
  salaires:
    "nom_prenom;statut;poste;salaire_brut;cotisations_salariales;cotisations_patronales;salaire_net\nJean Dupont;CDI;Responsable;3800;798;1748;3002",
  catalogue:
    "reference;nom_produit;pvht;taux_tva;paht;fournisseur;stock_min\nPRD-001;Produit A;150;20;60;Fournisseur FR;20",
  creances_clients:
    "numero_facture;client;date_emission;date_echeance;montant_ht;tva;montant_ttc;statut;jours_retard\nFA-2024-001;Client Alpha;2024-03-15;2024-04-15;5000;1000;6000;En attente;10",
  dettes_fournisseurs:
    "numero_facture;fournisseur;date_reception;date_echeance;montant_ht;tva;montant_ttc;statut;jours_retard\nFF-2024-101;Fournisseur A;2024-03-10;2024-04-10;2800;560;3360;A payer;15",
};

export function getTemplate(type: CSVModuleType): string {
  return TEMPLATES[type] ?? "";
}

// Parser CSV simple (séparateur ; ou ,)
export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(sep);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()]));
  });
  return { headers, rows };
}

export function validateRows(rows: Record<string, string>[], type: CSVModuleType): string[] {
  const errors: string[] = [];
  if (rows.length === 0) errors.push("Aucune ligne de données détectée.");
  if (type === "ventes_produits" && !Object.keys(rows[0] ?? {}).includes("ca_ht"))
    errors.push("Colonne 'ca_ht' manquante.");
  if (type === "salaires" && !Object.keys(rows[0] ?? {}).includes("salaire_brut"))
    errors.push("Colonne 'salaire_brut' manquante.");
  return errors;
}
