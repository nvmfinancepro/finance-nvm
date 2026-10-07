// Charte graphique de l'application (espace client, admin, cabinet) : couleurs,
// formats et composants de base partagés par NVMFinance.jsx et les vues de pilotage.

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

// COMPOSANTS DE BASE
export const Btn = ({ children, onClick, variant="primary", small, style={}, disabled }) => {
 const s = { primary:{background:C.primary,color:C.white,border:"none",boxShadow:"0 4px 14px rgba(0,86,83,.22)"}, ghost:{background:C.white,color:C.primary,border:`1.5px solid ${C.border}`}, danger:{background:C.red,color:C.white,border:"none",boxShadow:"0 4px 14px rgba(220,38,38,.2)"}, success:{background:C.green,color:C.white,border:"none",boxShadow:"0 4px 14px rgba(5,150,105,.22)"}, orange:{background:C.orange,color:C.white,border:"none",boxShadow:"0 4px 14px rgba(217,119,6,.22)"} };
 return <button onClick={onClick} disabled={disabled} style={{...s[variant],padding:small?"6px 14px":"10px 20px",borderRadius:100,fontSize:small?12:13,fontWeight:800,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all .15s",display:"inline-flex",alignItems:"center",gap:6,...style}}>{children}</button>;
};
export const Pill = ({ children, color=C.primary, bg }) => <span style={{background:bg||color+"18",color,border:`1px solid ${color}33`,borderRadius:100,padding:"3px 11px",fontSize:11,fontWeight:800,whiteSpace:"nowrap",display:"inline-block"}}>{children}</span>;
export const KpiCard = ({ label, value, sub, color=C.primary }) => (
 <div style={{background:C.white,border:`1.5px solid ${C.text}`,borderRadius:20,padding:"22px 24px",position:"relative",boxShadow:"0 16px 36px rgba(0,86,83,.06)"}}>
 <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}>
 <div style={{width:7,height:7,borderRadius:"50%",background:color,flexShrink:0}}/>
 <div style={{fontSize:11,color:C.textLight,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</div>
 </div>
 <div style={{fontSize:26,fontWeight:900,color:C.text,letterSpacing:"-0.01em"}}>{value}</div>
 {sub&&<div style={{fontSize:12,color,fontWeight:700,marginTop:6}}>{sub}</div>}
 </div>
);
export const Card = ({ children, style={} }) => <div style={{background:C.white,border:`1.5px solid ${C.text}`,borderRadius:22,boxShadow:"0 16px 36px rgba(0,86,83,.06)",overflow:"hidden",...style}}>{children}</div>;
export const SectionHead = ({ title, sub, action }) => (
 <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:`1px solid ${C.borderLight}`}}>
 <div><div style={{fontSize:14,fontWeight:800,color:C.text}}>{title}</div>{sub&&<div style={{fontSize:11,color:C.textLight,marginTop:2}}>{sub}</div>}</div>
 {action&&<div style={{display:"flex",gap:8,alignItems:"center"}}>{action}</div>}
 </div>
);
export const Th = ({ children, right }) => <th style={{padding:"9px 12px",textAlign:right?"right":"left",fontSize:11,color:C.textMid,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.07em",whiteSpace:"nowrap",background:C.bg}}>{children}</th>;
export const Td = ({ children, right, bold, color, mono }) => <td style={{padding:"10px 12px",textAlign:right?"right":"left",fontSize:13,fontWeight:bold?800:500,color:color||C.text,fontFamily:mono?"'Courier New',monospace":"inherit"}}>{children}</td>;
export const Tr = ({ children, style={} }) => <tr className="row-hover" style={{borderBottom:`1px solid ${C.borderLight}`,...style}}>{children}</tr>;
export const FormRow = ({ label, children }) => (
 <div><label style={{fontSize:11,fontWeight:800,color:C.textMid,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</label>{children}</div>
);
