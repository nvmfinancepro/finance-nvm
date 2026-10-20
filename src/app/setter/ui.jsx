// Briques communes aux écrans de l'outil setter : palette, styles, petits composants.

// Même palette que la page publique /espace-setter.
export const C = { primary: "#005653", green: "#21C45D", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5", red: "#dc2626", redBg: "#fef2f2", amber: "#d97706", amberBg: "#fffbeb" };

export const POLICE = "Nunito, sans-serif";
export const carte = { background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 10px 28px rgba(0,86,83,.06)", padding: "18px 18px" };
export const bouton = (fond, texte = "#fff", bord = fond) => ({
  background: fond, color: texte, border: `1.5px solid ${bord}`, borderRadius: 10, padding: "10px 16px",
  fontSize: 14, fontWeight: 800, fontFamily: POLICE, cursor: "pointer", whiteSpace: "nowrap",
});
export const champ = { width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.light}`, fontSize: 15, fontFamily: POLICE, outline: "none", boxSizing: "border-box", color: C.text, background: "#fff" };
export const etiquette = { display: "block", fontSize: 12, fontWeight: 800, color: C.mid, marginBottom: 6 };
export const lien = { color: C.primary, fontWeight: 800, textDecoration: "none" };
export const titre = { fontSize: 16, fontWeight: 900, margin: "0 0 12px", color: C.text };

// Vérification à l'import (setter_prospects.verification).
export const VERIFICATIONS = {
  qualifie: { label: "Qualifié", couleur: "#047857", fond: C.bg },
  a_verifier: { label: "À vérifier", couleur: C.amber, fond: C.amberBg },
  rejete: { label: "Rejeté", couleur: C.red, fond: C.redBg },
};

// Couleur de chaque étape du suivi (setter_prospects.statut).
export const COULEURS_STATUT = {
  a_appeler: { couleur: C.primary, fond: C.bg },
  rappel: { couleur: "#1d4ed8", fond: "#eff6ff" },
  pas_de_reponse: { couleur: C.amber, fond: C.amberBg },
  rdv: { couleur: "#047857", fond: "#d1fae5" },
  pas_interesse: { couleur: C.mid, fond: "#f1f5f4" },
  pas_la_cible: { couleur: C.mid, fond: "#f1f5f4" },
  faux_numero: { couleur: C.red, fond: C.redBg },
  injoignable: { couleur: C.red, fond: C.redBg },
  ne_plus_appeler: { couleur: "#fff", fond: C.red },
};

export const Fond = ({ children }) => <div style={{ minHeight: "100vh", background: C.bg, fontFamily: POLICE, color: C.text }}>{children}</div>;

export function Pastille({ couleur, fond, children }) {
  return <span style={{ flex: "0 0 auto", fontSize: 11.5, fontWeight: 900, color: couleur, background: fond, padding: "4px 10px", borderRadius: 100, whiteSpace: "nowrap" }}>{children}</span>;
}

export function Accordeon({ items }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((it, i) => (
        <details key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", background: "#fff" }}>
          <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 800, color: C.text }}>{it.q}</summary>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.mid, lineHeight: 1.6, margin: "8px 0 0" }}>{it.a}</p>
          {it.note && <p style={{ fontSize: 13, fontWeight: 700, color: C.primary, lineHeight: 1.5, margin: "6px 0 0" }}>→ {it.note}</p>}
        </details>
      ))}
    </div>
  );
}

export const Sep = () => <span style={{ color: C.light }}> · </span>;

export const ancienneteTexte = d => {
  const ans = Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 86400000));
  return `créée en ${new Date(d).getFullYear()} (${ans} an${ans > 1 ? "s" : ""})`;
};
export const ficheOfficielle = siren => `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`;
export const rechercheOfficielle = nom => `https://annuaire-entreprises.data.gouv.fr/rechercher?terme=${encodeURIComponent(nom)}`;
export const normaliser = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
