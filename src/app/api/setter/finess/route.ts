import { NextRequest, NextResponse } from "next/server";
import { appelantSetter } from "@/lib/setter-auth";
import { RE_DEPARTEMENT } from "@/lib/setter-stock";

// Numéros des pharmacies d'un département, d'après le fichier FINESS des établissements
// (data.gouv.fr, licence ouverte, ~35 Mo, mis à jour quelques fois par an) : trop lourd pour le
// navigateur, lu ici et gardé en mémoire un jour. Réponse : { numeros: { siren: téléphone } }.

const JEU = "https://www.data.gouv.fr/api/1/datasets/finess-extraction-du-fichier-des-etablissements/";
const PHARMACIE = "620"; // catégorie d'établissement « Pharmacie d'Officine »
// FINESS note l'outre-mer 9A, 9B… au lieu de 971, 972…
const OUTRE_MER: Record<string, string> = { "971": "9A", "972": "9B", "973": "9C", "974": "9D", "976": "9F" };

let cache: { quand: number; parDepartement: Map<string, Record<string, string>> } | null = null;

async function charger() {
  if (cache && Date.now() - cache.quand < 86400_000) return cache.parDepartement;
  const jeu = await fetch(JEU).then(r => r.json());
  const ressource = (jeu.resources || []).find((r: { title?: string; format?: string }) =>
    r.format === "csv" && /^Extraction Finess des Etablissements au/i.test(r.title || ""));
  if (!ressource) throw new Error("Fichier FINESS introuvable");
  const brut = await fetch(ressource.url).then(r => r.arrayBuffer());
  const parDepartement = new Map<string, Record<string, string>>();
  // Colonnes : 13 département, 16 téléphone, 18 catégorie, 22 SIRET.
  for (const ligne of new TextDecoder("windows-1252").decode(brut).split("\n")) {
    const c = ligne.split(";");
    if (c[18] !== PHARMACIE || !c[16] || !/^\d{14}$/.test(c[22] || "")) continue;
    const numeros = parDepartement.get(c[13]) || {};
    numeros[c[22].slice(0, 9)] ||= c[16];
    parDepartement.set(c[13], numeros);
  }
  cache = { quand: Date.now(), parDepartement };
  return parDepartement;
}

export async function GET(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;

  const departement = req.nextUrl.searchParams.get("departement") || "";
  if (!RE_DEPARTEMENT.test(departement)) return NextResponse.json({ error: "Département invalide" }, { status: 400 });
  try {
    const parDepartement = await charger();
    return NextResponse.json({ numeros: parDepartement.get(OUTRE_MER[departement] || departement) || {} });
  } catch {
    return NextResponse.json({ error: "Fichier des pharmacies indisponible" }, { status: 502 });
  }
}
