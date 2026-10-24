import { createHmac, timingSafeEqual } from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { MAIL_ENVOYE, nomDirigeant } from "@/lib/setter-appels";
import { formaterTelephone } from "@/lib/setter-import";

// Rappels des setters dans leur Google Agenda (serveur seulement : le jeton Google ne quitte
// jamais le serveur, migration 045). Le setter connecte une fois son compte ; l'outil crée un
// agenda « Rappels NVM » (droit limité aux agendas créés par l'outil : il ne voit ni ne touche
// le reste de son agenda) et y pose un événement par rappel daté, déplacé ou supprimé quand le
// rappel change. Un rappel passé reste dans l'agenda comme trace.

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const JETON = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";
const DROIT_AGENDA = "https://www.googleapis.com/auth/calendar.app.created";
const FUSEAU = "Europe/Paris";
export const NOM_AGENDA = "Rappels NVM";
const DUREE_MIN = 15;

export type ConnexionGoogle = { setter_id: string; email: string | null; refresh_token: string; calendrier_id: string | null };
type Prospect = {
  id: number; nom: string; dirigeant_prenom: string | null; dirigeant_nom: string | null; telephone: string;
  ligne_directe: string | null; statut: string; prochain_appel: string | null; google_event_id: string | null;
};

// Espaces retirés : une valeur collée dans Vercel avec un espace devant fait refuser l'identifiant par Google.
const clientId = () => (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
const codeSecret = () => (process.env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim();
export const googleDisponible = () => !!(clientId() && codeSecret());
const adresseRetour = (origine: string) => `${origine}/api/setter/google/retour`;

// Le paramètre « state » relie le retour de Google au setter qui a cliqué : signé avec une clé
// propre au serveur (pas le code secret OAuth, pour qu'il ne suffise pas à le forger), valable 10 minutes.
const signature = (texte: string) =>
  createHmac("sha256", `setter-google-state:${process.env.SUPABASE_SERVICE_ROLE_KEY}`).update(texte).digest("base64url");
export function lienConnexion(origine: string, setterId: string) {
  const texte = `${setterId}.${Date.now() + 10 * 60000}`;
  const p = new URLSearchParams({
    client_id: clientId(), redirect_uri: adresseRetour(origine), response_type: "code",
    scope: `openid email ${DROIT_AGENDA}`, access_type: "offline", prompt: "consent", state: `${texte}.${signature(texte)}`,
  });
  return `${AUTH}?${p}`;
}
export function setterDeLEtat(etat: string): string | null {
  const [id, expire, sig] = String(etat || "").split(".");
  if (!id || !expire || !sig || Number(expire) < Date.now()) return null;
  const attendue = Buffer.from(signature(`${id}.${expire}`)), recue = Buffer.from(sig);
  return attendue.length === recue.length && timingSafeEqual(attendue, recue) ? id : null;
}

// Code renvoyé par Google → jeton de renouvellement, droits accordés et e-mail du compte.
export async function echangerCode(origine: string, code: string) {
  const rep = await fetch(JETON, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId(), client_secret: codeSecret(),
      redirect_uri: adresseRetour(origine), grant_type: "authorization_code",
    }),
  });
  if (!rep.ok) throw new Error(`Google ${rep.status}`);
  const j = await rep.json();
  let email: string | null = null;
  try { email = JSON.parse(Buffer.from(String(j.id_token).split(".")[1], "base64url").toString()).email || null; } catch { /* pas d'e-mail */ }
  return {
    accesAgenda: String(j.scope || "").split(" ").includes(DROIT_AGENDA),
    refreshToken: j.refresh_token as string | undefined, accessToken: j.access_token as string, email,
  };
}

export class GoogleDeconnecte extends Error {}

// Jeton d'accès (1 h) à partir du jeton de renouvellement. Google le refuse si le setter a
// retiré l'accès depuis son compte : la connexion est alors effacée.
export async function jetonAcces(admin: SupabaseClient, c: ConnexionGoogle) {
  const rep = await fetch(JETON, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId(), client_secret: codeSecret(),
      refresh_token: c.refresh_token, grant_type: "refresh_token",
    }),
  });
  if (rep.ok) return (await rep.json()).access_token as string;
  if (rep.status === 400 || rep.status === 401) {
    await admin.from("setter_google").delete().eq("setter_id", c.setter_id);
    throw new GoogleDeconnecte();
  }
  throw new Error(`Google ${rep.status}`);
}

export const revoquer = (jeton: string) =>
  fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(jeton)}`, { method: "POST" }).catch(() => null);

const agenda = (jeton: string, methode: string, chemin: string, corps?: unknown) => fetch(`${API}${chemin}`, {
  method: methode, cache: "no-store",
  headers: { Authorization: `Bearer ${jeton}`, ...(corps ? { "Content-Type": "application/json" } : {}) },
  body: corps ? JSON.stringify(corps) : undefined,
});

// L'agenda « Rappels NVM » : celui déjà créé s'il existe encore, sinon un nouveau.
export async function agendaRappels(jeton: string, existant: string | null) {
  if (existant && (await agenda(jeton, "GET", `/calendars/${encodeURIComponent(existant)}`)).ok) return existant;
  const rep = await agenda(jeton, "POST", "/calendars", { summary: NOM_AGENDA, timeZone: FUSEAU });
  if (!rep.ok) throw new Error(`Google ${rep.status}`);
  return (await rep.json()).id as string;
}

function evenement(p: Prospect, appels: { resultat: string; raison: string | null; note: string | null; created_at: string }[]) {
  const dirigeant = nomDirigeant(p);
  const rappel = appels.find(a => a.resultat === "rappel");
  const mail = appels.find(a => a.resultat === "rappel" && a.raison === MAIL_ENVOYE);
  const debut = new Date(p.prochain_appel as string);
  const lignes = [
    dirigeant ? `Dirigeant : ${dirigeant}` : null,
    `Téléphone : ${formaterTelephone(p.telephone)}`,
    p.ligne_directe ? `Ligne directe : ${formaterTelephone(p.ligne_directe)}` : null,
    mail ? `${MAIL_ENVOYE} le ${new Date(mail.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: FUSEAU })}` : null,
    rappel?.note ? `Note : ${rappel.note}` : null,
  ].filter(Boolean);
  return {
    summary: `Rappeler ${dirigeant ? `${dirigeant} · ${p.nom}` : p.nom}`,
    description: `${lignes.join("\n")}\n\nFiche dans l'outil : https://nvm-finance.fr/setter`,
    start: { dateTime: debut.toISOString(), timeZone: FUSEAU },
    end: { dateTime: new Date(debut.getTime() + DUREE_MIN * 60000).toISOString(), timeZone: FUSEAU },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 5 }] },
  };
}

// Met l'agenda Google d'accord avec le prospect : rappel prévu → événement posé ou déplacé ;
// plus de rappel (RDV, pas intéressé, annulé…) → l'événement encore à venir est supprimé.
// Renvoie l'id de l'événement en cours (ou null) et l'enregistre sur le prospect.
export async function synchroniserRappel(admin: SupabaseClient, c: ConnexionGoogle, jeton: string, calendrier: string, prospectId: number) {
  const { data: p, error } = await admin.from("setter_prospects")
    .select("id,nom,dirigeant_prenom,dirigeant_nom,telephone,ligne_directe,statut,prochain_appel,google_event_id")
    .eq("id", prospectId).eq("setter_id", c.setter_id).maybeSingle<Prospect>();
  if (error) throw error;
  if (!p) return null;
  const cal = `/calendars/${encodeURIComponent(calendrier)}/events`;

  // L'événement déjà posé n'est repris que s'il est encore à venir : un rappel passé reste en trace.
  let aVenir: string | null = null;
  if (p.google_event_id) {
    const rep = await agenda(jeton, "GET", `${cal}/${encodeURIComponent(p.google_event_id)}`);
    if (rep.ok) {
      const e = await rep.json();
      if (e.status !== "cancelled" && new Date(e.end?.dateTime) > new Date()) aVenir = e.id;
    }
  }

  let id: string | null = null;
  if (p.statut === "rappel" && p.prochain_appel) {
    const { data: appels } = await admin.from("setter_appels").select("resultat,raison,note,created_at")
      .eq("prospect_id", p.id).order("created_at", { ascending: false }).limit(50);
    const corps = evenement(p, appels || []);
    const rep = aVenir
      ? await agenda(jeton, "PATCH", `${cal}/${encodeURIComponent(aVenir)}`, corps)
      : await agenda(jeton, "POST", cal, corps);
    if (!rep.ok) throw new Error(`Google ${rep.status}`);
    id = (await rep.json()).id;
  } else if (aVenir) {
    const rep = await agenda(jeton, "DELETE", `${cal}/${encodeURIComponent(aVenir)}`);
    if (!rep.ok && rep.status !== 404 && rep.status !== 410) throw new Error(`Google ${rep.status}`);
  }

  if (id !== p.google_event_id) {
    const { error: e2 } = await admin.from("setter_prospects").update({ google_event_id: id }).eq("id", p.id);
    if (e2) throw e2;
  }
  return id;
}
