import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { LogoSVG } from "@/components/ui/Logo";
import { getPostBySlug } from "@/lib/blog";

export const revalidate = 60;

const C = { primary: "#005653", green: "#21C45D", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5" };

const sectionStyle: CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "0 24px" };
const pStyle: CSSProperties = { fontSize: 16, lineHeight: 1.75, color: C.mid, marginBottom: 16 };

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const url = `https://www.nvm-finance.fr/blog/${post.slug}`;
  return {
    title: `${post.title} | Blog NVM Finance`,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: { title: post.title, description: post.excerpt, url, type: "article" },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Convention de rédaction (voir /api/blog/generate) : "**Titre**" sur sa propre ligne = sous-titre,
// "- " en début de ligne = puce, ligne vide = saut de paragraphe.
function renderBody(body: string) {
  const lines = body.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={key} style={{ paddingLeft: 20, margin: "0 0 16px" }}>
        {listBuffer.map((item, i) => (
          <li key={i} style={{ ...pStyle, marginBottom: 8 }}>{item}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (/^\*\*.+\*\*$/.test(trimmed)) {
      flushList(`ul-${i}`);
      blocks.push(
        <h2 key={i} style={{ fontSize: 24, fontWeight: 900, color: C.text, marginTop: 40, marginBottom: 14 }}>
          {trimmed.replace(/\*\*/g, "")}
        </h2>
      );
    } else if (trimmed.startsWith("- ")) {
      listBuffer.push(trimmed.slice(2));
    } else if (trimmed) {
      flushList(`ul-${i}`);
      blocks.push(<p key={i} style={pStyle}>{trimmed}</p>);
    }
  });
  flushList("ul-end");
  return blocks;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    author: { "@type": "Organization", name: "NVM Finance", url: "https://www.nvm-finance.fr" },
    publisher: { "@type": "Organization", name: "NVM Finance", url: "https://www.nvm-finance.fr" },
    mainEntityOfPage: `https://www.nvm-finance.fr/blog/${post.slug}`,
  };

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
            <a href="/blog" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>Blog</a>
            <a href="/services" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>Nos offres</a>
          </nav>
        </div>
      </header>

      <article style={{ padding: "56px 0 96px" }}>
        <div style={sectionStyle}>
          {post.theme && (
            <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              {post.theme}
            </p>
          )}
          <h1 style={{ fontSize: 38, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 14 }}>{post.title}</h1>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.light, marginBottom: 32 }}>
            {post.author} · {formatDate(post.published_at)}
          </div>

          {renderBody(post.body)}

          <div style={{ marginTop: 48, padding: "32px 28px", background: C.bg, borderRadius: 20, textAlign: "center" }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 16 }}>
              Envie de reprendre la main sur votre gestion ?
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

          <div style={{ marginTop: 32 }}>
            <a href="/blog" style={{ fontSize: 14, fontWeight: 700, color: C.primary, textDecoration: "none" }}>← Tous les articles</a>
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
