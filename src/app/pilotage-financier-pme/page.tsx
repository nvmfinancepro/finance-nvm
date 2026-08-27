import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { LogoSVG } from "@/components/ui/Logo";

const C = { primary: "#005653", green: "#21C45D", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5" };

const title = "Pilotage financier PME : guide complet + comment NVM Finance vous accompagne";
const description =
  "Pilotage financier PME : guide complet sur les indicateurs clés (trésorerie, marge, BFR, EBE), les signaux d'alerte et comment être accompagné au quotidien.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://www.nvm-finance.fr/pilotage-financier-pme",
  },
  openGraph: {
    title,
    description,
    url: "https://www.nvm-finance.fr/pilotage-financier-pme",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Pilotage financier PME : guide complet",
  description,
  author: {
    "@type": "Organization",
    name: "NVM Finance",
    url: "https://www.nvm-finance.fr",
  },
  publisher: {
    "@type": "Organization",
    name: "NVM Finance",
    url: "https://www.nvm-finance.fr",
  },
  mainEntityOfPage: "https://www.nvm-finance.fr/pilotage-financier-pme",
};

const sectionStyle: CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "0 24px" };
const h2Style: CSSProperties = { fontSize: 26, fontWeight: 900, color: C.text, marginTop: 56, marginBottom: 16 };
const pStyle: CSSProperties = { fontSize: 16, lineHeight: 1.75, color: C.mid, marginBottom: 16 };
const liStyle: CSSProperties = { fontSize: 16, lineHeight: 1.75, color: C.mid, marginBottom: 10 };

export default function Page() {
  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", background: "#fff", color: C.text, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "16px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <LogoSVG width={36} />
            <span style={{ fontSize: 15, fontWeight: 900, color: C.primary }}>NVM Finance</span>
          </a>
          <nav style={{ display: "flex", gap: 18 }}>
            <a href="/services" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>Nos offres</a>
            <a href="/on-vous-montre" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>On vous montre</a>
          </nav>
        </div>
      </header>

      <article style={{ padding: "56px 0 96px" }}>
        <div style={sectionStyle}>
          <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Guide</p>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 20 }}>
            Pilotage financier PME : le guide complet
          </h1>
          <p style={{ ...pStyle, fontSize: 18 }}>
            Beaucoup de dirigeants de PME découvrent leur situation financière avec un mois de retard, quand
            l&apos;expert-comptable transmet le bilan. Le pilotage financier PME répond à un besoin différent : avoir,
            chaque mois, une vision claire de la trésorerie, des marges et des risques, pour décider avant que les
            problèmes ne s&apos;installent plutôt qu&apos;après.
          </p>

          <h2 style={h2Style}>Pilotage financier PME : de quoi parle-t-on ?</h2>
          <p style={pStyle}>
            La comptabilité classique a une vocation légale et déclarative : elle produit le bilan, le compte de
            résultat, les déclarations fiscales, en général avec un décalage de plusieurs semaines à plusieurs mois
            sur l&apos;activité réelle de l&apos;entreprise. C&apos;est indispensable, mais ce n&apos;est pas un outil de pilotage.
          </p>
          <p style={pStyle}>
            Le pilotage financier, lui, est tourné vers l&apos;action : suivre les chiffres qui comptent au fil de l&apos;eau,
            comprendre pourquoi ils bougent, et en tirer des décisions concrètes (ajuster un prix, relancer un impayé,
            revoir une charge, anticiper un besoin de trésorerie) avant la clôture de l&apos;exercice. C&apos;est un
            complément au travail du comptable, pas un substitut.
          </p>
          <p style={pStyle}>
            Concrètement, un bilan annuel dit ce qui s&apos;est passé, plusieurs mois après les faits. Un pilotage
            financier mensuel dit ce qui est en train de se passer : une marge qui s&apos;érode sur une gamme de
            produits, un client qui glisse vers un retard de paiement récurrent, une charge qui grimpe plus vite que
            le chiffre d&apos;affaires. Ce sont des signaux exploitables seulement s&apos;ils sont vus à temps.
          </p>

          <h2 style={h2Style}>Les indicateurs clés à suivre chaque mois</h2>
          <p style={pStyle}>
            Un pilotage financier utile ne consiste pas à suivre des dizaines de chiffres, mais à surveiller les bons,
            régulièrement :
          </p>
          <ul style={{ paddingLeft: 20, margin: "0 0 16px" }}>
            <li style={liStyle}><strong style={{ color: C.text }}>La trésorerie</strong> — le solde disponible et son évolution prévisible, pour ne jamais être pris au dépourvu par une échéance.</li>
            <li style={liStyle}><strong style={{ color: C.text }}>La marge</strong> — ce qu&apos;il reste une fois les coûts directs déduits du chiffre d&apos;affaires, produit par produit ou activité par activité.</li>
            <li style={liStyle}><strong style={{ color: C.text }}>Le BFR (besoin en fonds de roulement)</strong> — l&apos;argent immobilisé entre le moment où l&apos;entreprise paie ses charges et celui où elle encaisse ses ventes ; un BFR qui dérive est souvent le premier signe de tension de trésorerie à venir.</li>
            <li style={liStyle}><strong style={{ color: C.text }}>L&apos;EBE (excédent brut d&apos;exploitation)</strong> — la rentabilité générée par l&apos;activité courante, avant amortissements et éléments financiers ou exceptionnels : l&apos;indicateur le plus fiable pour juger si le cœur de métier est rentable.</li>
            <li style={liStyle}><strong style={{ color: C.text }}>La masse salariale</strong> — son poids rapporté au chiffre d&apos;affaires, et son évolution par rapport à la croissance réelle de l&apos;activité.</li>
            <li style={liStyle}><strong style={{ color: C.text }}>Les créances clients et dettes fournisseurs</strong> — les délais de paiement réels, dans les deux sens, qui pèsent directement sur la trésorerie.</li>
          </ul>
          <p style={pStyle}>
            Ce qui change la donne, ce n&apos;est pas la liste des indicateurs — la plupart des dirigeants les
            connaissent déjà de nom — c&apos;est la régularité du suivi. Un même indicateur regardé une fois par an ne
            raconte pas la même histoire que regardé chaque mois, avec sa tendance et son contexte.
          </p>

          <h2 style={h2Style}>Les signes qu&apos;une PME a besoin d&apos;un pilotage financier externalisé</h2>
          <p style={pStyle}>
            Certaines situations reviennent souvent chez les dirigeants qui décident de se faire accompagner :
          </p>
          <ul style={{ paddingLeft: 20, margin: "0 0 16px" }}>
            <li style={liStyle}>Le dirigeant découvre un problème de trésorerie au moment où il devient urgent, pas avant.</li>
            <li style={liStyle}>Personne dans l&apos;entreprise n&apos;a le temps ni la formation pour transformer les chiffres comptables en décisions.</li>
            <li style={liStyle}>Les décisions de prix, d&apos;embauche ou d&apos;investissement se prennent au ressenti, faute de chiffres à jour.</li>
            <li style={liStyle}>Le compte de résultat annuel réserve encore des surprises, bonnes ou mauvaises.</li>
            <li style={liStyle}>L&apos;entreprise grandit, et la gestion financière artisanale (tableur, mémoire du dirigeant) ne suit plus.</li>
          </ul>
          <p style={pStyle}>
            Si plusieurs de ces situations sont familières, un pilotage financier mensuel, externalisé auprès d&apos;un
            conseiller dédié, permet de reprendre la main sans avoir à recruter une fonction finance en interne.
          </p>

          <h2 style={h2Style}>À partir de quelle taille d&apos;entreprise se lancer ?</h2>
          <p style={pStyle}>
            Il n&apos;y a pas de seuil de chiffre d&apos;affaires ou d&apos;effectif à partir duquel le pilotage financier
            devient pertinent — la question à se poser est plutôt celle de la complexité. Dès qu&apos;une PME gère
            plusieurs sources de revenus, des délais de paiement clients et fournisseurs qui ne coïncident pas, une
            masse salariale qui pèse significativement dans les charges, ou un projet d&apos;investissement ou
            d&apos;emprunt à venir, suivre ces éléments au fil de l&apos;eau devient plus utile qu&apos;une revue annuelle. À
            l&apos;inverse, recruter un directeur financier à temps plein n&apos;a souvent de sens qu&apos;à partir d&apos;une
            taille bien supérieure — d&apos;où l&apos;intérêt d&apos;un pilotage financier externalisé entre les deux : plus
            structuré qu&apos;un suivi artisanal, sans le coût fixe d&apos;un recrutement.
          </p>

          <h2 style={h2Style}>Comment NVM Finance vous accompagne</h2>
          <p style={pStyle}>
            C&apos;est exactement ce que couvre notre <a href="/services" style={{ color: C.primary, fontWeight: 700 }}>offre de pilotage financier</a> :
            un conseiller dédié analyse chaque mois votre trésorerie, vos marges, votre masse salariale, vos créances
            et dettes, et vous alerte sur les risques (TVA, IS, emprunts, investissements), dans un tableau de bord
            complet mis en place en 48h et sans engagement. Vous repartez avec des recommandations d&apos;optimisation
            concrètes et un prévisionnel actualisé, pas seulement des chiffres.
          </p>
          <p style={pStyle}>
            Nous concevons aussi des outils de gestion pour PME dans ce même tableau de bord — planning d&apos;équipe,
            gestion des tâches, suivi des congés et du stock, automatisation de vos process opérationnels — pour que
            le pilotage financier et l&apos;opérationnel du quotidien vivent au même endroit. Vous pouvez découvrir la
            <a href="/" style={{ color: C.primary, fontWeight: 700 }}> démarche complète sur notre page d&apos;accueil</a>.
          </p>

          <div style={{ marginTop: 48, padding: "32px 28px", background: C.bg, borderRadius: 20, textAlign: "center" }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 16 }}>
              Envie d&apos;y voir clair sur vos finances chaque mois ?
            </p>
            <a
              href="https://calendly.com/nvmfinance-pro/30min"
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: C.primary, color: "#fff", padding: "14px 32px", borderRadius: 100, fontSize: 15, fontWeight: 800, textDecoration: "none", display: "inline-block", boxShadow: "0 4px 24px rgba(0,86,83,.25)" }}
            >
              Demander une analyse gratuite
            </a>
          </div>
        </div>
      </article>

      <footer style={{ background: "#002e2c", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.4)" }}>
          © 2026 NVM Finance · <a href="/" style={{ color: "rgba(255,255,255,.4)" }}>Accueil</a> · <a href="/services" style={{ color: "rgba(255,255,255,.4)" }}>Nos offres</a>
        </p>
      </footer>
    </div>
  );
}
