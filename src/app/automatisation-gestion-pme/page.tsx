import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { LogoSVG } from "@/components/ui/Logo";

const C = { primary: "#005653", green: "#21C45D", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5" };

const title = "Automatisation de la gestion PME : guide + solutions NVM Finance";
const description =
  "Automatisation gestion PME : guide pour réduire les tâches manuelles chronophages, gagner du temps sur l'opérationnel et le confier à des outils sur mesure.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://www.nvm-finance.fr/automatisation-gestion-pme",
  },
  openGraph: {
    title,
    description,
    url: "https://www.nvm-finance.fr/automatisation-gestion-pme",
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
  headline: "Automatisation de la gestion PME : guide complet",
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
  mainEntityOfPage: "https://www.nvm-finance.fr/automatisation-gestion-pme",
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
            Automatisation de la gestion PME : le guide complet
          </h1>
          <p style={{ ...pStyle, fontSize: 18 }}>
            Dans beaucoup de PME, une partie du temps du dirigeant et de l&apos;équipe part dans des tâches
            d&apos;organisation qui n&apos;ont, en elles-mêmes, aucune valeur ajoutée : ressaisir la même information à
            deux endroits, relancer un collègue pour savoir où en est un dossier, reconstituer à la main un planning
            ou un suivi de stock. L&apos;automatisation de la gestion PME consiste à confier ce travail répétitif à un
            outil, pour recentrer le temps humain sur ce qui rapporte vraiment.
          </p>

          <h2 style={h2Style}>Automatisation de la gestion PME : de quoi parle-t-on ?</h2>
          <p style={pStyle}>
            Automatiser la gestion, ce n&apos;est pas remplacer une équipe par un logiciel compliqué. C&apos;est faire en
            sorte qu&apos;une information saisie une fois circule automatiquement là où elle est utile, qu&apos;un process
            qui se répète chaque semaine ne demande plus de refaire les mêmes clics, et que chacun sache, sans avoir à
            demander, où en est ce qui le concerne. L&apos;objectif n&apos;est pas la technologie pour elle-même, mais le
            temps qu&apos;elle libère.
          </p>
          <p style={pStyle}>
            Contrairement à une idée reçue, ce n&apos;est pas réservé aux grandes structures avec un service
            informatique. Une PME de quelques salariés a souvent plus à gagner qu&apos;un grand groupe à automatiser
            son organisation interne : elle n&apos;a pas le volant humain nécessaire pour absorber la charge
            administrative sans que cela ne se voie sur son activité principale.
          </p>
          <p style={pStyle}>
            Concrètement, cela veut dire qu&apos;un changement de dernière minute dans un planning ne demande plus de
            reprendre un fichier partagé et de prévenir chacun individuellement, qu&apos;un niveau de stock qui passe
            sous un seuil se voit sans avoir à aller vérifier physiquement, et qu&apos;un nouveau dossier suit
            automatiquement les mêmes étapes que le précédent, sans qu&apos;il faille s&apos;en souvenir à chaque fois.
          </p>

          <h2 style={h2Style}>Les tâches de gestion les plus chronophages à automatiser</h2>
          <p style={pStyle}>
            Certaines catégories de tâches reviennent, quel que soit le secteur d&apos;activité :
          </p>
          <ul style={{ paddingLeft: 20, margin: "0 0 16px" }}>
            <li style={liStyle}><strong style={{ color: C.text }}>L&apos;organisation d&apos;équipe</strong> — répartir les personnes sur les créneaux ou les missions, gérer les absences et les remplacements, sans reconstituer un tableau à chaque imprévu.</li>
            <li style={liStyle}><strong style={{ color: C.text }}>Le suivi d&apos;activité</strong> — savoir, à tout moment, où en est un dossier, une commande ou une intervention, sans avoir à interroger la personne qui s&apos;en occupe.</li>
            <li style={liStyle}><strong style={{ color: C.text }}>Les process répétitifs</strong> — les étapes qui reviennent à l&apos;identique à chaque nouveau client, chaque nouvelle recrue ou chaque nouvelle commande, et qui gagnent à être suivies via une trame plutôt que réinventées à chaque fois.</li>
            <li style={liStyle}><strong style={{ color: C.text }}>La remontée d&apos;information</strong> — centraliser ce qui circule aujourd&apos;hui par messages, appels ou tableurs épars, pour que l&apos;information existe à un seul endroit fiable.</li>
          </ul>
          <p style={pStyle}>
            Prises une par une, ces tâches semblent mineures. Additionnées sur une semaine, puis sur une année, elles
            représentent souvent un temps considérable — du temps qui n&apos;est disponible ni pour développer
            l&apos;activité, ni pour se consacrer aux clients.
          </p>

          <h2 style={h2Style}>Automatiser sans perdre en visibilité</h2>
          <p style={pStyle}>
            La crainte la plus fréquente chez les dirigeants de PME n&apos;est pas technique, elle est humaine : peur de
            perdre le contrôle en confiant l&apos;organisation à un outil, ou de complexifier ce qui fonctionnait tant
            bien que mal avec un tableur. En pratique, c&apos;est l&apos;inverse qui se produit le plus souvent. Un outil
            bien pensé rend l&apos;information plus visible qu&apos;avant, pas moins : le dirigeant voit l&apos;ensemble de
            l&apos;activité en un coup d&apos;œil, là où un suivi manuel dépend de ce que chacun pense à remonter. Le bon
            réflexe n&apos;est pas de tout automatiser d&apos;un coup, mais de commencer par la tâche qui coûte le plus de
            temps aujourd&apos;hui, et d&apos;élargir ensuite.
          </p>

          <h2 style={h2Style}>Les signes qu&apos;une PME perd du temps sur des tâches qui devraient être automatisées</h2>
          <p style={pStyle}>
            Quelques situations reviennent souvent chez les dirigeants qui décident d&apos;automatiser leur gestion :
          </p>
          <ul style={{ paddingLeft: 20, margin: "0 0 16px" }}>
            <li style={liStyle}>La même information est ressaisie à plusieurs endroits (tableur, messagerie, papier).</li>
            <li style={liStyle}>Une bonne partie des échanges internes sert uniquement à demander « où ça en est ».</li>
            <li style={liStyle}>Un planning ou un suivi de stock repose sur la mémoire d&apos;une seule personne.</li>
            <li style={liStyle}>Les mêmes erreurs ou oublis reviennent, faute d&apos;un process suivi de façon identique à chaque fois.</li>
            <li style={liStyle}>Le dirigeant passe plus de temps à organiser le travail qu&apos;à le faire avancer.</li>
          </ul>
          <p style={pStyle}>
            Si plusieurs de ces situations parlent, l&apos;enjeu n&apos;est pas de travailler plus, mais de retirer de la
            liste ce qui peut tourner seul.
          </p>

          <h2 style={h2Style}>Comment NVM Finance vous accompagne</h2>
          <p style={pStyle}>
            C&apos;est le second volet de <a href="/services" style={{ color: C.primary, fontWeight: 700 }}>nos offres</a> :
            des outils de gestion sur mesure — planning d&apos;équipe, gestion des tâches, suivi des congés et du
            stock — conçus pour automatiser vos process opérationnels et centraliser ce qui, aujourd&apos;hui, est
            dispersé entre plusieurs outils ou dans la tête d&apos;une seule personne. Le détail des formules et des
            tarifs est disponible sur la <a href="/services" style={{ color: C.primary, fontWeight: 700 }}>page Nos offres</a>,
            avec une mise en place rapide et sans engagement.
          </p>
          <p style={pStyle}>
            Ces outils vivent dans le même tableau de bord que notre{" "}
            <a href="/pilotage-financier-pme" style={{ color: C.primary, fontWeight: 700 }}>pilotage financier PME</a>{" "}
            : vous retrouvez au même endroit le suivi de votre activité opérationnelle et l&apos;analyse mensuelle de
            vos finances, plutôt que de jongler entre plusieurs solutions qui ne se parlent pas. Les deux volets se
            complètent, mais chacun peut aussi être mis en place indépendamment selon votre besoin du moment.
          </p>

          <div style={{ marginTop: 48, padding: "32px 28px", background: C.bg, borderRadius: 20, textAlign: "center" }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 16 }}>
              Envie de reprendre la main sur votre organisation ?
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
