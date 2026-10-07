// Plan d'actions partagé entre le dirigeant et son conseiller, et lignes manuelles
// de la prévision de trésorerie. Stockés dans imports_csv (type "actions" et
// "prevision", mois "plan") : modifiables par le client (toutes offres) et le conseiller.

export const STATUTS_ACTION = [
  { id: "afaire", label: "À faire" },
  { id: "encours", label: "En cours" },
  { id: "fait", label: "Fait" },
];
export const RESPONSABLES = ["Dirigeant", "Conseiller", "Ensemble"];

export function lireActions(client) {
  const imp = (client.imports || []).find((i) => i.type === "actions" && i.mois === "plan");
  return (imp?.rows || []).filter((r) => r && r.titre);
}
export const sauverActions = (onSave, actions) =>
  onSave({ type: "actions", label: "Plan d'actions", mois: "plan", rows: actions, count: actions.length, importedAt: new Date().toLocaleDateString("fr-FR") });

export const nouvelleAction = (patch = {}) => ({
  id: `a${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
  titre: "", detail: "", responsable: "Ensemble", echeance: "", statut: "afaire", impact: 0, creeLe: new Date().toISOString().slice(0, 10), ...patch,
});
export const enRetard = (a, aujourdhui = new Date().toISOString().slice(0, 10)) => a.statut !== "fait" && a.echeance && a.echeance < aujourdhui;

export function lirePrevisions(client) {
  const imp = (client.imports || []).find((i) => i.type === "prevision" && i.mois === "plan");
  return (imp?.rows || []).filter((r) => r && r.mois && Number(r.montant));
}
export const sauverPrevisions = (onSave, lignes) =>
  onSave({ type: "prevision", label: "Prévision de trésorerie", mois: "plan", rows: lignes, count: lignes.length, importedAt: new Date().toLocaleDateString("fr-FR") });
