"use client";
import { useEffect, useState } from "react";

const C = { primary:"#005653", green:"#21C45D", bg:"#ecfdf5", text:"#002e2c", mid:"#2d6b68", light:"#a7d4d0", border:"#c8e8e5" };

const Logo = ({ width = 120 }) => (
  <svg viewBox="100 60 900 700" width={width} height={width * 0.68} style={{display:"block"}}>
    <path d="M0 0 C3.5639181 0.61729569 8.3125 3.5 13.41796875 18.87890625 C16.3125 27.4375 21.6328125 45.5234375 26.25 61.75 C30.6015625 76.7109375 33.3125 91.4375 19.1875 98.125 C10.3125 96.4375 7.1328125 113.09765625 1.8125 137.375 C-3.6875 162.93359375 -18.5625 230.75 -34.1875 303.4375 C-51.35546875 382.83520508 -70.6875 430.4375 -106.6875 431.4375 C-120.875 406.7109375 -138.75 345.3125 -151.1875 301.9375 Z" fill="#005552" transform="translate(821.6875,82.5625)"/>
    <path d="M0 0 C10.31 7.75 17.63671875 29.53125 38.703125 87.0234375 C57.265625 138.421875 78.765625 198.109375 C84.578125 211.484375 91.453125 196.26953125 124.98925781 120.05639648 C157.578125 48.484375 194.578125 114.484375 C150.390625 214.359375 93.203125 324.296875 C64.75390625 321.77734375 C-5.421875 146.484375 C-18.421875 109.484375 Z" fill="#005552" transform="translate(291.421875,249.515625)"/>
    <path d="M0 0 C4 4 7 5 15 7 C23 16 25 33 21 50 C8.5 60 0 61 Z" fill="#21C45D" transform="translate(671,186)"/>
    <path d="M0 0 C3.94921875 11.17578125 6 31 25 0 C33.875 1.125 33.3125 91.4375 32 55 C21.28515625 51.08984375 22 25 C8.84263048 51.26401339 4 56 C-2 56 -8 26 C-20 55 -27 56 C-29 50 -18 17 C-6.43707311 -0.81740611 0 0 Z" fill="#005552" transform="translate(422,620)"/>
    <path d="M0 0 C3.1875 0.3125 22.1875 32.3125 25.0625 19.0625 C30.1875 1.3125 38.1875 0.3125 27.1875 56.3125 C11.625 40.3125 -5.7421875 55.0078125 -14.8125 55.3125 C-16.25820237 49.65980372 0 0 Z" fill="#005552" transform="translate(315.8125,619.6875)"/>
    <path d="M0 0 C7 1 9 10 -1.76171875 23.29296875 C-21 23 -17.875 31.9375 -4 35 C4 35 4 30 4 35 C-12 41.3125 -29 20 -21.1875 3 C-14 -2 0 0 Z M-17 9 C-20 17 -1 17 -6 5 C-13 6 -17 9 Z" fill="#005551" transform="translate(715,635)"/>
    <path d="M0 0 C4.25 9.84765625 3.75 25.75 -2 42 C-8 41 -5 7 -18 8 C-28 41 -33 40 C-25 3 -19 -1 C-9.16413514 -0.59498809 0 0 Z" fill="#005551" transform="translate(560,634)"/>
    <path d="M0 0 C5.7734375 8.38671875 3.75 25.75 -2 42 C-7 41 -4 21.93945312 -9 7 C-24.09 39.28783907 -32 41 C-25.26 3 -18 0 C-9.16413514 -0.59498809 0 0 Z" fill="#005551" transform="translate(645,635)"/>
    <path d="M0 0 C2.375 0.125 3.65399583 4.57202779 -0.82421875 26.28710938 C-6.625 42.125 -11.625 41.125 -7.6875 15.5625 Z" fill="#005552" transform="translate(523.625,633.875)"/>
    <path d="M0 0 C3.0625 8.25 -4.4375 9.0625 -5.8125 1.9375 Z" fill="#005552" transform="translate(526.5625,619.0625)"/>
    <path d="M0 0 C4 4 7 5 18 8 C29 16 31 33 21 50 C4 61 0 61 Z" fill="#1EC257" transform="translate(395,617)"/>
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 14 14" fill="none" width="14" height="14" style={{flexShrink:0,marginTop:2}}>
    <circle cx="7" cy="7" r="7" fill={C.bg}/>
    <path d="M4 7l2 2 4-4" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function ServicesPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const offres = [
    {
      tag:"Offre Essentielle", name:"Suivi des marges", best:false,
      items:["Analyse des marges par produit ou service","Identification de la rentabilité du produit","Suivi de l'évolution des marges dans le temps"],
      mensuel:"35€ HT", unite:"50€ HT",
    },
    {
      tag:"Offre Gestion", name:"Tableau de bord", best:false,
      items:["Offre Essentielle incluse","Suivi des produits et des charges","Calcul du résultat mensuel","Tableau de bord structuré avec indicateurs"],
      mensuel:"250€ HT", unite:"300€ HT",
    },
    {
      tag:"Offre Gestion +", name:"Tableau de bord complet", best:true,
      items:["Offre Tableau de bord inclus","Suivi de la trésorerie inclus","Suivi des stocks inclus","Tableau de bord de gestion","Suivi des investissements","Suivi emprunt bancaire","Suivi IS"],
      mensuel:"500€ HT", unite:"1 000€ HT",
    },
    {
      tag:"Offre Ultime", name:"Prévisionnel intégré", best:false,
      items:["Offre Gestion + inclus","Prévisionnel intégré directement au tableau de bord","Comparaison continue résultats prévus vs réels"],
      mensuel:"600€ HT", unite:"1 500€ HT",
      note:"*Prévisionnel uniquement",
    },
  ];

  const supplements = [
    {
      tag:"Supplément", name:"Suivi de la trésorerie",
      desc:"Cet outil permet d'éviter les tensions de trésorerie en donnant une vision claire, anticipée et fiable des flux financiers.",
      mensuel:"+125€ HT", unite:null,
    },
    {
      tag:"Supplément", name:"Suivi des stocks",
      desc:"Cet outil permet de suivre les stocks en temps réel et d'en connaître la valeur exacte afin d'optimiser les coûts et améliorer la rentabilité.",
      mensuel:"+125€ HT", unite:"+200€ HT",
    },
  ];

  return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"#f8fffe",color:C.text,minHeight:"100vh"}}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>

      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:100,background:scrolled?"rgba(255,255,255,.97)":"rgba(255,255,255,.95)",backdropFilter:"blur(12px)",padding:"0 48px",height:72,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.border}`,transition:"all .3s"}}>
        <a href="/site"><Logo width={110}/></a>
        <div style={{display:"flex",gap:32,alignItems:"center"}}>
          <a href="/site" style={{fontSize:13,fontWeight:700,color:"#2d6b68",textDecoration:"none"}}>Accueil</a>
          <a href="/site/services" style={{fontSize:13,fontWeight:700,color:"#2d6b68",textDecoration:"none"}}>Nos offres</a>
          <a href="/demo" style={{fontSize:13,fontWeight:700,color:"#005653",textDecoration:"none",background:"#ecfdf5",padding:"6px 14px",borderRadius:100,border:"1px solid #a7d4d0"}}>Voir la démo</a>
          <a href="https://nvmfinance.wordpress.com" style={{fontSize:13,fontWeight:700,color:"#2d6b68",textDecoration:"none"}}>À propos</a>
          <a href="https://meet.brevo.com/nathan-van-meer-1" style={{background:"#005653",color:"#fff",padding:"10px 24px",borderRadius:100,fontSize:13,fontWeight:800,textDecoration:"none"}}>Prendre RDV</a>
        </div>
      </nav>

      {/* HEADER */}
      <div style={{background:C.primary,padding:"64px 48px",textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",color:"#fff",padding:"5px 18px",borderRadius:100,fontSize:11,fontWeight:800,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:24}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:C.green,display:"inline-block"}}/>
          Nos offres & tarifs
        </div>
        <h1 style={{fontSize:"clamp(32px,4vw,52px)",fontWeight:900,color:"#fff",marginBottom:16,lineHeight:1.08}}>
          Une offre adaptée à<br/>chaque étape de votre croissance.
        </h1>
        <p style={{fontSize:17,fontWeight:600,color:"rgba(255,255,255,.7)",maxWidth:520,margin:"0 auto"}}>
          Commencez simplement et montez en puissance selon vos besoins.
        </p>
      </div>

      {/* 4 OFFRES PRINCIPALES */}
      <section style={{padding:"64px 48px",maxWidth:1200,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:20}}>
          {offres.map((o,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:20,border:o.best?`2px solid ${C.primary}`:"1px solid "+C.border,boxShadow:o.best?"0 8px 40px rgba(0,86,83,.15)":"0 2px 12px rgba(0,86,83,.05)",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
              {o.best && <div style={{background:C.primary,color:"#fff",fontSize:10,fontWeight:800,textAlign:"center",padding:"6px",letterSpacing:"0.1em",textTransform:"uppercase"}}>⭐ Le plus populaire</div>}
              <div style={{padding:"24px 20px",flex:1}}>
                <div style={{fontSize:10,fontWeight:800,color:C.primary,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{o.tag}</div>
                <div style={{fontSize:20,fontWeight:900,color:C.text,marginBottom:20,lineHeight:1.2}}>{o.name}</div>
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
                  {o.items.map((it,j)=>(
                    <div key={j} style={{display:"flex",alignItems:"flex-start",gap:8}}>
                      <Check/>
                      <span style={{fontSize:13,fontWeight:j===0&&it.includes("inclus")?800:600,color:j===0&&it.includes("inclus")?C.primary:C.mid,lineHeight:1.4}}>{it}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{padding:"20px",borderTop:`1px solid ${C.border}`,background:o.best?C.bg:"#f8fffe"}}>
                <div style={{marginBottom:8}}>
                  <span style={{fontSize:26,fontWeight:900,color:C.text}}>{o.mensuel}</span>
                  <span style={{fontSize:13,fontWeight:600,color:C.mid}}> / Mensuel</span>
                </div>
                {o.unite && <div>
                  <span style={{fontSize:20,fontWeight:800,color:C.mid}}>{o.unite}</span>
                  <span style={{fontSize:12,fontWeight:600,color:C.mid}}> / Unité</span>
                </div>}
                {o.note && <div style={{fontSize:10,color:C.mid,marginTop:4}}>{o.note}</div>}
                <a href="https://meet.brevo.com/nathan-van-meer-1" style={{display:"block",marginTop:16,background:o.best?C.primary:"white",color:o.best?"#fff":C.primary,padding:"11px",borderRadius:100,fontSize:13,fontWeight:800,textDecoration:"none",textAlign:"center",border:`2px solid ${C.primary}`,transition:"all .2s"}}>
                  Démarrer
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SUPPLÉMENTS */}
      <section style={{padding:"0 48px 64px",maxWidth:1200,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:10,fontWeight:800,color:C.primary,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:10}}>Options supplémentaires</div>
          <h2 style={{fontSize:28,fontWeight:900,color:C.text,marginBottom:8}}>Complétez votre offre</h2>
          <p style={{fontSize:15,fontWeight:600,color:C.mid}}>Ces modules s'ajoutent à votre offre principale.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:20,maxWidth:800,margin:"0 auto"}}>
          {supplements.map((s,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:20,border:`1px solid ${C.border}`,padding:"28px 24px",display:"flex",flexDirection:"column"}}>
              <div style={{fontSize:10,fontWeight:800,color:C.primary,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{s.tag}</div>
              <div style={{fontSize:19,fontWeight:900,color:C.text,marginBottom:12}}>{s.name}</div>
              <p style={{fontSize:13,fontWeight:600,color:C.mid,lineHeight:1.65,flex:1,marginBottom:20}}>{s.desc}</p>
              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16}}>
                <div style={{marginBottom:s.unite?6:0}}>
                  <span style={{fontSize:24,fontWeight:900,color:C.primary}}>{s.mensuel}</span>
                  <span style={{fontSize:13,fontWeight:600,color:C.mid}}> / Mensuel</span>
                </div>
                {s.unite && <div>
                  <span style={{fontSize:18,fontWeight:800,color:C.mid}}>{s.unite}</span>
                  <span style={{fontSize:12,fontWeight:600,color:C.mid}}> / Unité</span>
                </div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{background:C.primary,padding:"64px 48px",textAlign:"center"}}>
        <h2 style={{fontSize:34,fontWeight:900,color:"#fff",marginBottom:12,lineHeight:1.1}}>Pas sûr de quelle offre choisir ?</h2>
        <p style={{fontSize:16,fontWeight:600,color:"rgba(255,255,255,.7)",marginBottom:32}}>On fait le point ensemble en 20 minutes — gratuitement.</p>
        <a href="https://meet.brevo.com/nathan-van-meer-1" style={{background:C.green,color:C.text,padding:"16px 44px",borderRadius:100,fontSize:16,fontWeight:900,textDecoration:"none",display:"inline-block",boxShadow:"0 4px 24px rgba(33,196,93,.3)"}}>
          Prendre RDV gratuitement →
        </a>
        <div style={{marginTop:16,fontSize:12,fontWeight:700,color:"rgba(255,255,255,.5)"}}>nathan@nvm-finance.fr · 07 83 65 76 39</div>
      </section>

      <footer style={{background:"#002e2c",padding:"24px 48px",textAlign:"center"}}>
        <p style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.35)"}}>© 2026 NVM Finance — ANALYSE FINANCIÈRE · SUIVI DE PERFORMANCE · PILOTAGE D'ACTIVITÉ</p>
      </footer>
    </div>
  );
}
