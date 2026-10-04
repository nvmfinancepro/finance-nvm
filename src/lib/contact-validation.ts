import { promises as dns } from "dns";

// Contrôles des coordonnées saisies à l'inscription au tableau de bord gratuit.
// Objectif : écarter les saisies bidon et les fautes de frappe, sans gêner un
// vrai prospect (en cas de doute technique, on laisse passer).

// Téléphone français (01 à 09, ou +33 / 0033) ou numéro international +XX.
// Renvoie le numéro nettoyé, ou null s'il est invalide ou manifestement faux.
export function cleanPhone(raw: string): string | null {
  const compact = raw.replace(/[\s.\-()]/g, "");
  let national: string | null = null;
  if (/^0[1-9]\d{8}$/.test(compact)) national = compact.slice(1);
  else if (/^(\+33|0033)[1-9]\d{8}$/.test(compact)) national = compact.slice(-9);
  else if (/^\+(?!33)[1-9]\d{7,14}$/.test(compact)) return compact;
  if (!national) return null;

  const rest = national.slice(1); // les 8 chiffres après l'indicatif 1-9
  if (/^(\d)\1{7}$/.test(rest)) return null; // 06 00 00 00 00, 07 77 77 77 77…
  if (/^(\d\d)\1{3}$/.test(rest)) return null; // 06 12 12 12 12…
  if (/12345678|23456789|98765432|87654321/.test(national)) return null; // 06 12 34 56 78…
  return ("0" + national).replace(/(\d\d)(?=\d)/g, "$1 "); // « 06 47 28 19 35 »
}

// Fautes de frappe fréquentes sur les grands fournisseurs d'email.
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com",
  "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gmaill.com": "gmail.com", "gamil.com": "gmail.com",
  "gnail.com": "gmail.com", "gmail.fr": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmail.con": "hotmail.com", "hotmai.com": "hotmail.com",
  "hotmial.fr": "hotmail.fr", "hotmal.fr": "hotmail.fr", "hotmail.fe": "hotmail.fr", "hotmai.fr": "hotmail.fr",
  "outlok.com": "outlook.com", "outloo.com": "outlook.com", "outlook.con": "outlook.com", "outlok.fr": "outlook.fr",
  "yaho.fr": "yahoo.fr", "yahooo.fr": "yahoo.fr", "yahoo.fe": "yahoo.fr", "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com",
  "orange.fe": "orange.fr", "oragne.fr": "orange.fr", "wanadoo.fe": "wanadoo.fr", "wanado.fr": "wanadoo.fr",
  "free.fe": "free.fr", "sfr.fe": "sfr.fr", "laposte.ne": "laposte.net", "icloud.co": "icloud.com", "iclod.com": "icloud.com",
};

// Adresses jetables courantes.
const DISPOSABLE = new Set([
  "yopmail.com", "yopmail.fr", "yopmail.net", "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com",
  "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "trashmail.com", "trashmail.fr", "jetable.org",
  "throwawaymail.com", "getnada.com", "maildrop.cc", "dispostable.com", "fakeinbox.com", "mailnesia.com", "mohmal.com",
  "emailondeck.com", "spamgourmet.com", "mintemail.com", "tempr.email", "discard.email", "mailcatch.com", "moakt.com",
]);

export type EmailCheck = { ok: true } | { ok: false; error: string; suggestion?: string };

export async function checkEmail(email: string): Promise<EmailCheck> {
  const domain = email.split("@")[1] || "";
  const fix = DOMAIN_TYPOS[domain];
  if (fix) {
    const suggestion = email.replace(/@.+$/, "@" + fix);
    return { ok: false, error: `Vouliez-vous dire ${suggestion} ?`, suggestion };
  }
  if (DISPOSABLE.has(domain)) {
    return { ok: false, error: "Les adresses email temporaires ne sont pas acceptées. Utilisez votre email professionnel ou personnel." };
  }
  // Le domaine doit pouvoir recevoir des emails (MX, ou à défaut une adresse A).
  const timeout = new Promise<"timeout">(resolve => setTimeout(() => resolve("timeout"), 3000));
  try {
    const mx = await Promise.race([dns.resolveMx(domain), timeout]);
    if (mx === "timeout") return { ok: true };
    // « MX nul » (RFC 7505) : le domaine déclare explicitement ne recevoir aucun email.
    if (mx.length && mx.every(r => !r.exchange || r.exchange === ".")) {
      return { ok: false, error: "Cette adresse email ne peut pas recevoir de messages. Vérifiez le nom de domaine (après le @)." };
    }
    if (mx.length) return { ok: true };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOTFOUND" && code !== "ENODATA") return { ok: true }; // panne DNS : on ne bloque pas
  }
  try {
    const a = await Promise.race([dns.resolve4(domain), timeout]);
    if (a === "timeout" || a.length) return { ok: true };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOTFOUND" && code !== "ENODATA") return { ok: true };
  }
  return { ok: false, error: "Cette adresse email ne semble pas exister. Vérifiez le nom de domaine (après le @)." };
}
