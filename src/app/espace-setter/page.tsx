import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { LogoSVG } from "@/components/ui/Logo";

const C = { primary: "#005653", green: "#21C45D", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5", red: "#dc2626", redBg: "#fef2f2", amber: "#d97706", amberBg: "#fffbeb" };

export const metadata: Metadata = {
  title: "Espace setter | NVM Finance",
  description: "Comment on fonctionne, ce qu'on vend et comment décrocher un rendez-vous.",
  robots: { index: false, follow: false },
};

const sectionStyle: CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "0 24px" };
const eyebrowStyle: CSSProperties = { fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 64, marginBottom: 8 };
const h2Style: CSSProperties = { fontSize: 26, fontWeight: 900, color: C.text, marginTop: 0, marginBottom: 14 };
const h3Style: CSSProperties = { fontSize: 17, fontWeight: 900, color: C.text, marginTop: 32, marginBottom: 10 };
const pStyle: CSSProperties = { fontSize: 16, lineHeight: 1.75, color: C.mid, marginBottom: 16 };
const captionStyle: CSSProperties = { fontSize: 13.5, fontWeight: 700, color: C.primary, textAlign: "center", marginTop: 14 };
const cardStyle: CSSProperties = { background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: "0 16px 36px rgba(0,86,83,.08)", padding: "20px 22px" };

function Frame({ urlLabel, children }: { urlLabel: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 26, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: "0 16px 36px rgba(0,86,83,.08)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: C.mid, background: C.bg, padding: "4px 12px", borderRadius: 100 }}>{urlLabel}</span>
      </div>
      <div style={{ padding: "20px 22px 22px" }}>{children}</div>
    </div>
  );
}

function Tag({ children, color = C.mid, bg = C.bg }: { children: React.ReactNode; color?: string; bg?: string }) {
  return <span style={{ fontSize: 11, fontWeight: 800, color, background: bg, padding: "4px 10px", borderRadius: 100 }}>{children}</span>;
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 14.5, fontWeight: 600, color: C.mid, lineHeight: 1.55 }}>
      <span style={{ width: 17, height: 17, borderRadius: "50%", background: C.green, color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 3 }}>✓</span>
      <span>{children}</span>
    </div>
  );
}

function Script({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: `4px solid ${C.primary}`, background: C.bg, borderRadius: "0 12px 12px 0", padding: "14px 18px", fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.65, marginBottom: 12 }}>
      {children}
    </div>
  );
}

const statTiles = [
  { l: "Trésorerie", v: "18 240 €", status: "ok", trend: "up" },
  { l: "Marge brute", v: "34,2 %", status: "ok", trend: "up" },
  { l: "Résultat", v: "2 380 €", status: "ok", trend: "up" },
  { l: "TVA à venir", v: "3 100 €", status: "watch", trend: "flat" },
  { l: "IS provisionné", v: "1 640 €", status: "watch", trend: "flat" },
  { l: "Emprunts", v: "2 contrats", status: "ok", trend: "flat" },
  { l: "Investissements", v: "1 en cours", status: "ok", trend: "flat" },
  { l: "Créances clients", v: "6 400 €", status: "watch", trend: "up" },
  { l: "Dettes fournisseurs", v: "4 100 €", status: "ok", trend: "down" },
] as const;

const statusColor = { ok: C.green, watch: C.amber, alert: C.red } as const;
const trendArrow = { up: "▲", down: "▼", flat: "•" } as const;
const trendColor = { up: C.green, down: C.red, flat: C.light } as const;

const leviers = [
  { t: "Gagner plus", d: "Repérer ce qui coûte trop cher et ce qui rapporte le plus : prix, marges, fournisseurs, abonnements, tâches à automatiser avec des outils de gestion." },
  { t: "Développer", d: "Savoir où investir, quand recruter, quels produits ou clients pousser, chiffres à l'appui." },
  { t: "Sécuriser", d: "Anticiper les problèmes de trésorerie, les impayés clients, les échéances fiscales. Éviter les mauvaises surprises." },
];

const offres = [
  { tag: "Tableau de bord", prix: "Gratuit", com: "0 €", d: "Le dirigeant voit tous ses chiffres, en autonomie. C'est la porte d'entrée.", best: false },
  { tag: "Pilotage mensuel", prix: "490 € HT/mois", com: "98 €/mois", d: "Un conseiller analyse les chiffres chaque mois, audit complet inclus, et suit la mise en œuvre des actions. Sans engagement.", best: true },
  { tag: "Audit one shot", prix: "3 000 € HT", com: "600 € une fois", d: "Un état des lieux complet avec plan d'action chiffré. Le dirigeant l'applique ensuite seul.", best: false },
];

const secteurs = [
  "BTP",
  "Restaurants",
  "Transport et logistique",
  "Garages automobiles",
  "Conciergeries",
  "Commerces avec stock : boulangeries, boucheries, caves, épiceries fines",
  "Hôtels indépendants",
  "Entreprises de nettoyage et de services",
  "Cabinets dentaires et vétérinaires",
];

const faq: { q: string; a: string; note?: string }[] = [
  { q: "« C'est quoi exactement ? »", a: "« On fait du contrôle de gestion externalisé. Chaque mois, un conseiller analyse les chiffres de votre entreprise pour améliorer votre rentabilité, sécuriser votre entreprise et vous aider à la développer. »" },
  { q: "« Vous êtes qui, NVM Finance ? »", a: "« On est un cabinet de conseil qui accompagne les dirigeants dans le pilotage et le développement de leur entreprise. On accompagne déjà plus de 20 entreprises comme la vôtre. »" },
  { q: "« Qui vous a donné mon numéro ? »", a: "« Je vous ai trouvé sur LinkedIn / votre site. Je contacte directement les dirigeants de votre secteur. »" },
  { q: "« Ça coûte combien ? »", a: "« Il y a un tableau de bord gratuit, puis un suivi mensuel ou un audit complet selon vos besoins. Le conseiller vous présentera les formules pendant la visio, qui est gratuite et sans engagement. »", note: "Les prix sont présentés par le conseiller en visio, avec la formule adaptée à l'entreprise." },
  { q: "« Vous travaillez avec qui, dans mon secteur ? »", a: "« Je ne donne pas les noms par confidentialité, mais on accompagne des [secteur] de votre taille. »" },
  { q: "Question trop technique", a: "« Très bonne question. Moi je suis au service commercial, donc je préfère ne pas vous dire de bêtise. C'est un conseiller qui pourra vous répondre précisément. Je vous cale une visio de 30 minutes avec lui : plutôt [jour] à [heure] ou [jour] à [heure] ? »" },
];

const objections: { q: string; a: string; note?: string }[] = [
  { q: "« J'ai déjà un comptable »", a: "« Très bien. Nous, on ne remplace pas le comptable : on suit vos chiffres chaque mois pour aller chercher de la rentabilité et développer votre entreprise. On travaille d'ailleurs souvent avec eux. »" },
  { q: "« Pas le temps »", a: "« Je comprends, c'est pour ça que je ne vous embête pas maintenant. 30 minutes dans la semaine, vous préférez mardi ou jeudi ? »" },
  { q: "« Pas intéressé »", a: "« Pas de souci. Juste par curiosité, c'est parce que vous êtes déjà bien accompagné là-dessus ? »", note: "S'il est déjà accompagné, on le note et on passe au suivant. S'il est suivi par son comptable, voir « J'ai déjà un comptable »." },
  { q: "« Envoyez-moi un mail »", a: "« Pas de souci. C'est bien [adresse mail] ? Je vous envoie une présentation, et je vous rappelle [jour] pour voir si ça vous parle. »", note: "On lui envoie le lien du site (nvm-finance.fr), et la date du rappel est notée dans le fichier." },
  { q: "« Encore un vendeur / ça marche pas, ces trucs-là »", a: "« Je comprends la méfiance, vous devez en recevoir plein. Justement, je ne vous vends rien au téléphone. On se voit 30 minutes, le conseiller regarde votre situation, et vous jugez. »" },
  { q: "« Rappelez-moi plus tard »", a: "« Pas de problème. Quand ? La semaine prochaine, plutôt début ou fin de semaine ? »", note: "L'idée est de repartir avec une date précise." },
  { q: "« Tout va bien, on n'a pas de problème »", a: "« Tant mieux. C'est justement quand ça tourne bien qu'on peut aller chercher plus de rentabilité et préparer la suite. »" },
  { q: "« Je suis trop petit pour ça »", a: "« C'est justement pour les TPE qu'on l'a conçu. Les grandes entreprises ont un directeur financier, les TPE non. Nous, on joue ce rôle. »" },
  { q: "« C'est une arnaque ? »", a: "« Je comprends la question. On est une entreprise notée 5 étoiles sur Google, vous pouvez nous vérifier. Et la visio est sans engagement. »" },
];

function Accordion({ items }: { items: { q: string; a: string; note?: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
      {items.map((it, i) => (
        <details key={i} className="st-details" style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px" }}>
          <summary style={{ fontSize: 15, fontWeight: 800, color: C.text, cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            {it.q}
            <span className="st-plus" style={{ color: C.primary, fontSize: 18, fontWeight: 900, flexShrink: 0 }}>+</span>
          </summary>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.mid, lineHeight: 1.7, margin: "12px 0 0" }}>{it.a}</p>
          {it.note && <p style={{ fontSize: 13.5, fontWeight: 700, color: C.primary, lineHeight: 1.6, margin: "10px 0 0" }}>→ {it.note}</p>}
        </details>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", background: "#fff", color: C.text, minHeight: "100vh" }}>
      <style>{`
        .st-grid9{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .st-grid3{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .st-details summary::-webkit-details-marker{ display:none; }
        .st-details[open] .st-plus{ transform:rotate(45deg); }
        .st-plus{ transition:transform .2s; }
        @media(max-width:640px){
          .st-grid9{ grid-template-columns:repeat(2,1fr); }
          .st-grid3{ grid-template-columns:1fr; }
        }
      `}</style>

      <header style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "16px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <LogoSVG width={36} />
            <span style={{ fontSize: 15, fontWeight: 900, color: C.primary }}>NVM Finance</span>
          </a>
          <Tag color={C.primary} bg={C.bg}>Espace setter</Tag>
        </div>
      </header>

      <article style={{ padding: "56px 0 96px" }}>
        <div style={sectionStyle}>
          <p style={{ ...eyebrowStyle, marginTop: 0, marginBottom: 12 }}>Bienvenue dans l&apos;équipe</p>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 20 }}>
            Ensemble, on aide les dirigeants à piloter et développer leur entreprise.
          </h1>
          <p style={{ ...pStyle, fontSize: 18 }}>
            Ton rôle dans l&apos;équipe : ouvrir la discussion avec les dirigeants et leur proposer un échange de
            30 minutes en visio avec un conseiller. L&apos;appel n&apos;est pas une vente, c&apos;est le premier contact.
            Le conseiller prend ensuite le relais pour regarder la situation et présenter les formules.
          </p>
          <p style={{ ...pStyle, fontSize: 18 }}>
            Tu trouveras ici tout ce qu&apos;il faut pour bien présenter NVM Finance : comment on fonctionne, ce
            qu&apos;on apporte aux entreprises, qui contacter et comment amener la discussion.
          </p>

          {/* ── REMUNERATION ── */}
          <p style={eyebrowStyle}>Ta rémunération</p>
          <h2 style={h2Style}>20 % de chaque signature, chaque mois tant que le client reste.</h2>
          <p style={pStyle}>
            Quand un rendez-vous que tu as obtenu devient un client, tu touches 20 % de ce qu&apos;il paie. Sur le
            pilotage mensuel, ce n&apos;est pas un bonus ponctuel : tu touches ta commission tous les mois, tant que le
            client reste.
          </p>

          <div style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
            <div style={{ ...cardStyle, flex: "2 1 380px", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Ton revenu mensuel grandit avec tes clients</span>
                <Tag>Pilotage mensuel</Tag>
              </div>
              <p style={{ fontSize: 12.5, color: C.light, fontWeight: 600, marginBottom: 4 }}>Chaque client signé s&apos;ajoute aux précédents.</p>
              <svg viewBox="0 0 400 140" width="100%" style={{ display: "block", overflow: "visible" }}>
                <circle cx="110" cy="70" r="58" fill={C.green} opacity="0.16" />
                <circle cx="110" cy="70" r="58" fill="none" stroke={C.green} strokeWidth="1.5" opacity="0.4" />
                <circle cx="110" cy="70" r="40" fill={C.green} opacity="0.32" />
                <circle cx="110" cy="70" r="40" fill="none" stroke={C.green} strokeWidth="1.5" opacity="0.55" />
                <circle cx="110" cy="70" r="20" fill={C.green} />
                {[
                  { r: 58, y: 12, t: "10 clients · 980 €/mois" },
                  { r: 40, y: 30, t: "5 clients · 490 €/mois" },
                  { r: 20, y: 54, t: "1 client · 98 €/mois" },
                ].map((ring, i) => (
                  <g key={i}>
                    <circle cx="110" cy={70 - ring.r} r="3" fill={C.green} />
                    <path d={`M110,${70 - ring.r} L210,${ring.y}`} stroke={C.border} strokeWidth="1.5" strokeDasharray="2 4" />
                    <text x="218" y={ring.y + 4} fontSize="13" fontWeight="800" fill={C.text}>{ring.t}</text>
                  </g>
                ))}
              </svg>
            </div>

            <div style={{ flex: "1 1 180px", background: C.primary, borderRadius: 18, boxShadow: "0 16px 36px rgba(0,86,83,.18)", padding: "22px 20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
              {[
                { l: "Pilotage mensuel", v: "98 €/mois" },
                { l: "Audit one shot", v: "600 €" },
                { l: "Tableau de bord gratuit", v: "0 €" },
              ].map((r, i) => (
                <div key={i}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{r.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ ...pStyle, marginTop: 24 }}>
            Si le client arrête son abonnement, ta commission sur ce client s&apos;arrête aussi.
          </p>

          {/* ── CE QU'ON VEND ── */}
          <p style={eyebrowStyle}>Ce qu&apos;on apporte</p>
          <h2 style={h2Style}>NVM Finance en une phrase</h2>
          <Script>
            NVM Finance fait du contrôle de gestion externalisé. On rend les chiffres de l&apos;entreprise visibles, un
            conseiller les analyse chaque mois, puis on actionne les bons leviers pour gagner plus, développer et
            sécuriser l&apos;entreprise.
          </Script>

          <h3 style={h3Style}>1. La visibilité</h3>
          <p style={pStyle}>
            Toutes les données financières de l&apos;entreprise sont regroupées dans un tableau de bord clair. Le dirigeant
            voit enfin où il en est.
          </p>
          <Frame urlLabel="app.nvm-finance.fr · tableau de bord">
            <Tag color={C.primary} bg={C.bg}>Exemple : vue d&apos;ensemble</Tag>
            <div className="st-grid9" style={{ marginTop: 12 }}>
              {statTiles.map((t, i) => (
                <div key={i} style={{ position: "relative", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", background: C.bg }}>
                  <div style={{ position: "absolute", top: 9, right: 9, width: 7, height: 7, borderRadius: "50%", background: statusColor[t.status] }} />
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: C.light, paddingRight: 12 }}>{t.l}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{t.v}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: trendColor[t.trend] }}>{trendArrow[t.trend]}</span>
                  </div>
                </div>
              ))}
            </div>
          </Frame>
          <p style={captionStyle}>Chiffres, courbes, comparatifs, prévisionnel et alertes, au même endroit.</p>

          <h3 style={h3Style}>2. L&apos;analyse</h3>
          <p style={pStyle}>
            Chaque mois, le conseiller analyse la situation, que tout aille bien ou non. Il repère les dérives, anticipe
            les situations critiques et propose des solutions concrètes.
          </p>
          <Frame urlLabel="app.nvm-finance.fr · alertes">
            <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12, borderLeft: `4px solid ${C.red}`, background: C.redBg }}>
              <span style={{ fontSize: 17 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.red }}>Trésorerie prévisionnelle en baisse</div>
                <div style={{ fontSize: 12.5, color: C.mid, marginTop: 2 }}>Le résultat net continue de se dégrader si rien ne change</div>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: "14px 16px", background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.light }}>Solutions proposées par le conseiller</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {["Négociation fournisseurs", "Ajustement des prix", "Automatisation d'une tâche répétitive", "Suppression d'un abonnement inutile"].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: C.text }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: C.green, color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✓</span>
                    {s}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontSize: 13, fontWeight: 800, color: C.green }}>Valeur créée estimée : 9 800 €</div>
            </div>
          </Frame>
          <p style={captionStyle}>Le conseiller cherche la meilleure performance en continu, pas seulement quand il y a un problème.</p>

          <h3 style={h3Style}>3. Les leviers</h3>
          <div className="st-grid3">
            {leviers.map((l, i) => (
              <div key={i} style={{ ...cardStyle, padding: "18px 18px", boxShadow: "none", background: C.bg }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: C.primary, marginBottom: 8 }}>{l.t}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.mid, lineHeight: 1.6 }}>{l.d}</div>
              </div>
            ))}
          </div>

          {/* ── OFFRES ── */}
          <p style={eyebrowStyle}>Les offres</p>
          <h2 style={h2Style}>Trois formules, avec le mensuel en priorité.</h2>
          <div className="st-grid3" style={{ marginTop: 20 }}>
            {offres.map((o, i) => (
              <div key={i} style={{ ...cardStyle, padding: "18px 18px", border: o.best ? `2px solid ${C.primary}` : `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: "0.06em" }}>{o.tag}</span>
                  {o.best && <Tag color="#fff" bg={C.primary}>Recommandé</Tag>}
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>{o.prix}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.mid, lineHeight: 1.6, flex: 1 }}>{o.d}</div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: C.green, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>Ta commission : {o.com}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <Script>Audit : on fait le bilan, le dirigeant applique seul. Mensuel : on fait le bilan, puis on l&apos;accompagne chaque mois pour appliquer les actions.</Script>
          </div>
          <p style={pStyle}>
            Le mensuel fait tout ce que fait l&apos;audit, et en plus le suivi chaque mois. Pour le client, c&apos;est
            l&apos;offre la plus intéressante, et pour toi aussi.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Check><strong style={{ color: C.text }}>Les prix sont présentés en visio</strong> par le conseiller : au téléphone, on reste sur l&apos;intérêt de l&apos;échange.</Check>
            <Check><strong style={{ color: C.text }}>Le choix de la formule se fait aussi en visio.</strong> Ce que le dirigeant exprime (« faire un état des lieux », « être accompagné ») aide beaucoup le conseiller à préparer le rendez-vous.</Check>
          </div>

          {/* ── CIBLAGE ── */}
          <p style={eyebrowStyle}>Qui appeler</p>
          <h2 style={h2Style}>Les secteurs ciblés</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {secteurs.map((s, i) => (
              <span key={i} style={{ fontSize: 13.5, fontWeight: 700, color: C.text, background: C.bg, border: `1px solid ${C.border}`, padding: "7px 14px", borderRadius: 100 }}>{s}</span>
            ))}
          </div>
          <h3 style={h3Style}>Les critères des meilleurs prospects</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Check>Entreprise créée depuis <strong style={{ color: C.text }}>3 ans ou plus</strong>.</Check>
            <Check>Chiffre d&apos;affaires entre <strong style={{ color: C.text }}>20 k€ et 3 M€</strong>.</Check>
            <Check>Un interlocuteur : le <strong style={{ color: C.text }}>dirigeant</strong>.</Check>
            <Check>Une <strong style={{ color: C.text }}>entreprise</strong> (société), pas une auto-entreprise.</Check>
          </div>

          {/* ── SCRIPT ── */}
          <p style={eyebrowStyle}>Le script</p>
          <h2 style={h2Style}>L&apos;appel, étape par étape</h2>

          <h3 style={h3Style}>1. L&apos;accroche</h3>
          <Script>
            « Bonjour [Prénom du dirigeant], [ton prénom], de la société NVM Finance. Vous allez bien ?
            <br />
            Je travaille avec vos confrères sur le pilotage financier de leur entreprise. Ce serait intéressant
            d&apos;en parler avec vous : vous seriez plutôt disponible mardi ou jeudi dans la semaine ? »
          </Script>
          <p style={pStyle}>
            Proposer deux créneaux (« mardi ou jeudi ? ») plutôt que demander « vous auriez un moment ? » facilite la
            réponse : le dirigeant choisit un jour, au lieu de devoir dire oui ou non.
          </p>

          <h3 style={h3Style}>2. La confirmation</h3>
          <Script>
            « Parfait, c&apos;est noté pour [jour] à [heure]. Vous allez recevoir l&apos;invitation par mail. C&apos;est bien
            [adresse mail] ? »
          </Script>

          {/* ── QUESTIONS ── */}
          <p style={eyebrowStyle}>Pendant l&apos;appel</p>
          <h2 style={h2Style}>Les questions fréquentes</h2>
          <Accordion items={faq} />

          <h2 style={{ ...h2Style, marginTop: 40 }}>Les objections</h2>
          <Accordion items={objections} />

          {/* ── APRES ── */}
          <p style={eyebrowStyle}>Après l&apos;appel</p>
          <h2 style={h2Style}>Bien préparer le rendez-vous</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Check><strong style={{ color: C.text }}>Le créneau est réservé dans Calendly</strong> pendant l&apos;appel, avec l&apos;email du dirigeant : il reçoit l&apos;invitation tout de suite, et un rappel la veille.</Check>
            <Check><strong style={{ color: C.text }}>Le fichier de suivi est complété</strong> : nom, entreprise, secteur, chiffre d&apos;affaires approximatif, date du rendez-vous, et ce que le dirigeant a partagé (ses enjeux, ses questions). C&apos;est ce qui permet au conseiller d&apos;arriver préparé.</Check>
            <Check><strong style={{ color: C.text }}>Un rappel est prévu ?</strong> Sa date est notée dans le fichier.</Check>
          </div>

          <div style={{ marginTop: 48, padding: "32px 28px", background: C.bg, borderRadius: 20, textAlign: "center" }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 16 }}>
              Une question sur un prospect ? On en parle.
            </p>
            <a
              href="https://calendly.com/nvmfinance-pro/30min"
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: C.primary, color: "#fff", padding: "14px 32px", borderRadius: 100, fontSize: 15, fontWeight: 800, textDecoration: "none", display: "inline-block", boxShadow: "0 4px 24px rgba(0,86,83,.25)" }}
            >
              Ouvrir le Calendly →
            </a>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.mid, marginTop: 14 }}>nathan@nvm-finance.fr · 07 83 65 76 39</p>
          </div>
        </div>
      </article>

      <footer style={{ background: "#002e2c", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.4)" }}>© 2026 NVM Finance · Document interne</p>
      </footer>
    </div>
  );
}
