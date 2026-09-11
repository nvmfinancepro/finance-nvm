import type { Metadata } from "next";
import { LogoSVG } from "@/components/ui/Logo";
import { getPublishedPosts } from "@/lib/blog";

export const revalidate = 60;

const C = { primary: "#005653", green: "#21C45D", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5" };

const title = "Blog | Gestion et pilotage financier PME — NVM Finance";
const description =
  "Trésorerie, comptabilité, pilotage financier et automatisation de la gestion : conseils pratiques pour dirigeants de TPE/PME.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://www.nvm-finance.fr/blog",
  },
  openGraph: {
    title,
    description,
    url: "https://www.nvm-finance.fr/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function Page() {
  const posts = await getPublishedPosts();

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", background: "#fff", color: C.text, minHeight: "100vh" }}>
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

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 96px" }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Blog</p>
        <h1 style={{ fontSize: 38, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 20 }}>
          Gestion et pilotage financier des PME
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.75, color: C.mid, marginBottom: 44 }}>
          Trésorerie, comptabilité, pilotage financier, automatisation : des articles pratiques pour dirigeants de
          TPE/PME, sans jargon.
        </p>

        {posts.length === 0 ? (
          <p style={{ fontSize: 15, color: C.mid }}>Aucun article publié pour l&apos;instant. Revenez bientôt.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {posts.map((p) => (
              <a
                key={p.id}
                href={`/blog/${p.slug}`}
                style={{ display: "block", padding: "24px 26px", background: C.bg, borderRadius: 16, textDecoration: "none", color: "inherit" }}
              >
                {p.theme && (
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    {p.theme}
                  </div>
                )}
                <div style={{ fontSize: 21, fontWeight: 900, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>{p.title}</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: C.mid, marginBottom: 10 }}>{p.excerpt}</p>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.light }}>{formatDate(p.published_at)}</div>
              </a>
            ))}
          </div>
        )}
      </div>

      <footer style={{ background: "#002e2c", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.4)" }}>
          © 2026 NVM Finance · <a href="/" style={{ color: "rgba(255,255,255,.4)" }}>Accueil</a> · <a href="/services" style={{ color: "rgba(255,255,255,.4)" }}>Nos offres</a>
        </p>
      </footer>
    </div>
  );
}
