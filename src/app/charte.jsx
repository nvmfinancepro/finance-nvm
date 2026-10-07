"use client";
// Charte graphique de l'application (espace client, admin, cabinet) : couleurs,
// formats et composants de base partagés par NVMFinance.jsx et les vues de pilotage.
import { useState, useRef, useEffect } from "react";

export const C = {
 primary:"#005653", primaryDark:"#003d3a", primaryLight:"#00706c",
 bg:"#ecfdf5", bgLight:"#f0faf8", white:"#ffffff",
 border:"#a7d4d0", borderLight:"#c8e8e5",
 text:"#002e2c", textMid:"#2d6b68", textLight:"#6aaca8",
 green:"#059669", orange:"#d97706", red:"#dc2626",
 greenBg:"#ecfdf5", orangeBg:"#fffbeb", redBg:"#fef2f2",
};

export const fmt = (n) => { if(n===null||n===undefined||isNaN(n)) return "—"; const abs=Math.abs(n); const s=abs>=1e6?(abs/1e6).toFixed(2).replace(".",",")+" M€":new Intl.NumberFormat("fr-FR").format(Math.round(abs))+" €"; return n<0?"–"+s:s; };
export const pct = (n) => (n==null||isNaN(n))?"—":`${Number(n).toFixed(1)} %`;

// Petite pastille « i » : l'explication s'affiche au clic, l'écran reste épuré.
export function Info({ children, droite = false, clair = false }) {
 const [open, setOpen] = useState(false);
 const ref = useRef(null);
 useEffect(() => {
  if (!open) return;
  const dehors = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
  const echap = (e) => { if (e.key === "Escape") setOpen(false); };
  document.addEventListener("mousedown", dehors);
  document.addEventListener("keydown", echap);
  return () => { document.removeEventListener("mousedown", dehors); document.removeEventListener("keydown", echap); };
 }, [open]);
 if (!children) return null;
 return (
  <span ref={ref} className="no-print" onClick={(e) => e.stopPropagation()} style={{ position:"relative", display:"inline-flex", verticalAlign:"middle", marginLeft:6, textTransform:"none", letterSpacing:0, fontWeight:600 }}>
   <button type="button" aria-label="Explication" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
    style={{ width:17, height:17, borderRadius:"50%", border:`1.5px solid ${clair ? "rgba(255,255,255,.6)" : C.border}`, background:open ? (clair ? "white" : C.primary) : "transparent", color:open ? (clair ? C.primary : "white") : clair ? "white" : C.textMid, fontSize:10.5, fontWeight:900, fontFamily:"Georgia,serif", fontStyle:"italic", lineHeight:1, cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center", padding:0 }}>i</button>
   {open && (
    <span role="tooltip" style={{ position:"absolute", top:"calc(100% + 8px)", ...(droite ? { right:-6 } : { left:-6 }), zIndex:60, width:"min(290px, 80vw)", background:C.primaryDark, color:"white", fontSize:12.5, fontWeight:600, lineHeight:1.55, padding:"10px 13px", borderRadius:11, boxShadow:"0 12px 28px rgba(0,0,0,.22)", textAlign:"left", whiteSpace:"normal" }}>{children}</span>
   )}
  </span>
 );
}

// COMPOSANTS DE BASE
export const Btn = ({ children, onClick, variant="primary", small, style={}, disabled }) => {
 const s = { primary:{background:C.primary,color:C.white,border:"none",boxShadow:"0 4px 14px rgba(0,86,83,.22)"}, ghost:{background:C.white,color:C.primary,border:`1.5px solid ${C.border}`}, danger:{background:C.red,color:C.white,border:"none",boxShadow:"0 4px 14px rgba(220,38,38,.2)"}, success:{background:C.green,color:C.white,border:"none",boxShadow:"0 4px 14px rgba(5,150,105,.22)"}, orange:{background:C.orange,color:C.white,border:"none",boxShadow:"0 4px 14px rgba(217,119,6,.22)"} };
 return <button onClick={onClick} disabled={disabled} style={{...s[variant],padding:small?"6px 14px":"10px 20px",borderRadius:100,fontSize:small?12:13,fontWeight:800,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all .15s",display:"inline-flex",alignItems:"center",gap:6,...style}}>{children}</button>;
};
export const Pill = ({ children, color=C.primary, bg }) => <span style={{background:bg||color+"18",color,border:`1px solid ${color}33`,borderRadius:100,padding:"3px 11px",fontSize:11,fontWeight:800,whiteSpace:"nowrap",display:"inline-block"}}>{children}</span>;
// Indicateur chiffré (même style que les tuiles des vues de pilotage).
export const KpiCard = ({ label, value, sub, color=C.primary, info }) => (
 <div style={{background:C.white,border:`1.5px solid ${C.text}`,borderRadius:20,padding:"16px 18px",boxShadow:"0 16px 36px rgba(0,86,83,.06)",display:"flex",flexDirection:"column",gap:5,minWidth:0}}>
 <div style={{fontSize:11,color:C.textMid,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",display:"flex",alignItems:"center"}}>{label}<Info>{info}</Info></div>
 <div style={{fontSize:23,fontWeight:900,color:C.text,lineHeight:1.15}}>{value}</div>
 {sub&&<div style={{fontSize:12.5,color:color===C.primary?C.textMid:color,fontWeight:700}}>{sub}</div>}
 </div>
);
export const Card = ({ children, style={} }) => <div style={{background:C.white,border:`1.5px solid ${C.text}`,borderRadius:20,boxShadow:"0 16px 36px rgba(0,86,83,.06)",overflow:"hidden",...style}}>{children}</div>;
export const SectionHead = ({ title, sub, action, info }) => (
 <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:"16px 20px",borderBottom:`1px solid ${C.borderLight}`}}>
 <div><div style={{fontSize:15,fontWeight:900,color:C.text,display:"flex",alignItems:"center"}}>{title}<Info>{info}</Info></div>{sub&&<div style={{fontSize:12,color:C.textLight,fontWeight:600,marginTop:2}}>{sub}</div>}</div>
 {action&&<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{action}</div>}
 </div>
);
export const Th = ({ children, right }) => <th style={{padding:"9px 12px",textAlign:right?"right":"left",fontSize:10.5,color:C.textMid,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap",background:C.bgLight}}>{children}</th>;
export const Td = ({ children, right, bold, color, mono }) => <td style={{padding:"10px 12px",textAlign:right?"right":"left",fontSize:13,fontWeight:bold?800:600,color:color||C.text,fontVariantNumeric:mono?"tabular-nums":"normal"}}>{children}</td>;
export const Tr = ({ children, style={} }) => <tr className="row-hover" style={{borderTop:`1px solid ${C.borderLight}`,...style}}>{children}</tr>;
export const FormRow = ({ label, children }) => (
 <div><label style={{fontSize:11,fontWeight:800,color:C.textMid,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</label>{children}</div>
);
// En-tête de page commun (titre, explication au clic, actions à droite).
export const EnTetePage = ({ title, info, sub, right }) => (
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:18}}>
  <div style={{minWidth:0}}>
   <div style={{fontSize:21,fontWeight:900,color:C.text,display:"flex",alignItems:"center"}}>{title}<Info>{info}</Info></div>
   {sub&&<div style={{fontSize:13,color:C.textMid,fontWeight:600,marginTop:3}}>{sub}</div>}
  </div>
  {right&&<div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>{right}</div>}
 </div>
);
// Grille responsive des indicateurs (remplace les grilles à colonnes fixes).
export const grilleAuto = (min = 200) => ({ display:"grid", gridTemplateColumns:`repeat(auto-fit,minmax(min(100%,${min}px),1fr))`, gap:14 });
