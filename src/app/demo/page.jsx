"use client";
import { useEffect, useState, useRef } from "react";
import { LogoSVG } from "@/components/ui/Logo";
import { setEnabled, playType, playPop, playTransition, playCheck, playLoginSuccess, playSuccess } from "./sounds";

/* ═══════════════════════════════════════════════════════
   NVM Finance Demo — De la donnée à la décision, 4 étapes
════════════════════════════════════════════════════════ */

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
@keyframes float    {0%,100%{transform:translateY(0)}       50%{transform:translateY(-9px)}}
@keyframes float2   {0%,100%{transform:translateY(-5px)}    50%{transform:translateY(5px)}}
@keyframes float3   {0%,100%{transform:translate(0,0)}      45%{transform:translate(4px,-7px)} 90%{transform:translate(-3px,-3px)}}
@keyframes fadeUp   {from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)}}
@keyframes fadeLeft {from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)}}
@keyframes popIn    {from{opacity:0;transform:scale(.78)}        to{opacity:1;transform:scale(1)}}
@keyframes pdot     {0%,100%{opacity:1;transform:scale(1)}  50%{opacity:.4;transform:scale(.5)}}
@keyframes drawLine {from{stroke-dashoffset:600}             to{stroke-dashoffset:0}}
@keyframes barH     {from{width:0}                           to{width:var(--w)}}
@keyframes glow     {0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.22)} 60%{box-shadow:0 0 0 8px rgba(220,38,38,0)}}
@keyframes checkPop {0%{transform:scale(0) rotate(-20deg);opacity:0} 70%{transform:scale(1.2) rotate(5deg)} 100%{transform:scale(1) rotate(0deg);opacity:1}}
@keyframes ticker   {0%,100%{transform:translateY(0)} 50%{transform:translateY(-100%)}}

.pan{position:absolute;inset:0;opacity:0;transition:opacity .7s ease;pointer-events:none}
.pan.on{opacity:1;pointer-events:auto}
.pan.on .a1{animation:fadeUp .5s .15s both}
.pan.on .a2{animation:fadeUp .5s .30s both}
.pan.on .a3{animation:fadeUp .5s .45s both}
.pan.on .a4{animation:fadeUp .5s .60s both}
.pan.on .a5{animation:fadeUp .5s .75s both}
.pan.on .a6{animation:fadeUp .5s .90s both}
.pan.on .a7{animation:fadeUp .5s 1.05s both}
.pan.on .fl {animation:float  7s ease-in-out infinite}
.pan.on .fl2{animation:float  9s ease-in-out infinite .9s}
.pan.on .fl3{animation:float3 8s ease-in-out infinite .4s}
.pan.on .fl4{animation:float2 7s ease-in-out infinite 1.4s}
.pan.on .nb1{animation:fadeLeft .45s .7s both}
.pan.on .nb2{animation:fadeLeft .45s 1.3s both}
.pan.on .chartline{animation:drawLine 1.8s 1.1s ease-out both}
.pan.on .aglow{animation:glow 2.5s 1.2s ease-in-out infinite}
.pan.on .pop1{animation:popIn .38s .5s  both}
.pan.on .pop2{animation:popIn .38s 1.0s both}
.pan.on .pop3{animation:popIn .38s 1.5s both}
.pan.on .bar1{animation:barH 1.1s .8s  ease-out both}
.pan.on .bar2{animation:barH 1.1s 1.0s ease-out both}
.pan.on .bar3{animation:barH 1.1s 1.2s ease-out both}
.pan.on .bar4{animation:barH 1.1s 1.4s ease-out both}
@keyframes barUp    {from{transform:scaleY(0)} to{transform:scaleY(1)}}
.pan.on .vp1{animation:fadeLeft .45s 1.4s both}
.pan.on .vp2{animation:fadeLeft .45s 4.0s both}
.pan.on .vp3{animation:fadeLeft .45s 5.0s both}
.pan.on .vtip{animation:fadeUp .38s 3.0s both}
.pan.on .vb0{animation:barUp .8s .30s both}
.pan.on .vb1{animation:barUp .8s .42s both}
.pan.on .vb2{animation:barUp .8s .54s both}
.pan.on .vb3{animation:barUp .8s .66s both}
.pan.on .vb4{animation:barUp .8s .78s both}
.pan.on .vb5{animation:barUp .8s .92s both}
`;

const P="#005653",G="#21C45D",BG="#ecfdf5",TX="#002e2c",MID="#2d6b68",BD="#c8e8e5",LT="#a7d4d0";

const PANELS=[
  {id:"login",   s:0,  e:5 },
  {id:"visu",    s:5,  e:15},
  {id:"analyse", s:15, e:25},
  {id:"optim",   s:25, e:34},
  {id:"auto",    s:34, e:43},
  {id:"outro",   s:43, e:49},
];
const TOTAL=49;

/* ─── Hooks ─────────────────────────────────────────── */
function useCounter(target,active,dur=1400){
  const[v,setV]=useState(0);
  useEffect(()=>{
    if(!active){setV(0);return;}
    let s=null,r;
    const step=ts=>{
      if(!s)s=ts;
      const p=Math.min((ts-s)/dur,1);
      setV(Math.round((1-Math.pow(1-p,3))*target));
      if(p<1)r=requestAnimationFrame(step);
    };
    r=requestAnimationFrame(step);
    return()=>cancelAnimationFrame(r);
  },[active,target,dur]);
  return v;
}

function useTyping(text,active,speed=32){
  const[n,setN]=useState(0);
  useEffect(()=>{
    if(!active){setN(0);return;}
    const t=setTimeout(()=>{
      let i=0;
      const iv=setInterval(()=>{
        i++;setN(i);
        if(i>=text.length)clearInterval(iv);
      },speed);
      return()=>clearInterval(iv);
    },1600);
    return()=>clearTimeout(t);
  },[active,text,speed]);
  return text.slice(0,n);
}

function useSeq(count,active,interval=750,delay=500){
  const[s,setS]=useState(-1);
  useEffect(()=>{
    if(!active){setS(-1);return;}
    const t=setTimeout(()=>{
      setS(0);
      let i=0;
      const iv=setInterval(()=>{
        i++;
        if(i<count)setS(i);
        else clearInterval(iv);
      },interval);
      return()=>clearInterval(iv);
    },delay);
    return()=>clearTimeout(t);
  },[active,count,interval,delay]);
  return s;
}

/* ─── Primitives ─────────────────────────────────────── */
function LiveBadge(){
  return(
    <div style={{display:"flex",alignItems:"center",gap:6,background:BG,
      padding:"5px 12px",borderRadius:100,border:`1px solid ${BD}`,flexShrink:0}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:G,animation:"pdot 2s infinite"}}/>
      <span style={{fontSize:9.5,fontWeight:800,color:P}}>En direct</span>
    </div>
  );
}

function Notif({icon,title,sub,color=P,extra}){
  return(
    <div style={{background:"#fff",borderRadius:14,whiteSpace:"nowrap",
      boxShadow:"0 8px 32px rgba(0,86,83,.12),0 0 0 1px rgba(0,86,83,.07)",
      padding:"9px 14px",display:"flex",alignItems:"center",gap:10,...(extra||{})}}>
      <div style={{width:30,height:30,borderRadius:9,background:color+"18",
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Ico n={icon} size={14} color={color}/>
      </div>
      <div>
        <div style={{fontSize:10,fontWeight:800,color}}>{title}</div>
        <div style={{fontSize:9,fontWeight:600,color:"#6aaca8"}}>{sub}</div>
      </div>
    </div>
  );
}

function Card({children,style:{}}){
  return(
    <div style={{background:"#fff",borderRadius:20,
      boxShadow:"0 24px 70px rgba(0,86,83,.13),0 0 0 1px rgba(0,86,83,.06)",
      padding:"20px",...style}}>
      {children}
    </div>
  );
}
function Ico({n,size=14,color="currentColor",sw=1.6}){
  const p={stroke:color,strokeWidth:sw,strokeLinecap:"round",strokeLinejoin:"round",fill:"none"};
  const v="0 0 16 16";
  const i={
    up:    <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" {...p}/>,
    trend: <><polyline points="1,13 5.5,8 9,11 15,3" {...p}/><polyline points="11,3 15,3 15,7" {...p}/></>,
    warn:  <><path d="M8 2.5 1.5 13.5h13L8 2.5z" {...p}/><path d="M8 7v3M8 12.2v.3" {...p}/></>,
    check: <><circle cx="8" cy="8" r="6" {...p}/><path d="M5.5 8l2 2 3.5-3.5" {...p}/></>,
    cal:   <><rect x="1.5" y="3.5" width="13" height="11" rx="1.5" {...p}/><path d="M1.5 7.5h13M5.5 2v3M10.5 2v3" {...p}/></>,
    bulb:  <><path d="M8 2a4 4 0 0 1 2.8 6.8L10.5 11h-5l-.3-2.2A4 4 0 0 1 8 2z" {...p}/><path d="M6.5 13h3" {...p}/></>,
    euro:  <><circle cx="8" cy="8" r="5.5" {...p}/><path d="M10.5 6A3 3 0 1 0 10.5 10M5 8h5M5 10h5" {...p}/></>,
    target:<><circle cx="8" cy="8" r="6" {...p}/><circle cx="8" cy="8" r="3" {...p}/><circle cx="8" cy="8" r=".9" fill={color} stroke="none"/></>,
    mail:  <><rect x="1.5" y="4" width="13" height="9" rx="1.5" {...p}/><path d="M1.5 4 8 9l6.5-5" {...p}/></>,
    box:   <><path d="M1.5 5.5 8 1.5l6.5 4v5L8 14.5l-6.5-4v-5z" {...p}/><path d="M1.5 5.5 8 9.5l6.5-4M8 9.5v5" {...p}/></>,
    clip:  <><rect x="3" y="2.5" width="10" height="12" rx="1.5" {...p}/><path d="M6 2.5a2 2 0 0 1 4 0M5.5 7.5h5M5.5 10.5h3.5" {...p}/></>,
    bell:  <><path d="M3.5 6.5a4.5 4.5 0 0 1 9 0v5H3.5v-5z" {...p}/><path d="M1.5 11.5h13M6.5 13.5a1.5 1.5 0 0 0 3 0" {...p}/></>,
    chart: <><rect x="1" y="9" width="3.5" height="5.5" rx=".5" fill={color} stroke="none"/><rect x="6.25" y="5" width="3.5" height="9.5" rx=".5" fill={color} stroke="none"/><rect x="11.5" y="1.5" width="3.5" height="13" rx=".5" fill={color} stroke="none"/></>,
    send:  <><path d="M14 2 2 7l4.5 2.5L14 2 9.5 14 7 9.5 14 2z" {...p}/></>,
    reco:  <><path d="M3 8h10M8 3l5 5-5 5" {...p}/></>,
  };
  return(
    <svg width={size} height={size} viewBox={v} fill="none" style={{display:"block",flexShrink:0}}>
      {i[n]||null}
    </svg>
  );
}



function StepLeft({num,title,desc,step}){
  return(
    <div style={{flex:"0 0 36%",borderRight:`1px solid ${BD}`,padding:"26px 28px",
      display:"flex",flexDirection:"column",justifyContent:"center",background:"#fafffe"}}>
      <div className="a1" style={{fontSize:9,fontWeight:800,color:LT,textTransform:"uppercase",
        letterSpacing:".13em",marginBottom:12}}>De la donnée à la décision</div>
      <div className="a2" style={{fontSize:64,fontWeight:900,lineHeight:1,color:BG,
        WebkitTextStroke:`2px ${BD}`,marginBottom:0,userSelect:"none"}}>
        {num}
      </div>
      <div className="a3" style={{fontSize:28,fontWeight:900,color:TX,marginBottom:12,lineHeight:1.1}}>
        {title}
      </div>
      <div className="a4" style={{width:36,height:3,background:P,borderRadius:2,marginBottom:14}}/>
      <div className="a5" style={{fontSize:11.5,fontWeight:600,color:MID,lineHeight:1.75,marginBottom:22}}>
        {desc}
      </div>
      <div className="a6" style={{display:"flex",gap:7,alignItems:"center"}}>
        {[1,2,3,4].map(d=>(
          <div key={d} style={{width:d===step?18:7,height:7,borderRadius:100,
            background:d===step?P:BD,transition:"all .35s ease"}}/>
        ))}
      </div>
    </div>
  );
}


/* ════ SOUND TOGGLE ══════════════════════════════════════ */
function SpeakerOn(){
  return(
    <svg width={15} height={15} viewBox="0 0 16 16" fill="none">
      <path d="M2 5.5h2.5L8 2.5v11l-3.5-3H2v-5z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round"/>
      <path d="M10 5a3.5 3.5 0 0 1 0 6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"/>
      <path d="M11.5 3a6 6 0 0 1 0 10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"/>
    </svg>
  );
}
function SpeakerOff(){
  return(
    <svg width={15} height={15} viewBox="0 0 16 16" fill="none">
      <path d="M2 5.5h2.5L8 2.5v11l-3.5-3H2v-5z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round"/>
      <path d="M11 6l3 4M14 6l-3 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"/>
    </svg>
  );
}
function SoundToggle({on, toggle}){
  return(
    <button onClick={toggle} style={{
      position:"fixed",top:14,right:18,zIndex:300,
      background:on?"rgba(0,86,83,.85)":"rgba(0,0,0,.35)",
      backdropFilter:"blur(8px)",
      border:`1px solid ${on?"rgba(33,196,93,.4)":"rgba(255,255,255,.18)"}`,
      borderRadius:50,padding:"7px 13px",
      display:"flex",alignItems:"center",gap:6,
      cursor:"pointer",color:"#fff",fontSize:11,fontWeight:800,
      transition:"all .2s",letterSpacing:".03em",
    }}>
      {on?<SpeakerOn/>:<SpeakerOff/>}
      {on?"Son activé":"Son"}
    </button>
  );
}

/* ════ PANEL LOGIN ═══════════════════════════════════════ */
function PanelLogin({active}){
  const emailText="boulangerie.martin@gmail.com";
  const[eChars,setEChars]=useState(0);
  const[showPwd,setShowPwd]=useState(false);
  const[btnState,setBtnState]=useState(0);
  // 0=idle 1=hover 2=loading 3=done

  useEffect(()=>{
    if(!active){setEChars(0);setShowPwd(false);setBtnState(0);return;}
    const timers=[];
    let emailIv;

    // type email at 0.7s
    timers.push(setTimeout(()=>{
      let i=0;
      emailIv=setInterval(()=>{i++;setEChars(i);if(i>=emailText.length)clearInterval(emailIv);},42);
    },700));

    // show password at 2.2s
    timers.push(setTimeout(()=>setShowPwd(true),2200));
    // button hover at 3.2s
    timers.push(setTimeout(()=>setBtnState(1),3200));
    // button loading at 3.7s
    timers.push(setTimeout(()=>setBtnState(2),3700));
    // button success at 4.5s
    timers.push(setTimeout(()=>setBtnState(3),4500));

    return()=>{timers.forEach(clearTimeout);if(emailIv)clearInterval(emailIv);};
  },[active]);


  // ── Sons ──
  const prevEChars = useRef(0);
  useEffect(()=>{
    if(eChars > prevEChars.current) playType();
    prevEChars.current = eChars;
  },[eChars]);
  useEffect(()=>{ if(btnState===3) playLoginSuccess(); },[btnState]);

  const btnLabel = btnState===3 ? "✓ Connecté · Chargement du tableau de bord…"
    : btnState===2 ? "Connexion en cours…"
    : "Accéder à mon tableau de bord →";
  const btnBg = btnState===3 ? G : P;
  const btnShadow = btnState===3
    ? "0 4px 16px rgba(33,196,93,.4)"
    : btnState===1 ? "0 6px 20px rgba(0,86,83,.45)"
    : "0 4px 16px rgba(0,86,83,.35)";

  return(
    <div style={{height:"100%",background:P,display:"flex",alignItems:"center",justifyContent:"center",
      flexDirection:"column",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,
        background:"radial-gradient(ellipse at 65% 35%, rgba(33,196,93,.09) 0%, transparent 58%)"}}/>

      {/* Login card */}
      <div className="a1" style={{background:"#fff",borderRadius:22,padding:"30px 32px",width:"100%",maxWidth:320,
        position:"relative",zIndex:1,boxShadow:"0 40px 90px rgba(0,0,0,.22)"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:22}}>
          <LogoSVG width={54} showLabel fillColor={P} brightGreen={G} labelColor={MID}/>
        </div>
        <div style={{fontSize:13.5,fontWeight:900,color:TX,textAlign:"center",marginBottom:4}}>
          Connexion à votre espace
        </div>
        <div style={{fontSize:10,fontWeight:600,color:"#6aaca8",textAlign:"center",marginBottom:20}}>
          NVM Finance · Espace client
        </div>

        {/* Email field */}
        <div style={{marginBottom:11}}>
          <div style={{fontSize:10,fontWeight:800,color:MID,marginBottom:5}}>Adresse email</div>
          <div style={{background:BG,border:`1px solid ${eChars>0?BD:"#e5e7eb"}`,borderRadius:10,
            padding:"10px 14px",fontSize:11,color:TX,minHeight:38,
            transition:"border-color .3s"}}>
            {emailText.slice(0,eChars)}
            {eChars>0&&eChars<emailText.length&&(
              <span style={{display:"inline-block",width:1.5,height:12,background:P,
                verticalAlign:"middle",animation:"pdot 0.7s infinite",marginLeft:1}}/>
            )}
          </div>
        </div>

        {/* Password field */}
        <div style={{marginBottom:18,opacity:showPwd?1:0,transform:showPwd?"translateY(0)":"translateY(6px)",
          transition:"opacity .4s ease, transform .4s ease"}}>
          <div style={{fontSize:10,fontWeight:800,color:MID,marginBottom:5}}>Mot de passe</div>
          <div style={{background:BG,border:`1px solid ${BD}`,borderRadius:10,
            padding:"10px 14px",fontSize:11,color:"#9ca3af",letterSpacing:"4px"}}>
            ••••••••••
          </div>
        </div>

        {/* Button */}
        <div style={{background:btnBg,color:"#fff",padding:"12px",borderRadius:11,
          textAlign:"center",fontSize:11.5,fontWeight:900,cursor:"pointer",
          boxShadow:btnShadow,
          transform:btnState===1?"scale(1.02)":"scale(1)",
          transition:"all .25s ease"}}>
          {btnState===2&&<span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"rgba(255,255,255,.8)",marginRight:8,verticalAlign:"middle",animation:"pdot 0.5s infinite"}}/>}
          {btnLabel}
        </div>

        {/* Loading bar */}
        {btnState>=2&&(
          <div style={{height:3,background:"rgba(0,86,83,.1)",borderRadius:100,marginTop:10,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:100,
              background:btnState>=3?G:P,
              width:btnState>=3?"100%":"55%",
              transition:"width 0.75s ease, background .4s ease"}}/>
          </div>
        )}
      </div>

      {/* Tagline */}
      <div className="a2" style={{marginTop:22,textAlign:"center",position:"relative",zIndex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.3)",letterSpacing:".04em",marginBottom:8}}>
          De la donnée à la décision, en 4 étapes.
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:6}}>
          {["01 Visualisez","02 Analysez","03 Optimisez","04 Automatisez"].map((s,i)=>(
            <div key={i} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.28)",
              background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",
              borderRadius:100,padding:"4px 10px"}}>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ════ PANEL 01 · VISUALISEZ ════════════════════════════ */
function PanelVisu({active}){
  const ca    = useCounter(35400, active, 1300);
  const treso = useCounter(94200, active, 1700);
  const ebe   = useCounter(18750, active, 1500);
  const marge = useCounter(605,   active, 1000);
  const fmt   = n=>n.toLocaleString("fr-FR")+" €";



  const months=[
    {h:13,m:"Jan"},{h:16,m:"Fév"},{h:11,m:"Mar"},
    {h:18,m:"Avr"},{h:20,m:"Mai"},{h:26,m:"Jun"},
  ];

  return(
    <div style={{height:"100%",background:"#fff",display:"flex"}}>
      <StepLeft num="01" title="Visualisez" step={1}
        desc="Toutes vos données financières et opérationnelles dans un tableau de bord clair, mis à jour chaque mois."/>

      {/* ── DROITE : dashboard complet + popups ── */}
      <div style={{flex:1,background:BG,position:"relative",display:"flex",
        alignItems:"center",justifyContent:"center",overflow:"hidden",padding:"10px 10px 10px 4px"}}>

        {/* POPUP 1 · CA record */}
        <div className="vp1" style={{position:"absolute",top:8,right:8,zIndex:30}}>
          <div className="fl4" style={{filter:"drop-shadow(0 4px 12px rgba(0,86,83,.12))"}}>
            <div style={{background:"#fff",borderRadius:13,border:"1px solid #bbf7d0",
              padding:"9px 13px",display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:30,height:30,borderRadius:8,background:"#f0fdf4",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}><Ico n="up" size={15} color="#059669"/></div>
              <div>
                <div style={{fontSize:10.5,fontWeight:900,color:"#059669",whiteSpace:"nowrap"}}>CA record ce mois !</div>
                <div style={{fontSize:9,fontWeight:600,color:"#6aaca8"}}>35 400 € · +18% vs N−1</div>
              </div>
            </div>
          </div>
        </div>

        {/* POPUP 2 · Prévisionnel */}
        <div className="vp2" style={{position:"absolute",top:"42%",right:8,zIndex:30}}>
          <div className="fl3" style={{filter:"drop-shadow(0 4px 12px rgba(0,86,83,.12))"}}>
            <div style={{background:"#fff",borderRadius:13,border:`1px solid ${BD}`,
              padding:"9px 13px",display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:30,height:30,borderRadius:8,background:BG,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}><Ico n="trend" size={15} color={P}/></div>
              <div>
                <div style={{fontSize:10.5,fontWeight:900,color:P,whiteSpace:"nowrap"}}>Prévisionnel N+1</div>
                <div style={{fontSize:9,fontWeight:600,color:"#6aaca8"}}>CA estimé : 41 200 € · +16%</div>
              </div>
            </div>
          </div>
        </div>

        {/* POPUP 3 · Alerte marge (pulsing red) */}
        <div className="vp3" style={{position:"absolute",bottom:8,right:8,zIndex:30}}>
          <div className="fl4" style={{filter:"drop-shadow(0 4px 12px rgba(220,38,38,.15))"}}>
            <div className="aglow" style={{borderRadius:13,border:"1.5px solid #fca5a5"}}>
              <div style={{background:"#fff",borderRadius:12,
                padding:"9px 13px",display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:30,height:30,borderRadius:8,background:"#fef2f2",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}><Ico n="warn" size={15} color="#dc2626"/></div>
                <div>
                  <div style={{fontSize:10.5,fontWeight:900,color:"#dc2626",whiteSpace:"nowrap"}}>Alerte · Marge −3 pts</div>
                  <div style={{fontSize:9,fontWeight:600,color:"#6aaca8"}}>Analyse conseiller requise</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dashboard card ── */}
        <div className="fl" style={{background:"#fff",borderRadius:20,
          boxShadow:"0 24px 70px rgba(0,86,83,.13),0 0 0 1px rgba(0,86,83,.06)",
          width:"82%",maxWidth:415,padding:"17px"}}>

          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}>
            <div>
              <div style={{fontSize:9,fontWeight:800,color:"#6aaca8",textTransform:"uppercase",
                letterSpacing:".08em",marginBottom:2}}>Tableau de bord · Mois N</div>
              <div style={{fontSize:13.5,fontWeight:900,color:TX}}>Boulangerie Martin</div>
            </div>
            <LiveBadge/>
          </div>

          {/* 4 KPIs — grille 2×2 */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
            {[
              {l:"CA mensuel",  v:fmt(ca),                     d:"+18%",     c:"#059669",bg:"#f8fffe"},
              {l:"Marge brute", v:`${(marge/10).toFixed(1)}%`, d:"+1.2 pts", c:"#059669",bg:BG},
              {l:"EBE",         v:fmt(ebe),                    d:"+24%",     c:"#059669",bg:BG},
              {l:"Trésorerie",  v:fmt(treso),              d:"✓ Sécurisé",c:P,       bg:"#f8fffe"},
            ].map((k,i)=>(
              <div key={i} style={{background:k.bg,borderRadius:10,
                padding:"9px 11px",border:`1px solid ${BD}`}}>
                <div style={{fontSize:7.5,fontWeight:700,color:"#6aaca8",textTransform:"uppercase",
                  letterSpacing:".05em",marginBottom:3}}>{k.l}</div>
                <div style={{fontSize:16.5,fontWeight:900,color:TX,fontVariantNumeric:"tabular-nums",
                  lineHeight:1,transition:"all .4s ease"}}>{k.v}</div>
                <div style={{fontSize:8.5,fontWeight:800,color:k.c,marginTop:3}}>{k.d}</div>
              </div>
            ))}
          </div>

          {/* Deux graphes côte à côte */}
          <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:6,marginBottom:8}}>

            {/* Courbe trésorerie — avec tooltip animé */}
            <div style={{background:"#f8fffe",borderRadius:10,padding:"10px 11px",border:`1px solid ${BD}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:8.5,fontWeight:800,color:MID}}>Trésorerie · 6 mois</span>
                <span style={{fontSize:8.5,fontWeight:800,color:G}}>↑ +12%</span>
              </div>
              <svg viewBox="0 0 190 50" width="100%" style={{display:"block",overflow:"visible"}}>
                <defs>
                  <linearGradient id="vg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={P} stopOpacity=".13"/>
                    <stop offset="100%" stopColor={P} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,42 C22,38 42,34 65,26 S108,14 138,7 S172,1 190,0 L190,50 L0,50 Z" fill="url(#vg1)"/>
                <path className="chartline"
                  d="M0,42 C22,38 42,34 65,26 S108,14 138,7 S172,1 190,0"
                  fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"
                  strokeDasharray="400" strokeDashoffset="400"/>
                {/* Tooltip animé au point actuel */}
                <g className="vtip">
                  <line x1="190" y1="0" x2="190" y2="50" stroke={BD} strokeWidth="1" strokeDasharray="2,2"/>
                  <circle cx="190" cy="0" r="4" fill={P}/>
                  <rect x="145" y="-15" width="54" height="15" rx="4" fill={P}/>
                  <text x="172" y="-4.5" textAnchor="middle" fontSize="7" fill="white"
                    fontFamily="Nunito" fontWeight="900">94 200 €</text>
                </g>
              </svg>
            </div>

            {/* Barres ventes mensuelles — poussent vers le haut */}
            <div style={{background:"#f8fffe",borderRadius:10,padding:"10px 11px",border:`1px solid ${BD}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:8.5,fontWeight:800,color:MID}}>Ventes N</span>
                <span style={{fontSize:8.5,fontWeight:700,color:"#6aaca8"}}>6 mois</span>
              </div>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",height:40}}>
                {months.map((b,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div className={`vb${i}`} style={{width:"100%",height:`${b.h}px`,
                      background:i===5?P:i===4?MID:BD,
                      borderRadius:"3px 3px 0 0",
                      transformOrigin:"center bottom"}}/>
                    <div style={{fontSize:6,fontWeight:700,color:"#9ca3af",lineHeight:1}}>{b.m}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Structure des coûts — barres horizontales */}
          <div style={{background:"#f8fffe",borderRadius:10,padding:"10px 11px",border:`1px solid ${BD}`}}>
            <div style={{fontSize:8,fontWeight:800,color:MID,textTransform:"uppercase",
              letterSpacing:".07em",marginBottom:8}}>Structure des coûts</div>
            {[
              {l:"Marge brute",     pct:61,c:P,        bg:BG},
              {l:"Masse salariale", pct:28,c:"#d97706", bg:"#fffbeb"},
              {l:"Charges fixes",   pct:22,c:"#6366f1", bg:"#eff6ff"},
            ].map((r,i)=>(
              <div key={i} style={{marginBottom:i<2?6:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:8,fontWeight:700,color:MID}}>{r.l}</span>
                  <span style={{fontSize:8,fontWeight:900,color:r.c}}>{r.pct}%</span>
                </div>
                <div style={{height:5,background:r.bg,borderRadius:100,overflow:"hidden",border:`1px solid ${BD}`}}>
                  <div className={`bar${i+1}`}
                    style={{"--w":`${r.pct}%`,width:0,height:"100%",background:r.c,borderRadius:100}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ════ PANEL 02 · ANALYSEZ ══════════════════════════════ */
function PanelAnalyse({active}){
  const MSG="Votre marge brute a chuté de 3 pts en juin. J'identifie deux leviers prioritaires : renégocier vos fournisseurs avant août et revoir le mix produits du rayon traiteur.";
  const typed = useTyping(MSG, active, 30);
  const showReco = typed.length >= MSG.length;

  return(
    <div style={{height:"100%",background:"#fff",display:"flex"}}>
      <StepLeft num="02" title="Analysez" step={2}
        desc="Un conseiller dédié décortique vos chiffres et identifie ce qui doit changer."/>

      <div style={{flex:1,background:BG,position:"relative",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",gap:12,padding:"14px 18px",overflow:"hidden"}}>

        {/* Carte RDV conseiller */}
        <div className="nb1" style={{position:"absolute",top:10,right:10,zIndex:10}}>
          <div className="fl4">
            <Notif icon="cal" title="Prochain RDV · 15 juil · 10h" sub="Analyse mensuelle · Visio 30 min" color="#6366f1"/>
          </div>
        </div>

        {/* Graphe avec anomalie détectée */}
        <div className="fl" style={{background:"#fff",borderRadius:18,width:"90%",maxWidth:400,
          boxShadow:"0 20px 60px rgba(0,86,83,.12),0 0 0 1px rgba(0,86,83,.06)",padding:"16px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:900,color:TX}}>Rapport d'analyse · Mois N</div>
            <div style={{fontSize:9,fontWeight:800,color:"#dc2626",background:"#fef2f2",
              border:"1px solid #fecaca",borderRadius:100,padding:"3px 10px",
              display:"flex",alignItems:"center",gap:4}}>
              <Ico n="warn" size={10} color="#dc2626"/>1 anomalie</div>
          </div>
          {/* Mini graphe marge avec dip */}
          <svg viewBox="0 0 360 55" width="100%" style={{display:"block",overflow:"visible",marginBottom:10}}>
            <path d="M0,20 C50,18 100,16 150,14 S220,12 250,15 S290,30 310,35 S340,38 360,36"
              fill="none" stroke={BD} strokeWidth="1.5" strokeDasharray="4,3"/>
            <path className="chartline"
              d="M0,15 C50,13 100,11 150,10 S220,9 250,10 S285,35 305,40 S340,42 360,38"
              fill="none" stroke={MID} strokeWidth="2" strokeLinecap="round"
              strokeDasharray="600" strokeDashoffset="600"/>
            {/* Cercle anomalie */}
            <circle cx="305" cy="40" r="9" fill="none" stroke="#dc2626" strokeWidth="1.8"
              strokeDasharray="3,2" className="pop2"/>
            <text x="316" y="37" fontSize="9" fill="#dc2626" fontFamily="Nunito" fontWeight="800" className="pop3">−3 pts</text>
            {/* Labels */}
            {["Jan","Fév","Mar","Avr","Mai","Juin"].map((m,i)=>(
              <text key={i} x={i*72+6} y="54" fontSize="8" fill="#6aaca8" fontFamily="Nunito" fontWeight="700">{m}</text>
            ))}
          </svg>
          <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:9,
            padding:"8px 12px",fontSize:10,fontWeight:800,color:"#dc2626"}}>
            <span style={{display:"flex",gap:6,alignItems:"center"}}><Ico n="warn" size={11} color="#dc2626"/>Marge brute en baisse · −3 pts vs mai · Cause : coût matières premières</span>
          </div>
        </div>

        {/* Carte conseiller avec frappe en direct */}
        <div className="fl2" style={{background:"#fff",borderRadius:18,width:"90%",maxWidth:400,
          boxShadow:"0 16px 50px rgba(0,86,83,.10),0 0 0 1px rgba(0,86,83,.06)",padding:"14px 16px"}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:P,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#fff",flexShrink:0}}>
              NVM
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:900,color:TX}}>Votre conseiller</div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:G,animation:"pdot 2s infinite"}}/>
                <span style={{fontSize:9,fontWeight:700,color:"#6aaca8"}}>En ligne · répond en direct</span>
              </div>
            </div>
          </div>
          <div style={{background:BG,borderRadius:12,padding:"11px 13px",
            border:`1px solid ${BD}`,minHeight:56,position:"relative"}}>
            <div style={{fontSize:11,fontWeight:600,color:TX,lineHeight:1.6}}>
              {typed}
              {typed.length < MSG.length && (
                <span style={{display:"inline-block",width:2,height:13,background:P,
                  marginLeft:2,verticalAlign:"middle",animation:"pdot 0.8s infinite"}}/>
              )}
            </div>
          </div>
          {showReco && (
            <div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap",animation:"fadeUp .4s both"}}>
              {[
                {ic:"bulb",t:"Renégocier fournisseurs"},
                {ic:"box", t:"Revoir mix produits"},
              ].map((r,i)=>(
                <div key={i} style={{fontSize:9.5,fontWeight:800,color:P,background:BG,
                  border:`1px solid ${BD}`,borderRadius:100,padding:"5px 11px",
                  display:"flex",alignItems:"center",gap:5}}>
                  <Ico n={r.ic} size={10} color={P}/>{r.t}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════ PANEL 03 · OPTIMISEZ ═════════════════════════════ */
function PanelOptim({active}){
  const seq = useSeq(3, active, 850, 400);
  const savings = useCounter(4080, active && seq>=2, 1600);
  const fmt = n=>n.toLocaleString("fr-FR")+" €";

  const cards=[
    {ic:"euro",label:"Charges fixes",   metric:"−340 €/mois",  detail:"Renégociation fournisseurs · contrats",c:"#059669",bg:"#f0fdf4",bd:"#bbf7d0",pct:72},
    {ic:"trend",label:"Marge brute",      metric:"+4 pts",       detail:"Optimisation mix produits · tarifs",   c:P,        bg:BG,       bd:BD,       pct:85},
    {ic:"target",label:"Développement CA", metric:"+12% estimé",  detail:"Nouveau segment clientèle identifié",  c:"#6366f1",bg:"#eff6ff",bd:"#bfdbfe",pct:60},
  ];

  return(
    <div style={{height:"100%",background:"#fff",display:"flex"}}>
      <StepLeft num="03" title="Optimisez" step={3}
        desc="Des solutions concrètes pour réduire vos coûts et développer votre activité."/>

      <div style={{flex:1,background:BG,position:"relative",display:"flex",
        alignItems:"center",justifyContent:"center",padding:"14px 18px",overflow:"hidden"}}>

        <div className="nb1" style={{position:"absolute",top:10,right:10,zIndex:10}}>
          <div className="fl4">
            <Notif icon="check" title="Plan d'action validé" sub="3 opportunités · mis en place" color="#059669"/>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:11,width:"90%",maxWidth:400}}>
          {cards.map((c,i)=>(
            seq >= i ? (
              <div key={i} style={{background:"#fff",borderRadius:16,
                boxShadow:"0 10px 40px rgba(0,86,83,.1),0 0 0 1px rgba(0,86,83,.06)",
                padding:"14px 16px",animation:"popIn .38s both"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                  <div style={{width:38,height:38,borderRadius:11,background:c.bg,border:`1px solid ${c.bd}`,
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Ico n={c.ic} size={18} color={c.c}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8.5,fontWeight:800,color:c.c,textTransform:"uppercase",
                      letterSpacing:".09em",marginBottom:2}}>{c.label}</div>
                    <div style={{fontSize:16,fontWeight:900,color:TX}}>{c.metric}</div>
                  </div>
                  <div style={{fontSize:9,fontWeight:800,color:c.c,background:c.bg,
                    border:`1px solid ${c.bd}`,borderRadius:100,padding:"4px 10px"}}>
                    Identifié
                  </div>
                </div>
                <div style={{height:7,background:c.bg,borderRadius:100,overflow:"hidden",marginBottom:6}}>
                  <div style={{width:`${c.pct}%`,height:"100%",background:c.c,borderRadius:100}}/>
                </div>
                <div style={{fontSize:9.5,fontWeight:600,color:"#6aaca8"}}>{c.detail}</div>
              </div>
            ) : (
              <div key={i} style={{height:72,borderRadius:16,background:"rgba(0,86,83,.04)",
                border:`1px dashed ${BD}`}}/>
            )
          ))}

          {/* Savings counter */}
          {seq >= 2 && (
            <div style={{background:P,borderRadius:14,padding:"14px 18px",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              animation:"popIn .4s both",boxShadow:"0 8px 24px rgba(0,86,83,.25)"}}>
              <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,.7)"}}>
                Économies annuelles estimées
              </div>
              <div style={{fontSize:22,fontWeight:900,color:G,fontVariantNumeric:"tabular-nums"}}>
                {fmt(savings)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════ PANEL 04 · AUTOMATISEZ ═══════════════════════════ */
function PanelAuto({active}){
  const seq = useSeq(5, active, 700, 400);
  const hours = useCounter(8, active && seq>=4, 1200);

  // ── Sons checkmarks ──
  const prevSeq = useRef(-1);
  useEffect(()=>{
    if(seq > prevSeq.current && seq > 0) playCheck();
    prevSeq.current = seq;
  },[seq]);


  const steps=[
    {ic:"mail",label:"Relances clients impayés",        auto:"Automatisé"},
    {ic:"box",label:"Commandes fournisseurs · réappro", auto:"Automatisé"},
    {ic:"send",label:"Envoi devis & confirmations",     auto:"Automatisé"},
    {ic:"clip",label:"Rapport comptable mensuel",        auto:"Automatisé"},
    {ic:"bell",label:"Alertes seuils personnalisés",    auto:"Automatisé"},
  ];

  return(
    <div style={{height:"100%",background:"#fff",display:"flex"}}>
      <StepLeft num="04" title="Automatisez" step={4}
        desc="Les process trop lourds ou trop coûteux sont automatisés pour vous faire gagner du temps."/>

      <div style={{flex:1,background:BG,position:"relative",display:"flex",
        alignItems:"center",justifyContent:"center",padding:"14px 18px",overflow:"hidden"}}>

        {/* Alerte auto déclenchée */}
        <div className="nb1" style={{position:"absolute",top:10,right:10,zIndex:10}}>
          <div className="fl4">
            <div style={{borderRadius:14,border:"1px solid #fed7aa"}}>
              <Notif icon="mail" title="Relance envoyée automatiquement" sub="Facture #142 · Client Dupont · 2 400 €" color="#d97706"/>
            </div>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:0,width:"90%",maxWidth:400}}>
          <div style={{background:"#fff",borderRadius:18,overflow:"hidden",
            boxShadow:"0 20px 60px rgba(0,86,83,.12),0 0 0 1px rgba(0,86,83,.06)"}}>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${BD}`,
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:12,fontWeight:900,color:TX}}>Vos process automatisés</div>
              <LiveBadge/>
            </div>
            {steps.map((s,i)=>(
              <div key={i} style={{padding:"12px 16px",borderBottom:i<4?`1px solid ${BD}`:"none",
                display:"flex",alignItems:"center",gap:12,
                background:seq>=i?"#fff":"#fafffe",
                transition:"background .3s"}}>
                <div style={{width:32,height:32,borderRadius:9,
                  background:seq>=i?BG:"rgba(0,86,83,.04)",
                  border:seq>=i?`1px solid ${BD}`:"1px dashed #e5e7eb",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  flexShrink:0,transition:"all .3s"}}>
                  {seq>=i?<Ico n={s.ic} size={15} color={seq>=i?P:"#9ca3af"}/>:"·"}
                </div>
                <div style={{flex:1,fontSize:11,fontWeight:700,
                  color:seq>=i?TX:"#9ca3af",transition:"color .3s"}}>
                  {s.label}
                </div>
                {seq>=i ? (
                  <div style={{display:"flex",alignItems:"center",gap:5,
                    animation:"checkPop .35s both"}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:"#f0fdf4",
                      border:"1.5px solid #bbf7d0",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width="8" height="7" viewBox="0 0 8 7">
                        <path d="M1 3.5l2 2 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                      </svg>
                    </div>
                    <span style={{fontSize:9,fontWeight:800,color:"#059669"}}>{s.auto}</span>
                  </div>
                ) : (
                  <div style={{fontSize:9,fontWeight:700,color:"#9ca3af"}}>En attente…</div>
                )}
              </div>
            ))}
          </div>

          {/* Temps gagné */}
          {seq>=4 && (
            <div style={{background:P,borderRadius:14,marginTop:11,padding:"13px 18px",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              animation:"popIn .4s both",boxShadow:"0 8px 24px rgba(0,86,83,.25)"}}>
              <div>
                <div style={{fontSize:9.5,fontWeight:800,color:"rgba(255,255,255,.55)",marginBottom:2}}>
                  Temps gagné chaque mois
                </div>
                <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)"}}>
                  de tâches répétitives supprimées
                </div>
              </div>
              <div style={{fontSize:32,fontWeight:900,color:G,fontVariantNumeric:"tabular-nums"}}>
                {hours}h
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════ PANEL OUTRO ═══════════════════════════════════════ */
function PanelOutro({restart}){

  useEffect(()=>{ if(active!==false) playSuccess(); },[]);

  const offs=[
    {t:"Offre Finance",  p:"490€/mois", c:G,        feats:["Tableau de bord","Alertes auto","Conseiller dédié","Prévisionnel"]},
    {t:"Module Gestion", p:"100€/mois", c:"#f59e0b", feats:["Planning équipe","Kanban tâches","Congés & stock","Onboarding"]},
    {t:"Sur-mesure",     p:"Sur devis", c:"#a78bfa", feats:["Site web","Outil métier","Intégration","Accompagnement"]},
  ];
  return(
    <div style={{height:"100%",background:P,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:"28px 36px"}}>
      <div className="a1" style={{marginBottom:16}}>
        <LogoSVG width={72} showLabel fillColor="#fff" brightGreen={G} labelColor="rgba(255,255,255,.45)"/>
      </div>
      <div className="a2" style={{fontSize:20,fontWeight:900,color:"#fff",textAlign:"center",marginBottom:4,lineHeight:1.2}}>
        De la donnée à la décision, c&apos;est NVM Finance.
      </div>
      <div className="a3" style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.4)",marginBottom:22,textAlign:"center"}}>
        Choisissez l&apos;offre adaptée à votre étape. Démarrage en 48h · Sans engagement.
      </div>
      <div className="a4" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,width:"100%",maxWidth:680,marginBottom:20}}>
        {offs.map((o,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.11)",
            borderTop:`3px solid ${o.c}`,borderRadius:16,padding:"16px 14px"}}>
            <div style={{fontSize:9,fontWeight:800,color:o.c,textTransform:"uppercase",letterSpacing:".09em",marginBottom:4}}>{o.t}</div>
            <div style={{fontSize:18,fontWeight:900,color:"#fff",marginBottom:10}}>{o.p}</div>
            {o.feats.map((f,fi)=>(
              <div key={fi} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                <div style={{width:4,height:4,borderRadius:"50%",background:o.c,flexShrink:0}}/>
                <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.6)"}}>{f}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="a5" style={{display:"flex",gap:10,alignItems:"center"}}>
        <a href="https://calendly.com/nvmfinance-pro/30min" target="_blank" rel="noopener noreferrer"
          style={{background:G,color:"#fff",padding:"12px 28px",borderRadius:100,
            fontSize:13,fontWeight:900,textDecoration:"none",boxShadow:"0 8px 26px rgba(33,196,93,.4)"}}>
          Demander une analyse gratuite →
        </a>
        <a href="/services" style={{color:"rgba(255,255,255,.4)",fontSize:12,fontWeight:700,textDecoration:"none"}}>
          Toutes les offres
        </a>
      </div>
      <button className="a6" onClick={restart} style={{background:"none",border:"none",
        color:"rgba(255,255,255,.18)",fontSize:10,fontWeight:700,cursor:"pointer",marginTop:10}}>
        ↺ Revoir
      </button>
    </div>
  );
}

/* ════ PLAYER ════════════════════════════════════════════ */
export default function DemoPage(){
  const[elapsed,setElapsed]=useState(0);
  const[rk,setRk]=useState(0);
  const[soundOn,setSoundOn]=useState(false);
  const elRef=useRef(0);
  const lastTRef=useRef(null);
  const progRef=useRef(null);
  const prevCurRef=useRef(null);

  const restart=()=>{elRef.current=0;lastTRef.current=null;setElapsed(0);setRk(k=>k+1);};
  const cur=PANELS.find(p=>elapsed>=p.s&&elapsed<p.e)?.id||"outro";

  const toggleSound=()=>setSoundOn(v=>{setEnabled(!v);return !v;});

  // Panel transition sounds
  useEffect(()=>{
    if(prevCurRef.current && prevCurRef.current!==cur) playTransition();
    prevCurRef.current=cur;
  },[cur]);

  useEffect(()=>{
    let raf;
    const step=ts=>{
      if(!lastTRef.current)lastTRef.current=ts;
      const dt=Math.min((ts-lastTRef.current)/1000,.05);
      lastTRef.current=ts;
      elRef.current=Math.min(elRef.current+dt,TOTAL+.5);
      if(progRef.current)progRef.current.style.width=`${Math.min(elRef.current/TOTAL,1)*100}%`;
      raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);
    return()=>cancelAnimationFrame(raf);
  },[rk]);

  useEffect(()=>{
    const iv=setInterval(()=>setElapsed(Math.min(elRef.current,TOTAL)),100);
    return()=>clearInterval(iv);
  },[rk]);

  return(
    <div style={{fontFamily:"Nunito,sans-serif",background:"#f0f9f7",minHeight:"100vh",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px"}}>
      <style>{CSS}</style>
      <a href="/" style={{position:"fixed",top:14,left:18,zIndex:200,fontSize:11,fontWeight:700,
        color:MID,textDecoration:"none",letterSpacing:".05em",opacity:.55}}>← Retour</a>
      <SoundToggle on={soundOn} toggle={toggleSound}/>

      <div style={{position:"relative",width:"min(1100px,92vw)",aspectRatio:"16/9",
        borderRadius:22,overflow:"hidden",flexShrink:0,
        boxShadow:"0 2px 0 1px rgba(0,86,83,.08),0 40px 100px rgba(0,86,83,.2)"}}>

        <div key={rk} style={{position:"absolute",inset:0}}>
          <div className={`pan ${cur==="login"  ?"on":""}`}><PanelLogin active={cur==="login"}/></div>
          <div className={`pan ${cur==="visu"   ?"on":""}`}><PanelVisu    active={cur==="visu"}/></div>
          <div className={`pan ${cur==="analyse"?"on":""}`}><PanelAnalyse active={cur==="analyse"}/></div>
          <div className={`pan ${cur==="optim"  ?"on":""}`}><PanelOptim   active={cur==="optim"}/></div>
          <div className={`pan ${cur==="auto"   ?"on":""}`}><PanelAuto    active={cur==="auto"}/></div>
          <div className={`pan ${cur==="outro"  ?"on":""}`}><PanelOutro   restart={restart}/></div>
        </div>

        {/* Step dots */}
        <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",
          zIndex:20,display:"flex",gap:5,alignItems:"center"}}>
          {PANELS.map(p=>(
            <div key={p.id} style={{width:cur===p.id?18:5,height:5,borderRadius:100,
              background:cur===p.id?"#fff":"rgba(255,255,255,.3)",transition:"all .4s ease"}}/>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:2.5,
          background:"rgba(0,0,0,.08)",zIndex:25}}>
          <div ref={progRef} style={{height:"100%",width:"0%",background:G,
            boxShadow:"0 0 8px rgba(33,196,93,.5)"}}/>
        </div>
      </div>
    </div>
  );
}
