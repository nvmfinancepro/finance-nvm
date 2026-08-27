"use client";
import { useEffect, useState, useRef } from "react";

const P = "#005653";
const G = "#21C45D";

interface Review {
  author: string;
  avatar: string | null;
  rating: number;
  text: string;
  date: string;
}
interface ReviewsData {
  rating: number;
  total: number;
  reviews: Review[];
}

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 16 16">
          <polygon
            points="8,1 10.2,6 15.5,6.5 11.5,10 12.8,15.3 8,12.3 3.2,15.3 4.5,10 0.5,6.5 5.8,6"
            fill={i <= Math.round(n) ? "#FBBF24" : "#e5e7eb"}
            stroke="none"
          />
        </svg>
      ))}
    </span>
  );
}

function Avatar({ src, name, size = 36 }: { src: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (!src || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg, ${P}, #00706c)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35, fontWeight: 900, color: "#fff", flexShrink: 0,
      }}>{initials}</div>
    );
  }
  // Les URLs Google Places incluent un suffixe de taille (=s128-c...) pensé pour un usage
  // générique ; on le réécrit à ~2x la taille d'affichage réelle (36px/28px ici) au lieu
  // des 128px par défaut, pour éviter de télécharger une image bien plus grande que nécessaire.
  const sized = src.replace(/=s\d+-/, `=s${size * 2}-`);
  return (
    <img src={sized} alt={name} width={size} height={size} loading="lazy" onError={() => setErr(true)}
      style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  );
}

/* ── Section homepage ─────────────────────────────────────── */
export function ReviewsSection({ data }: { data: ReviewsData | null }) {
  if (!data || data.reviews.length === 0) return null;

  return (
    <section style={{ background: "#fff", padding: "72px 48px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <GoogleLogo size={22} />
            <span style={{ fontSize: 13, fontWeight: 800, color: P, textTransform: "uppercase", letterSpacing: ".1em" }}>
              Avis Google
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 52, fontWeight: 900, color: P, lineHeight: 1 }}>
              {data.rating.toFixed(1)}
            </span>
            <div>
              <Stars n={data.rating} size={20} />
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6aaca8", marginTop: 4 }}>
                {data.total} avis vérifiés
              </div>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 20,
        }}>
          {data.reviews.map((r, i) => (
            <ReviewCard key={i} r={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ r }: { r: Review }) {
  const [expanded, setExpanded] = useState(false);
  const text = r.text;
  const short = text.length > 160;

  return (
    <div style={{
      background: "#fafffe",
      border: "1.5px solid #e0f2f0",
      borderRadius: 16,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar src={r.avatar} name={r.author} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#002e2c" }}>{r.author}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6aaca8" }}>{r.date}</div>
        </div>
        <Stars n={r.rating} size={12} />
      </div>
      {text && (
        <p style={{ fontSize: 13, fontWeight: 600, color: "#3d6e6b", lineHeight: 1.6, margin: 0 }}>
          {expanded || !short ? text : text.slice(0, 160) + "…"}
          {short && (
            <button onClick={() => setExpanded(e => !e)}
              style={{ background: "none", border: "none", color: P, fontWeight: 800, fontSize: 12, cursor: "pointer", marginLeft: 4, padding: 0 }}>
              {expanded ? " Voir moins" : " Voir plus"}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

/* ── Widget flottant ──────────────────────────────────────── */
export function ReviewsWidget({ data }: { data: ReviewsData | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!data) return null;

  return (
    <div ref={ref} style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10,
    }}>

      {/* Panneau déroulant */}
      {open && (
        <div style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 24px 80px rgba(0,86,83,.18), 0 0 0 1px rgba(0,86,83,.08)",
          width: 320,
          maxHeight: 420,
          overflowY: "auto",
          padding: "18px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <GoogleLogo size={18} />
            <span style={{ fontSize: 12, fontWeight: 900, color: P }}>Avis Google</span>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#6aaca8" }}>
              {data.rating.toFixed(1)} · {data.total} avis
            </span>
          </div>
          <div style={{ height: 1, background: "#e0f2f0" }} />
          {data.reviews.map((r, i) => (
            <MiniReviewCard key={i} r={r} />
          ))}
          <a
            href={`https://www.google.com/maps/search/NVM+Finance`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "block", textAlign: "center", fontSize: 11, fontWeight: 800,
              color: P, background: "#ecfdf5", borderRadius: 10, padding: "10px",
              textDecoration: "none", marginTop: 4,
            }}>
            Voir tous les avis →
          </a>
        </div>
      )}

      {/* Bouton flottant */}
      <button onClick={() => setOpen(o => !o)} style={{
        background: "#fff",
        border: "none",
        borderRadius: 50,
        padding: "10px 16px",
        boxShadow: "0 8px 32px rgba(0,86,83,.18), 0 0 0 1.5px rgba(0,86,83,.1)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "transform .15s, box-shadow .15s",
      }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        <GoogleLogo size={18} />
        <Stars n={data.rating} size={13} />
        <span style={{ fontSize: 13, fontWeight: 900, color: P }}>{data.rating.toFixed(1)}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#6aaca8" }}>({data.total})</span>
      </button>
    </div>
  );
}

function MiniReviewCard({ r }: { r: Review }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Avatar src={r.avatar} name={r.author} size={28} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#002e2c" }}>{r.author}</div>
          <Stars n={r.rating} size={10} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af" }}>{r.date}</span>
      </div>
      {r.text && (
        <p style={{ fontSize: 11, fontWeight: 600, color: "#3d6e6b", lineHeight: 1.5, margin: 0 }}>
          {r.text.length > 120 ? r.text.slice(0, 120) + "…" : r.text}
        </p>
      )}
      <div style={{ height: 1, background: "#f0f9f7" }} />
    </div>
  );
}

/* ── Google logo SVG ─────────────────────────────────────── */
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.9 0 20.4-7.9 20.4-21 0-1.4-.1-2.7-.4-4z"/>
      <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.9 0-14.7 4.6-17.7 11.7z"/>
      <path fill="#FBBC05" d="M24 45c5.8 0 10.8-1.9 14.5-5.2l-6.7-5.5C29.8 35.9 27 37 24 37c-5.8 0-10.7-3.7-12.5-8.9l-7 5.4C7.6 40.6 15.2 45 24 45z"/>
      <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.6-2.5 4.8-4.7 6.3l6.7 5.5C41.7 37.1 44.5 31 44.5 24c0-1.4-.1-2.7-.4-4z"/>
    </svg>
  );
}
