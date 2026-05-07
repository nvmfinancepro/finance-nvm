import { useEffect, useState } from "react";

const Logo = ({ width = 100 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="100 60 900 700" width={width} height={width * 0.68} style={{display:"block"}}>
    <path d="M0 0 C3.5639181 0.61729569 5.29648488 1.4264896 8.3125 3.5 C11.23164242 8.01436151 12.19401797 13.70706315 13.41796875 18.87890625 C14.17828585 21.90357384 15.14157695 24.56171299 16.3125 27.4375 C16.8209603 29.36751945 17.29897618 31.30575607 17.75 33.25 C18.77851275 37.49910825 20.01508557 41.47078137 21.6328125 45.5234375 C22.36513544 47.58572623 22.81804141 49.60536351 23.25 51.75 C23.96507719 55.23004231 24.98999148 58.42815935 26.25 61.75 C28.10981324 66.66571454 29.42857643 71.59119831 30.6015625 76.7109375 C31.25564684 79.46034304 32.37890625 82.0703125 C33.3125 91.4375 C32.08514695 94.19904437 28.6484375 97.59375 C19.1875 98.125 C12.3125 97.4375 C10.3125 96.4375 C9.43027403 104.26938066 C7.1328125 113.09765625 C4.8125 123.9375 C1.8125 137.375 C-1.94140625 155.67578125 C-3.6875 162.93359375 C-9.1875 187.9375 C-15.125 215.1875 C-18.5625 230.75 C-27.1640625 271.0546875 C-34.1875 303.4375 C-43.47412109 345.93847656 C-51.35546875 382.83520508 C-56.5 406.4375 C-70.6875 430.4375 C-79.6875 434.4375 C-106.6875 431.4375 C-120.875 406.7109375 C-125.6875 390.4375 C-138.75 345.3125 C-148.9375 309.34375 C-151.1875 301.9375 Z" fill="#005552" transform="translate(821.6875,82.5625)"/>
    <path d="M0 0 C10.31306756 7.75165209 14.21075016 17.39353269 17.63671875 29.53125 C22.015625 41.359375 C28.5 59.265625 C38.703125 87.0234375 C46.87207031 110.14672852 C57.265625 138.421875 C67.828125 167.796875 C78.765625 198.109375 C84.578125 211.484375 C91.453125 196.26953125 C110.46704102 153.74145508 C135.578125 95.984375 C157.578125 48.484375 C169.578125 81.484375 C194.578125 114.484375 C175.74145508 156.12890625 C150.390625 214.359375 C117.046875 290.75390625 C93.203125 324.296875 C64.75390625 321.77734375 C45.578125 287.484375 C23.578125 226.484375 C-5.421875 146.484375 C-18.421875 109.484375 Z" fill="#005552" transform="translate(291.421875,249.515625)"/>
    <path d="M0 0 C2.625 2.1875 4 4 7 5 C15 7 23 16 25 33 C21 50 C8.5 60 C0 61 Z" fill="#21C45D" transform="translate(671,186)"/>
    <path d="M0 0 C5.4375 -0.04 C10 0.19 C12 7.19 C0.81 8.25 C-7 8.19 C-10 24.19 C-5.19 32.25 C5 31.19 C1.44 32.37 C-12 32.19 C-16 44 C-19 56.19 C-24 55.19 C-19.62 27.4 C-16.91 14.6 C-13 1.19 Z" fill="#005552" transform="translate(505,619.8125)"/>
    <path d="M0 0 C4.25 9.85 C1 27.44 C-2 40 C-8 41 C-6.44 21.81 C-5 7 C-18 8 C-23.79 29.09 C-28 41 C-33 40 C-29.71 13.75 C-25 -1 C-19 -1 C-11.03 -2.65 Z" fill="#005552" transform="translate(560,634)"/>
    <path d="M0 0 C5.77 8.39 C3.75 25.75 C-2 42 C-7 41 C-4.33 21.94 C-9 7 C-17.55 12.39 C-24.09 39.29 C-27 42 C-32 41 C-25.26 3.38 C-23 0 C-18 0 C-9.16 -0.59 Z" fill="#005552" transform="translate(645,635)"/>
    <path d="M0 0 C0.44 6.44 C-6.56 6.44 C-21.77 25.11 C-20.56 31.44 C-4.56 31.44 C-10.56 40.44 C-30.83 19.86 C-22.75 2.44 Z" fill="#005552" transform="translate(684.5625,635.5625)"/>
    <path d="M0 0 C2.38 0.13 C3.65 4.57 C-0.82 26.29 C-6.63 42.13 C-11.63 41.13 C-7.69 15.56 C-5.39 4.75 Z" fill="#005552" transform="translate(523.625,633.875)"/>
    <path d="M0 0 C3.06 8.25 C-4.44 9.06 C-5.81 1.94 Z" fill="#005552" transform="translate(526.5625,619.0625)"/>
    <path d="M0 0 C4 4 C7 5 C18 8 C29 16 C31 33 C21 50 C4 61 C0 61 Z" fill="#1EC257" transform="translate(395,617)"/>
  </svg>
);

export default function NVMFinanceDemo() {
  const [tab, setTab] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
    const t = setInterval(() => setTab(p => (p + 1) % 3), 3800);
    return () => clearInterval(t);
  }, []);

  const bars = [48,55,42,60,52,68,63,70,66,78,72,100];
  const treso = [42,48,39,55,49,62,58,66,61,72,68,94];
  const mo = ["M","J","J","A","S","O","N","D","J","F","M","A"];
  const anim = (d=0) => ({opacity:loaded?1:0, transform:loaded?"translateY(0)":"translateY(16px)", transition:`all .6s ease ${d}s`});

  const sidebarItems = [
    {sec:"Vue générale", items:[{l:"Tableau de bord",i:0},{l:"Mes alertes",i:1}]},
    {sec:"Mes finances", items:[{l:"Ma trésorerie",i:2},{l:"Mon résultat",i:-1},{l:"Ma TVA",i:-1}]},
    {sec:"Analyse", items:[{l:"Prévisionnel",i:-1}]},
  ];

  return (
    <div style={{fontFamily:"'Nunito',sans-serif", background:"#fff", minHeight:"100vh"}}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>

      {/* NAV */}
      <nav style={{background:"#fff", padding:"14px 48px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #e8f5f4"}}>
        <span style={{fontSize:13, fontWeight:700, color:"#2d6b68"}}>À propos</span>
        <Logo width={110}/>
        <a href="https://meet.brevo.com/nathan-van-meer-1" style={{background:"#005653", color:"#fff", padding:"10px 24px", borderRadius:100, fontSize:13, fontWeight:800, textDecoration:"none"}}>Prendre RDV</a>
      </nav>

      {/* HERO */}
      <section style={{background:"linear-gradient(180deg,#f8fffe 0%,#ecfdf5 100%)", padding:"64px 48px 0", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center"}}>
        <div style={{...anim(0), display:"inline-flex", alignItems:"center", gap:7, background:"#fff", border:"1px solid #a7d4d0", color:"#005653", padding:"5px 18px", borderRadius:100, fontSize:11, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:28}}>
          <span style={{width:7, height:7, borderRadius:"50%", background:"#21C45D", display:"inline-block"}}/>
          Pilotage financier · SaaS
        </div>

        <h1 style={{...anim(.1), fontSize:52, fontWeight:900, lineHeight:1.06, color:"#002e2c", marginBottom:20, maxWidth:700}}>
          Pilotez vos finances<br/>avec <em style={{color:"#005653", fontStyle:"normal", borderBottom:"3px solid #21C45D"}}>précision et clarté.</em>
        </h1>

        <p style={{...anim(.2), fontSize:18, fontWeight:600, color:"#2d6b68", lineHeight:1.7, marginBottom:10, maxWidth:600}}>
          NVM Finance permet aux entreprises de piloter leurs finances avec précision grâce à notre SaaS de gestion financière.
        </p>
        <p style={{...anim(.22), fontSize:17, fontWeight:800, color:"#005653", marginBottom:40, maxWidth:520}}>
          Conçu pour transformer les données en décisions rentables.
        </p>

        <div style={{...anim(.3), display:"flex", gap:14, justifyContent:"center", marginBottom:56}}>
          <a href="https://meet.brevo.com/nathan-van-meer-1" style={{background:"#005653", color:"#fff", padding:"15px 36px", borderRadius:100, fontSize:15, fontWeight:800, textDecoration:"none", boxShadow:"0 4px 24px rgba(0,86,83,.22)"}}>Demander une démo gratuite</a>
          <a href="https://nvmfinance.wordpress.com/services/" style={{background:"#fff", color:"#005653", padding:"15px 36px", borderRadius:100, fontSize:15, fontWeight:800, textDecoration:"none", border:"2px solid #a7d4d0"}}>En savoir plus</a>
        </div>

        {/* MOCKUP */}
        <div style={{...anim(.4), width:"100%", maxWidth:880, background:"#f0faf8", borderRadius:"16px 16px 0 0", border:"1.5px solid #c8e8e5", borderBottom:"none", boxShadow:"0 -4px 48px rgba(0,86,83,.1)", overflow:"hidden"}}>
          <div style={{background:"#005653", padding:"10px 16px", display:"flex", alignItems:"center", gap:6}}>
            {["#ff5f57","#febc2e","#28c840"].map((c,i)=><div key={i} style={{width:10, height:10, borderRadius:"50%", background:c}}/>)}
            <span style={{marginLeft:10, fontSize:9, color:"rgba(255,255,255,.3)", fontWeight:600}}>nvm-finance.vercel.app — Espace client</span>
          </div>
          <div style={{display:"flex", height:390}}>
            <div style={{width:168, minWidth:168, background:"#005653", display:"flex", flexDirection:"column"}}>
              <div style={{padding:"14px 14px 12px", fontSize:13, fontWeight:900, color:"#fff", borderBottom:"1px solid rgba(255,255,255,.08)"}}>NVM Finance</div>
              {sidebarItems.map((g,gi)=>(
                <div key={gi}>
                  <div style={{padding:"7px 14px 2px", fontSize:8, fontWeight:800, color:"rgba(255,255,255,.28)", letterSpacing:"0.1em", textTransform:"uppercase", marginTop:gi>0?6:0}}>{g.sec}</div>
                  {g.items.map((it,ii)=>(
                    <div key={ii} style={{padding:"7px 14px", fontSize:11, fontWeight:it.i===tab?800:600, color:it.i===tab?"#fff":"rgba(255,255,255,.45)", background:it.i===tab?"rgba(255,255,255,.1)":"transparent", borderLeft:it.i===tab?"2.5px solid #21C45D":"2.5px solid transparent", transition:"all .3s"}}>
                      {it.l}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{flex:1, padding:18, overflow:"hidden", position:"relative", background:"#f8fffe"}}>

              {/* TAB 0 */}
              <div style={{position:"absolute", inset:18, opacity:tab===0?1:0, transform:tab===0?"translateX(0)":"translateX(12px)", transition:"all .4s ease", pointerEvents:tab===0?"auto":"none"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
                  <span style={{fontSize:14, fontWeight:900, color:"#002e2c"}}>Tableau de bord — Avr 2026</span>
                  <span style={{fontSize:9, fontWeight:800, color:"#21C45D", background:"rgba(33,196,93,.1)", padding:"3px 10px", borderRadius:100}}>● En direct</span>
                </div>
                <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12}}>
                  {[{l:"CA MENSUEL",v:"35 400 €",d:"↑ +18%"},{l:"MARGE BRUTE",v:"31 200 €",d:"↑ +88%"},{l:"EBE",v:"18 750 €",d:"↑ +24%"},{l:"TRÉSORERIE",v:"94 200 €",d:"↑ +12%"}].map((k,i)=>(
                    <div key={i} style={{background:"#fff", borderRadius:8, padding:"10px 11px", border:"0.5px solid #e8f5f4"}}>
                      <div style={{fontSize:7.5, fontWeight:700, color:"#6aaca8", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:4}}>{k.l}</div>
                      <div style={{fontSize:15, fontWeight:900, color:"#002e2c"}}>{k.v}</div>
                      <div style={{fontSize:8, fontWeight:700, color:"#059669", marginTop:2}}>{k.d}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:"#fff", borderRadius:8, padding:"10px 14px", border:"0.5px solid #e8f5f4"}}>
                  <div style={{fontSize:8, fontWeight:800, color:"#2d6b68", marginBottom:10}}>CA mensuel — 12 mois glissants</div>
                  <svg viewBox="0 0 420 82" width="100%" style={{display:"block"}}>
                    {(()=>{const max=Math.max(...bars);const pts=bars.map((v,i)=>[i*(420/11),70-((v/max)*62)]);const path="M"+pts.map(p=>p.join(",")).join(" L");return(<><path d={`M0,70 L${pts.map(p=>p.join(",")).join(" L")} L420,70 Z`} fill="rgba(0,86,83,.06)"/><path d={path} fill="none" stroke="#005653" strokeWidth="2" strokeLinejoin="round"/>{pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===11?4:2.5} fill={i===11?"#005653":"#fff"} stroke="#005653" strokeWidth="1.5"/>)}{mo.map((m,i)=><text key={i} x={i*(420/11)} y={80} textAnchor="middle" fontSize="7" fill={i===11?"#002e2c":"#6aaca8"} fontFamily="Nunito" fontWeight={i===11?800:600}>{m}</text>)}</>);})()}
                  </svg>
                </div>
              </div>

              {/* TAB 1 */}
              <div style={{position:"absolute", inset:18, opacity:tab===1?1:0, transform:tab===1?"translateX(0)":"translateX(12px)", transition:"all .4s ease", pointerEvents:tab===1?"auto":"none"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
                  <span style={{fontSize:14, fontWeight:900, color:"#002e2c"}}>Mes alertes — Avr 2026</span>
                  <span style={{fontSize:9, fontWeight:700, color:"#6aaca8", background:"#ecfdf5", padding:"3px 10px", borderRadius:100}}>3 alertes actives</span>
                </div>
                {[{bg:"#fef2f2",bc:"#fecaca",c:"#dc2626",t:"Trésorerie critique",sub:"Solde estimé sous le seuil d'alerte en juin"},{bg:"#fffbeb",bc:"#fde68a",c:"#d97706",t:"Marge en baisse",sub:"Marge brute −4.2 pts vs mars — surveiller les coûts"},{bg:"#eff6ff",bc:"#bfdbfe",c:"#2563eb",t:"IS à anticiper",sub:"Provision IS estimée à 3 758 € ce trimestre"}].map((a,i)=>(
                  <div key={i} style={{display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px", borderRadius:10, background:a.bg, border:`1px solid ${a.bc}`, marginBottom:10}}>
                    <div style={{width:9, height:9, borderRadius:"50%", background:a.c, flexShrink:0, marginTop:3}}/>
                    <div><div style={{fontSize:13, fontWeight:800, color:"#002e2c"}}>{a.t}</div><div style={{fontSize:11, fontWeight:600, color:"#6aaca8", marginTop:3}}>{a.sub}</div></div>
                  </div>
                ))}
              </div>

              {/* TAB 2 */}
              <div style={{position:"absolute", inset:18, opacity:tab===2?1:0, transform:tab===2?"translateX(0)":"translateX(12px)", transition:"all .4s ease", pointerEvents:tab===2?"auto":"none"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
                  <span style={{fontSize:14, fontWeight:900, color:"#002e2c"}}>Ma trésorerie — Avr 2026</span>
                  <span style={{fontSize:9, fontWeight:800, color:"#21C45D", background:"rgba(33,196,93,.1)", padding:"3px 10px", borderRadius:100}}>● En direct</span>
                </div>
                <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12}}>
                  {[{l:"SOLDE ACTUEL",v:"94 200 €",d:"↑ +8 400 €",ok:true},{l:"FLUX MENSUEL",v:"+8 400 €",d:"↑ vs mars",ok:true},{l:"PROJECTION JUIN",v:"78 900 €",d:"⚠ Attention",ok:false}].map((k,i)=>(
                    <div key={i} style={{background:"#fff", borderRadius:8, padding:"10px 11px", border:"0.5px solid #e8f5f4"}}>
                      <div style={{fontSize:7.5, fontWeight:700, color:"#6aaca8", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:4}}>{k.l}</div>
                      <div style={{fontSize:14, fontWeight:900, color:"#002e2c"}}>{k.v}</div>
                      <div style={{fontSize:8, fontWeight:700, color:k.ok?"#059669":"#dc2626", marginTop:2}}>{k.d}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:"#fff", borderRadius:8, padding:"10px 14px", border:"0.5px solid #e8f5f4"}}>
                  <div style={{fontSize:8, fontWeight:800, color:"#2d6b68", marginBottom:10}}>Évolution trésorerie — 12 mois</div>
                  <svg viewBox="0 0 420 82" width="100%" style={{display:"block"}}>
                    <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#005653" stopOpacity="0.15"/><stop offset="100%" stopColor="#005653" stopOpacity="0"/></linearGradient></defs>
                    {(()=>{const max=Math.max(...treso),min=Math.min(...treso);const pts=treso.map((v,i)=>[i*(420/11),65-((v-min)/(max-min))*57]);const path="M"+pts.map(p=>p.join(",")).join(" L");return(<><path d={`M0,65 L${pts.map(p=>p.join(",")).join(" L")} L420,65 Z`} fill="url(#tg)"/><path d={path} fill="none" stroke="#005653" strokeWidth="2" strokeLinejoin="round"/>{pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===11?4:2.5} fill={i===11?"#005653":"#fff"} stroke="#005653" strokeWidth="1.5"/>)}{mo.map((m,i)=><text key={i} x={i*(420/11)} y={80} textAnchor="middle" fontSize="7" fill={i===11?"#002e2c":"#6aaca8"} fontFamily="Nunito" fontWeight={i===11?800:600}>{m}</text>)}</>);})()}
                  </svg>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 3 PILIERS */}
      <div style={{background:"#005653", padding:"52px 48px"}}>
        <div style={{maxWidth:960, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(3,1fr)"}}>
          {[
            {t:"Pilotage précis", p:"Une vision financière structurée et exploitable — en temps réel, chaque mois."},
            {t:"Anticipation des risques", p:"Détectez les dérives avant qu'elles n'impactent votre activité. Notre équipe analyse et alerte."},
            {t:"Performance durable", p:"Optimisez vos résultats et développez votre entreprise sereinement grâce à des recommandations sur-mesure."},
          ].map((p,i)=>(
            <div key={i} style={{padding:"28px 36px", borderLeft:i>0?"1px solid rgba(255,255,255,.12)":"none"}}>
              <div style={{fontSize:10, fontWeight:800, color:"#21C45D", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10}}>{p.t}</div>
              <p style={{fontSize:14, fontWeight:600, color:"rgba(255,255,255,.7)", lineHeight:1.65, margin:0}}>{p.p}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section style={{padding:"88px 48px", background:"#fff"}}>
        <div style={{fontSize:10, fontWeight:800, color:"#005653", letterSpacing:"0.15em", textTransform:"uppercase", textAlign:"center", marginBottom:12}}>Ce qui nous différencie</div>
        <h2 style={{fontSize:36, fontWeight:900, textAlign:"center", color:"#002e2c", marginBottom:12, lineHeight:1.12}}>Pas juste un tableau de bord.<br/>Une vraie visibilité financière complète.</h2>
        <p style={{fontSize:16, fontWeight:600, color:"#2d6b68", textAlign:"center", maxWidth:560, margin:"0 auto 52px", lineHeight:1.65}}>
          Là où d'autres outils donnent des chiffres, NVM Finance donne du sens — avec l'analyse humaine derrière.
        </p>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20, maxWidth:1000, margin:"0 auto"}}>
          {[
            {ic:"📊", h:"Vision financière 360°", p:"CA, marge, EBE, trésorerie, TVA, IS, prévisionnel — tout calculé automatiquement, mis à jour chaque mois."},
            {ic:"🔔", h:"Détection proactive des anomalies", p:"Notre système identifie les dérives en amont. Fini les mauvaises surprises en fin d'année."},
            {ic:"📈", h:"Prévisionnel intelligent", p:"Projection 2026 & 2027 basée sur vos données réelles. Anticipez, planifiez, décidez."},
            {ic:"🧠", h:"Analyse & recommandations humaines", p:"Notre équipe analyse vos données et vous propose des solutions concrètes adaptées à votre situation."},
            {ic:"🔒", h:"Accès sécurisé et personnalisé", p:"Chaque entreprise accède uniquement à ses propres données. Interface claire, aucune formation requise."},
            {ic:"⚡", h:"Mise en place en 48h", p:"Importez vos données CSV, on s'occupe du reste. Votre tableau de bord est opérationnel en 2 jours."},
          ].map((f,i)=>(
            <div key={i} style={{background:"#f8fffe", borderRadius:14, padding:"24px 20px", border:"0.5px solid #e8f5f4"}}>
              <div style={{fontSize:22, marginBottom:14}}>{f.ic}</div>
              <div style={{fontSize:14, fontWeight:900, color:"#002e2c", marginBottom:7}}>{f.h}</div>
              <p style={{fontSize:12.5, fontWeight:600, color:"#2d6b68", lineHeight:1.65, margin:0}}>{f.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CHECKLIST */}
      <section style={{background:"#005653", padding:"88px 48px"}}>
        <div style={{maxWidth:860, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:64, alignItems:"center"}}>
          <div>
            <h2 style={{fontSize:34, fontWeight:900, color:"#fff", lineHeight:1.12, marginBottom:14}}>Ce que vous gagnez dès le premier mois.</h2>
            <p style={{fontSize:15, fontWeight:600, color:"rgba(255,255,255,.6)", lineHeight:1.7, marginBottom:28}}>Une clarté financière que peu d'entreprises ont — sans embaucher un DAF.</p>
            <a href="https://meet.brevo.com/nathan-van-meer-1" style={{background:"#21C45D", color:"#002e2c", padding:"14px 32px", borderRadius:100, fontSize:14, fontWeight:900, textDecoration:"none", display:"inline-block"}}>Demander une démo gratuite →</a>
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:12}}>
            {["Une vision exacte de votre rentabilité chaque mois","Les risques identifiés avant qu'ils ne deviennent des problèmes","Des recommandations concrètes adaptées à votre activité","Un prévisionnel fiable pour décider avec confiance","Moins de temps passé sur les chiffres, plus sur votre métier","La sérénité de savoir où vous en êtes, vraiment"].map((t,i)=>(
              <div key={i} style={{display:"flex", alignItems:"flex-start", gap:11}}>
                <div style={{width:20, height:20, borderRadius:6, background:"rgba(33,196,93,.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1}}>
                  <svg viewBox="0 0 12 12" fill="none" width="12" height="12"><path d="M2 6l3 3 5-5" stroke="#21C45D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span style={{fontSize:13.5, fontWeight:700, color:"rgba(255,255,255,.85)", lineHeight:1.4}}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:"88px 48px", textAlign:"center", background:"linear-gradient(180deg,#fff 0%,#ecfdf5 100%)"}}>
        <h2 style={{fontSize:38, fontWeight:900, color:"#002e2c", marginBottom:12, lineHeight:1.1}}>Prêt à piloter votre activité<br/>avec précision ?</h2>
        <p style={{fontSize:16, fontWeight:600, color:"#2d6b68", marginBottom:36}}>Analyse financière gratuite — sans engagement.</p>
        <div style={{display:"inline-flex", flexDirection:"column", alignItems:"center", gap:14, background:"#fff", border:"1.5px solid #c8e8e5", borderRadius:20, padding:"36px 52px", boxShadow:"0 8px 48px rgba(0,86,83,.08)"}}>
          <a href="https://meet.brevo.com/nathan-van-meer-1" style={{background:"#005653", color:"#fff", padding:"16px 44px", borderRadius:100, fontSize:16, fontWeight:900, textDecoration:"none", boxShadow:"0 4px 24px rgba(0,86,83,.22)"}}>Demander mon analyse gratuite</a>
          <span style={{fontSize:12, fontWeight:700, color:"#6aaca8"}}>nathan@nvm-finance.fr · 07 83 65 76 39</span>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:"#002e2c", padding:"24px 48px", textAlign:"center"}}>
        <p style={{fontSize:11, fontWeight:600, color:"rgba(255,255,255,.35)"}}>© 2026 NVM Finance — ANALYSE FINANCIÈRE · SUIVI DE PERFORMANCE · PILOTAGE D'ACTIVITÉ</p>
      </footer>
    </div>
  );
}
