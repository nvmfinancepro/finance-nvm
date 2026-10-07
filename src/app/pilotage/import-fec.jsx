"use client";
// IMPORT DE LA COMPTABILITÉ (FEC) · espace client (offre gratuite, aperçu conseiller)
// et admin « Saisie & Import ». Le fichier est lu dans le navigateur, contrôlé,
// résumé par mois (src/lib/fec.js), puis chaque mois est enregistré dans imports_csv :
// un nouvel import met simplement à jour les mois qu'il couvre.
import { useState } from "react";
import { C, Card, Btn } from "@/app/charte";
import { decodeFecFile, parseFec, summarizeFec } from "@/lib/fec";
import { fecIndex, bilanAt, sigOf, plOver, ytdKeys, tiersAt, keyLabel } from "@/lib/pilotage";
import { eur, PastilleStatut } from "@/app/pilotage/graphiques";

const fmtDate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
const MESSAGE_EC = "Bonjour,\n\nPour le suivi mensuel de mon entreprise, pourriez-vous m'envoyer chaque début de mois le FEC (fichier des écritures comptables) de l'exercice en cours, avec les écritures jusqu'à la fin du mois précédent ?\n\nMerci beaucoup,";

function Controle({ statut, children }) {
  return <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: C.text, fontWeight: 600, lineHeight: 1.5 }}><PastilleStatut statut={statut} size={20} /><div>{children}</div></div>;
}

export default function ImportFec({ client, onSaveImport, onDeleteImport, compact = false }) {
  const [etat, setEtat] = useState({ etape: "choix" });
  const [copie, setCopie] = useState(false);
  const idx = fecIndex(client);

  const lire = (file) => {
    if (!file) return;
    setEtat({ etape: "analyse", fichier: file.name });
    const reader = new FileReader();
    reader.onerror = () => setEtat({ etape: "choix", erreur: "Le fichier n'a pas pu être lu." });
    reader.onload = () => {
      // Laisse le temps d'afficher « Analyse en cours » avant le calcul.
      setTimeout(() => {
        try {
          const parsed = parseFec(decodeFecFile(reader.result));
          const resume = summarizeFec(parsed, { fileName: file.name });
          setEtat({ etape: "apercu", fichier: file.name, resume });
        } catch (e) {
          setEtat({ etape: "choix", erreur: e.message || "Le fichier n'a pas pu être analysé." });
        }
      }, 30);
    };
    reader.readAsArrayBuffer(file);
  };

  const enregistrer = async () => {
    const { resume, fichier } = etat;
    const importedAt = new Date().toLocaleDateString("fr-FR");
    const total = resume.months.length + 1;
    let faits = 0;
    const echecs = [];
    setEtat((e) => ({ ...e, etape: "enregistrement", faits, total }));
    for (const m of resume.months) {
      const ok = await onSaveImport({ type: "fec", label: "Comptabilité (FEC)", mois: m.mois, rows: m.rows, count: m.count, importedAt });
      if (!ok) echecs.push(m.mois);
      faits++;
      setEtat((e) => ({ ...e, faits }));
    }
    const okT = await onSaveImport({ type: "fec_tiers", label: "Clients et fournisseurs (FEC)", mois: resume.tiers.mois, rows: resume.tiers.rows, count: resume.tiers.count, importedAt });
    if (!okT) echecs.push("clients et fournisseurs");
    setEtat({ etape: "fini", fichier, resume, echecs });
  };

  // Exercices déjà importés (un FEC = un exercice)
  const exercices = new Map();
  for (const imp of client.imports || []) {
    if (imp.type !== "fec" && imp.type !== "fec_tiers") continue;
    const meta = (imp.rows || []).find((r) => r.k === "m") || {};
    const ex = meta.ex || "?";
    const e = exercices.get(ex) || { ex, mois: [], ids: [], fin: "", fichier: meta.fichier, importedAt: imp.importedAt };
    e.ids.push(imp.id);
    if (imp.type === "fec") e.mois.push(imp.mois);
    if ((meta.fin || "") > e.fin) { e.fin = meta.fin; e.fichier = meta.fichier; e.importedAt = imp.importedAt; }
    exercices.set(ex, e);
  }
  const listeEx = [...exercices.values()].sort((a, b) => (a.ex < b.ex ? 1 : -1));

  const supprimer = async (e) => {
    if (!window.confirm(`Supprimer la comptabilité de l'exercice commençant le ${fmtDate(e.ex)} (${e.mois.length} mois) ?`)) return;
    for (const id of e.ids) await onDeleteImport(id);
  };

  let apercu = null;
  if (etat.resume && (etat.etape === "apercu" || etat.etape === "fini")) {
    const { stats, months, tiers } = etat.resume;
    // Aperçu calculé sur le seul fichier importé
    const tmp = { imports: [...months.map((m, i) => ({ id: -i - 1, type: "fec", mois: m.mois, rows: m.rows })), { id: -999, type: "fec_tiers", mois: tiers.mois, rows: tiers.rows }] };
    const last = months[months.length - 1].mois;
    const s = sigOf(plOver(fecIndex(tmp), ytdKeys(fecIndex(tmp), last)));
    const b = bilanAt(tmp, last);
    const cli = tiersAt(tmp, last, "C");
    const deja = months.filter((m) => idx.months.has(m.mois)).length;
    apercu = (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,170px),1fr))", gap: 10 }}>
          {[
            { l: "Période", v: `${fmtDate(stats.debut)} → ${fmtDate(stats.fin)}`, a: `${months.length} mois` },
            { l: "Chiffre d'affaires", v: eur(s.ca), a: "Sur la période" },
            { l: "Résultat", v: eur(s.rn), a: "Sur la période" },
            { l: "Trésorerie", v: eur(b.tresoNette), a: `Au ${fmtDate(stats.fin)}` },
            { l: "À encaisser", v: eur(cli ? cli.total : 0), a: "Factures clients non réglées" },
          ].map((x) => (
            <div key={x.l} style={{ background: C.bgLight, borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: C.textMid }}>{x.l}</div>
              <div style={{ fontSize: 15.5, fontWeight: 900, color: C.text }}>{x.v}</div>
              <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>{x.a}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Controle statut="ok">{stats.lignes.toLocaleString("fr-FR")} lignes lues, {stats.ecritures.toLocaleString("fr-FR")} écritures{stats.siren ? ` · SIREN ${stats.siren}` : ""}.</Controle>
          <Controle statut={Math.abs(stats.ecart) < 1 ? "ok" : "bad"}>{Math.abs(stats.ecart) < 1 ? `Comptabilité équilibrée : ${eur(stats.totalDebit)} au débit comme au crédit.` : `Débit et crédit ne s'équilibrent pas (écart de ${eur(stats.ecart)}) : le fichier est peut-être incomplet.`}</Controle>
          {stats.desequilibrees > 0 && <Controle statut="warn">{stats.desequilibrees} écriture{stats.desequilibrees > 1 ? "s" : ""} déséquilibrée{stats.desequilibrees > 1 ? "s" : ""} : les chiffres concernés peuvent être faussés.</Controle>}
          <Controle statut={stats.aNouveaux > 0 ? "ok" : "warn"}>{stats.aNouveaux > 0 ? "Soldes d'ouverture (à-nouveaux) trouvés : le bilan est complet dès le premier mois." : "Pas de soldes d'ouverture (à-nouveaux) : c'est normal pour une première année d'activité ; sinon, le bilan sera incomplet."}</Controle>
          {Math.abs(b.ecart) >= 1 && <Controle statut="warn">Le bilan reconstitué présente un écart de {eur(b.ecart)} entre actif et passif.</Controle>}
          {stats.clotures > 0 && <Controle statut="ok">L'écriture de clôture de l'exercice a été écartée pour garder l'activité réelle de chaque mois.</Controle>}
          {stats.erreurs.length > 0 && <Controle statut="warn">{stats.erreurs.length} ligne{stats.erreurs.length > 1 ? "s" : ""} illisible{stats.erreurs.length > 1 ? "s" : ""} ignorée{stats.erreurs.length > 1 ? "s" : ""} (ex. ligne {stats.erreurs[0].line} : {stats.erreurs[0].msg}).</Controle>}
          {stats.partielFin && <Controle statut="na">Le dernier mois ({keyLabel(stats.mois[stats.mois.length - 1])}) n'est pas terminé : ses chiffres seront complétés au prochain import.</Controle>}
          {deja > 0 && <Controle statut="na">{deja} mois déjà importé{deja > 1 ? "s" : ""} {deja > 1 ? "seront mis" : "sera mis"} à jour avec ce fichier.</Controle>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px" }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: C.primary, background: "white", border: `1px solid ${C.border}`, borderRadius: 100, padding: "3px 9px", whiteSpace: "nowrap" }}>LE PLUS COMPLET</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.textMid }}>Toute votre comptabilité en un fichier : chiffres exacts, bilan, trésorerie réelle, clients en retard et comparaison avec l'an dernier. Rien à ressaisir.</span>
        </div>
      )}
      <Card>
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.text, marginBottom: 6 }}>Importer le fichier des écritures comptables (FEC)</div>
            <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.65 }}>
              Tout logiciel comptable sait produire ce fichier (c'est une obligation fiscale) : cherchez « Export FEC » ou « Fichier des écritures comptables ». Votre expert-comptable peut aussi vous l'envoyer en quelques clics.
              <strong style={{ color: C.text }}> Chaque mois, il suffit d'importer le FEC à jour de l'exercice en cours</strong> : les mois déjà présents sont mis à jour, sans doublon. Importer aussi le FEC de l'exercice précédent permet la comparaison avec l'an dernier.
            </div>
          </div>

          {(etat.etape === "choix" || etat.etape === "analyse") && (
            <label style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: "26px 20px", textAlign: "center", background: C.bg, cursor: etat.etape === "analyse" ? "wait" : "pointer", display: "block" }}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); lire(e.dataTransfer.files?.[0]); }}>
              <div style={{ fontSize: 14.5, fontWeight: 900, color: C.primary, marginBottom: 4 }}>{etat.etape === "analyse" ? `Analyse de ${etat.fichier}…` : "Choisir le fichier FEC (ou le déposer ici)"}</div>
              <div style={{ fontSize: 12, color: C.textLight }}>Fichier texte (.txt, .csv) · séparateur tabulation ou « | » · lu sur votre ordinateur, seuls les totaux sont enregistrés</div>
              <input type="file" accept=".txt,.csv,.fec,.tsv,text/plain" disabled={etat.etape === "analyse"} onChange={(e) => { lire(e.target.files?.[0]); e.target.value = ""; }} style={{ display: "none" }} />
            </label>
          )}
          {etat.erreur && <div style={{ fontSize: 13, fontWeight: 700, color: C.red, background: C.redBg, borderRadius: 10, padding: "10px 14px", lineHeight: 1.5 }}>{etat.erreur}</div>}

          {etat.etape === "apercu" && (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: C.text }}>Vérification de {etat.fichier}</div>
              {apercu}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Btn onClick={enregistrer} disabled={!onSaveImport}>Importer ces {etat.resume.months.length} mois</Btn>
                <Btn variant="ghost" onClick={() => setEtat({ etape: "choix" })}>Choisir un autre fichier</Btn>
              </div>
            </>
          )}
          {etat.etape === "enregistrement" && (
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 8 }}>Enregistrement… {etat.faits} / {etat.total}</div>
              <div style={{ height: 8, background: C.bg, borderRadius: 6 }}><div style={{ width: `${(etat.faits / etat.total) * 100}%`, height: 8, background: C.primary, borderRadius: 6, transition: "width .2s" }} /></div>
            </div>
          )}
          {etat.etape === "fini" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {etat.echecs.length === 0
                ? <Controle statut="ok"><strong>Comptabilité importée</strong> : {etat.resume.months.length} mois, jusqu'au {fmtDate(etat.resume.stats.fin)}. La synthèse, le compte de résultat, le bilan et la trésorerie sont à jour.</Controle>
                : <Controle statut="bad">L'enregistrement a échoué pour : {etat.echecs.join(", ")}. Relancez l'import ; si le problème continue, contactez {client.advisorLabel || "votre conseiller"}.</Controle>}
              <div><Btn variant="ghost" onClick={() => setEtat({ etape: "choix" })}>Importer un autre fichier</Btn></div>
            </div>
          )}
        </div>

        {listeEx.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.borderLight}`, padding: "16px 24px" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: C.textMid, marginBottom: 10 }}>Comptabilité déjà importée</div>
            {listeEx.map((e) => {
              const m = [...e.mois].sort();
              return (
                <div key={e.ex} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", background: C.bg, borderRadius: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: C.text }}>Exercice ouvert le {fmtDate(e.ex)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.textMid }}>{m.length ? `${keyLabel(m[0], false)} → ${keyLabel(m[m.length - 1], false)}` : ""} · à jour au {fmtDate(e.fin)}</span>
                  <span style={{ fontSize: 11.5, color: C.textLight }}>importé le {e.importedAt}</span>
                  {onDeleteImport && <span style={{ marginLeft: "auto" }}><Btn small variant="ghost" style={{ color: C.red, borderColor: C.red + "44", fontSize: 11, padding: "2px 10px" }} onClick={() => supprimer(e)}>Supprimer</Btn></span>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {!compact && (
        <Card>
          <div style={{ padding: "18px 24px", display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 340px" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 4 }}>C'est votre expert-comptable qui tient la comptabilité ?</div>
              <div style={{ fontSize: 12.5, color: C.textMid, lineHeight: 1.6, marginBottom: 10 }}>Voici un message prêt à lui envoyer. Une fois en place, il suffit d'importer le fichier reçu chaque mois.</div>
              <div style={{ fontSize: 12.5, color: C.text, background: C.bgLight, borderRadius: 10, padding: "10px 14px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{MESSAGE_EC}</div>
            </div>
            <Btn small variant="ghost" onClick={() => { try { navigator.clipboard.writeText(MESSAGE_EC); setCopie(true); setTimeout(() => setCopie(false), 2500); } catch { /* presse-papiers indisponible */ } }}>{copie ? "Message copié" : "Copier le message"}</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
