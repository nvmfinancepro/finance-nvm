import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { LogoSVG } from "@/components/ui/Logo";
import WhatsAppWidget from "@/components/WhatsAppWidget";

const C = { primary: "#005653", green: "#21C45D", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5" };

const title = "Automatisation de la gestion PME : réduire vos coûts | NVM Finance";
const description =
  "Automatisation gestion PME : ce que coûtent vraiment vos tâches répétitives, lesquelles automatiser en priorité, et comment l'analyse financière repère les économies possibles.";

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
  headline: "Automatisation de la gestion PME : un levier pour réduire vos coûts",
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
      <WhatsAppWidget/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "16px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <LogoSVG width={36} />
            <span style={{ fontSize: 15, fontWeight: 900, color: C.primary }}>NVM Finance</span>
          </a>
          <nav style={{ display: "flex", gap: 18 }}>
            <a href="/blog" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>Blog</a>
            <a href="/services" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>Nos offres</a>
            <a href="/on-vous-montre" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>On vous montre</a>
            <a href="/diagnostic" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>Simulateur</a>
          </nav>
        </div>
      </header>

      <article style={{ padding: "56px 0 96px" }}>
        <div style={sectionStyle}>
          <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Guide</p>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 20 }}>
            Automatisation de la gestion PME : un levier pour réduire vos coûts
          </h1>
          <p style={{ ...pStyle, fontSize: 18 }}>
            Dans beaucoup de PME, une partie du temps du dirigeant et de l&apos;équipe part dans des tâches
            répétitives : ressaisir la même information à deux endroits, relancer un collègue pour savoir où en est
            un dossier, reconstituer à la main un planning ou un suivi de stock. Ce temps a un coût, souvent invisible
            parce qu&apos;il est noyé dans la masse salariale. Automatiser une partie de ces tâches est l&apos;une des
            solutions pour le réduire, et recentrer l&apos;équipe sur ce qui rapporte vraiment.
          </p>

          <h2 style={h2Style}>Ce que coûte vraiment une tâche répétitive</h2>
          <p style={pStyle}>
            Une tâche de gestion ne se paie pas sur facture : elle se paie en heures de salaire. Prenons un exemple
            simple : 3 heures par semaine passées à ressaisir des commandes ou à refaire un planning, pour un coût
            horaire chargé de 35 €. Sur 46 semaines travaillées, cela représente près de 140 heures et{" "}
            <strong style={{ color: C.text }}>environ 4 800 € par an</strong>, pour une seule tâche et une seule
            personne.
          </p>
          <p style={pStyle}>
            Ce montant n&apos;apparaît nulle part en tant que tel dans les comptes. C&apos;est justement pour cela
            qu&apos;il mérite d&apos;être chiffré : une fois qu&apos;on le voit, on peut comparer ce que coûte la
            tâche aujourd&apos;hui et ce que coûterait la solution qui la prend en charge.
          </p>

          <h2 style={h2Style}>Automatisation de la gestion PME : de quoi parle-t-on ?</h2>
          <p style={pStyle}>
            Automatiser la gestion, ce n&apos;est pas remplacer une équipe par un logiciel compliqué. C&apos;est faire en
            sorte qu&apos;une information saisie une fois circule automatiquement là où elle est utile, qu&apos;un process
            qui se répète chaque semaine ne demande plus de refaire les mêmes clics, et que chacun sache, sans avoir à
            demander, où en est ce qui le concerne. L&apos;objectif n&apos;est pas la technologie pour elle-même, mais le
            coût qu&apos;elle évite.
          </p>
          <p style={pStyle}>
            Contrairement à une idée reçue, ce n&apos;est pas réservé aux grandes structures avec un service
            informatique. Une PME de quelques salariés a souvent plus à gagner qu&apos;un grand groupe à automatiser
            son organisation interne : elle n&apos;a pas le volant humain nécessaire pour absorber la charge
            administrative sans que cela ne se voie sur son activité principale.
          </p>

          <h2 style={h2Style}>Les tâches de gestion qui coûtent le plus cher</h2>
          <p style={pStyle}>
            Certaines catégories de tâches reviennent, quel que soit le secteur d&apos;activité :
          </p>
          <ul style={{ paddingLeft: 20, margin: "0 0 16px" }}>
            <li style={liStyle}><strong style={{ color: C.text }}>L&apos;organisation d&apos;équipe</strong> : répartir les personnes sur les créneaux ou les missions, gérer les absences et les remplacements, sans reconstituer un tableau à chaque imprévu.</li>
            <li style={liStyle}><strong style={{ color: C.text }}>Le suivi d&apos;activité</strong> : savoir, à tout moment, où en est un dossier, une commande ou une intervention, sans avoir à interroger la personne qui s&apos;en occupe.</li>
            <li style={liStyle}><strong style={{ color: C.text }}>Les process répétitifs</strong> : les étapes qui reviennent à l&apos;identique à chaque nouveau client, chaque nouvelle recrue ou chaque nouvelle commande, et qui gagnent à être suivies via une trame plutôt que réinventées à chaque fois.</li>
            <li style={liStyle}><strong style={{ color: C.text }}>La remontée d&apos;information</strong> : centraliser ce qui circule aujourd&apos;hui par messages, appels ou tableurs épars, pour que l&apos;information existe à un seul endroit fiable.</li>
          </ul>
          <p style={pStyle}>
            Prises une par une, ces tâches semblent mineures. Additionnées sur une année, elles représentent souvent
            plusieurs milliers d&apos;euros de temps payé qui ne sert ni à développer l&apos;activité, ni à servir les
            clients.
          </p>

          <h2 style={h2Style}>Par où commencer</h2>
          <p style={pStyle}>
            Le bon réflexe n&apos;est pas de tout automatiser d&apos;un coup, mais de commencer par la tâche qui coûte
            le plus cher aujourd&apos;hui, et d&apos;élargir ensuite. Quelques signes permettent de la repérer :
          </p>
          <ul style={{ paddingLeft: 20, margin: "0 0 16px" }}>
            <li style={liStyle}>La même information est ressaisie à plusieurs endroits (tableur, messagerie, papier).</li>
            <li style={liStyle}>Une bonne partie des échanges internes sert uniquement à demander « où ça en est ».</li>
            <li style={liStyle}>Un planning ou un suivi de stock repose sur la mémoire d&apos;une seule personne.</li>
            <li style={liStyle}>Les mêmes erreurs ou oublis reviennent, faute d&apos;un process suivi de façon identique à chaque fois.</li>
            <li style={liStyle}>Le dirigeant passe plus de temps à organiser le travail qu&apos;à le faire avancer.</li>
          </ul>
          <p style={pStyle}>
            Si plusieurs de ces situations parlent, l&apos;enjeu n&apos;est pas de travailler plus, mais de chiffrer
            ce que ces tâches coûtent et de traiter en priorité celles qui pèsent le plus.
          </p>

          <h2 style={h2Style}>Comment NVM Finance vous accompagne</h2>
          <p style={pStyle}>
            Notre métier, c&apos;est le <a href="/pilotage-financier-pme" style={{ color: C.primary, fontWeight: 700 }}>pilotage financier</a> :
            on vous apporte la visibilité sur vos chiffres, un conseiller les analyse chaque mois, et on cherche
            ensemble ce qui améliore la performance de l&apos;entreprise, la sécurise et la développe.
          </p>
          <p style={pStyle}>
            Quand l&apos;analyse montre qu&apos;une tâche répétitive coûte trop cher, l&apos;automatiser fait partie
            des solutions qu&apos;on vous propose, au même titre qu&apos;une renégociation fournisseur, un ajustement
            de prix ou un abonnement inutile supprimé. On chiffre l&apos;économie avant, on mesure le gain après. Le
            détail de l&apos;accompagnement est sur la <a href="/services" style={{ color: C.primary, fontWeight: 700 }}>page Nos offres</a>,
            sans engagement.
          </p>

          <div style={{ marginTop: 48, padding: "32px 28px", background: C.bg, borderRadius: 20, textAlign: "center" }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 16 }}>
              Envie de savoir où votre entreprise peut gagner ?
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
