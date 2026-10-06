"use client";
import { useState } from "react";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { LogoSVG } from "@/components/ui/Logo";
import WhatsAppWidget from "@/components/WhatsAppWidget";

const C = { primary:"#005653", green:"#21C45D", bg:"#ecfdf5", text:"#002e2c", mid:"#2d6b68", light:"#a7d4d0", border:"#c8e8e5", muted:"#6aaca8" };

const Check = ({ light=false }: { light?: boolean }) => (
  <svg viewBox="0 0 14 14" fill="none" width="16" height="16" style={{flexShrink:0,marginTop:2}}>
    <circle cx="7" cy="7" r="7" fill={light?"rgba(255,255,255,.15)":C.bg}/>
    <path d="M4 7l2 2 4-4" stroke={light?C.green:C.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const STEPS = [
  { t:"Vous créez votre compte", d:"Nom de l'entreprise, email, téléphone : une minute suffit. Aucune carte bancaire demandée." },
  { t:"Vous importez votre relevé bancaire", d:"Un export CSV ou OFX depuis l'espace en ligne de votre banque. Les opérations sont classées automatiquement, et un classement se corrige en un clic." },
  { t:"Votre tableau de bord est prêt", d:"Chiffre d'affaires, charges, marge, salaires, résultat, TVA et IS, mois par mois, en un coup d'œil." },
];

const INCLUDED = [
  "Chiffre d'affaires et ventes",
  "Achats et marge brute",
  "Charges",
  "Masse salariale",
  "Résultat mois par mois",
  "TVA et impôt sur les sociétés",
];

const FAQ = [
  { q:"C'est vraiment gratuit ?", a:"Oui. Aucune carte bancaire n'est demandée et il n'y a aucun engagement. Le tableau de bord est la première étape pour voir clair dans vos chiffres." },
  { q:"Ça marche avec ma banque ?", a:"Avec toutes les banques qui permettent d'exporter un relevé en CSV ou OFX depuis leur espace en ligne, ce qui est le cas de la plupart. Des modèles Excel sont aussi disponibles pour saisir ventes, charges et salaires plus précisément." },
  { q:"Les chiffres sont-ils fiables ?", a:"Depuis un relevé bancaire, ce sont des estimations : les montants TTC sont convertis en HT avec votre taux de TVA. Ils donnent une vision juste de la tendance, et votre conseiller peut les affiner avec vous." },
  { q:"Qui a accès à mes données ?", a:"Votre espace est privé et protégé par votre mot de passe : seuls vous et votre conseiller y avez accès." },
  { q:"Et si je veux aller plus loin ?", a:"Trésorerie prévisionnelle, alertes, plan d'action : on peut piloter vos finances ensemble avec le pilotage mensuel, à 490 € HT/mois, sans engagement. Rien ne vous y oblige, le tableau de bord reste gratuit." },
];

// Aperçu illustratif (chiffres fictifs) de ce que contient le tableau de bord gratuit.
const MOCK_MONTHS = [
  { m:"Mai", ca:36, ch:30 }, { m:"Juin", ca:41, ch:31 }, { m:"Juil", ca:33, ch:29 },
  { m:"Août", ca:28, ch:26 }, { m:"Sept", ca:44, ch:32 }, { m:"Oct", ca:47, ch:33 },
];
const MOCK_KPIS = [
  { l:"Chiffre d'affaires", v:"47 200 €", d:"+7 %", up:true },
  { l:"Marge brute", v:"62 %", d:"+2 pts", up:true },
  { l:"Charges", v:"33 150 €", d:"+3 %", up:false },
  { l:"Résultat", v:"14 050 €", d:"+12 %", up:true },
];

function DashboardPreview() {
  const max = Math.max(...MOCK_MONTHS.map(x=>x.ca));
  return (
    <div aria-hidden="true" style={{background:"#fff",borderRadius:20,border:`1px solid ${C.border}`,boxShadow:"0 20px 60px rgba(0,86,83,.12)",padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:900,color:C.text}}>Tableau de bord · Octobre</div>
        <div style={{fontSize:10,fontWeight:800,color:C.primary,background:C.bg,border:`1px solid ${C.border}`,borderRadius:100,padding:"3px 10px",textTransform:"uppercase",letterSpacing:"0.08em"}}>Exemple</div>
      </div>
      <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
        {MOCK_KPIS.map(k=>(
          <div key={k.l} style={{background:"#f8fffe",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 12px"}}>
            <div style={{fontSize:10.5,fontWeight:700,color:C.muted,marginBottom:4}}>{k.l}</div>
            <div style={{fontSize:16,fontWeight:900,color:C.text,whiteSpace:"nowrap"}}>{k.v}</div>
            <div style={{fontSize:10.5,fontWeight:800,color:k.up?"#16a34a":"#d97706",marginTop:2}}>{k.d}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:11,fontWeight:800,color:C.mid,marginBottom:10,display:"flex",gap:14}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:3,background:C.primary}}/>Chiffre d&apos;affaires</span>
        <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:3,background:C.light}}/>Charges</span>
      </div>
      <div style={{display:"flex",alignItems:"flex-end",gap:12,height:120,borderBottom:`1px solid ${C.border}`,padding:"0 4px"}}>
        {MOCK_MONTHS.map(x=>(
          <div key={x.m} style={{flex:1,display:"flex",alignItems:"flex-end",justifyContent:"center",gap:3,height:"100%"}}>
            <div style={{width:"40%",height:`${(x.ca/max)*100}%`,background:C.primary,borderRadius:"4px 4px 0 0"}}/>
            <div style={{width:"40%",height:`${(x.ch/max)*100}%`,background:C.light,borderRadius:"4px 4px 0 0"}}/>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:12,padding:"6px 4px 0"}}>
        {MOCK_MONTHS.map(x=><div key={x.m} style={{flex:1,textAlign:"center",fontSize:10.5,fontWeight:700,color:C.muted}}>{x.m}</div>)}
      </div>
    </div>
  );
}

export default function FreeDashboardClient() {
  const [signup, setSignup] = useState({ company:"", email:"", phone:"", password:"", website:"" });
  const [signupStatus, setSignupStatus] = useState<"idle"|"sending"|"done">("idle");
  const [signupError, setSignupError] = useState<string|null>(null);
  const [signupSuggestion, setSignupSuggestion] = useState<string|null>(null);
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [openFaq, setOpenFaq] = useState<number|null>(0);

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupStatus("sending");
    setSignupError(null);
    setSignupSuggestion(null);
    try {
      const res = await fetch("/api/free-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...signup, source: "meta" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSignupError(data.error || "Une erreur est survenue, réessayez."); setSignupSuggestion(data.suggestion || null); setSignupStatus("idle"); return; }
      // Mêmes deux sessions que le formulaire de /services : le cookie (exigé par le
      // middleware de /dashboard) et le localStorage du client Supabase « simple »
      // que NVMFinance.jsx utilise pour savoir qui est connecté.
      const creds = { email: signup.email.trim().toLowerCase(), password: signup.password };
      const { error: cookieError } = await createClient().auth.signInWithPassword(creds);
      const { error: appError } = await createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string).auth.signInWithPassword(creds);
      if (cookieError || appError) { setSignupStatus("done"); return; }
      window.location.href = "/dashboard";
    } catch {
      setSignupError("Une erreur est survenue, réessayez.");
      setSignupStatus("idle");
    }
  };

  const scrollToForm = () => {
    document.getElementById("inscription")?.scrollIntoView({ behavior:"smooth", block:"center" });
    setTimeout(() => document.getElementById("signup-company")?.focus({ preventScroll:true }), 500);
  };

  const inputStyle = (withEye=false): React.CSSProperties => ({
    width:"100%",boxSizing:"border-box",padding:withEye?"13px 44px 13px 14px":"13px 14px",borderRadius:12,border:`1.5px solid ${C.border}`,
    fontSize:15,fontWeight:600,color:C.text,fontFamily:"inherit",outline:"none",background:"#fff",
  });

  return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"#f8fffe",color:C.text,minHeight:"100vh"}}>
      <WhatsAppWidget/>
      <style>{`
        .lp-input:focus{border-color:${C.primary}!important;box-shadow:0 0 0 3px rgba(0,86,83,.12);}
        .cta-main{transition:transform .2s, box-shadow .2s;}
        .cta-main:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(33,196,93,.4)!important;}
        @media(max-width:900px){
          .hero-grid{grid-template-columns:1fr!important;gap:28px!important;}
          .hero-pad{padding:32px 16px 40px!important;}
          .section-pad{padding:48px 16px!important;}
          .steps-grid{grid-template-columns:1fr!important;}
          .inside-grid{grid-template-columns:1fr!important;gap:28px!important;}
          .nav-inner{padding:12px 16px!important;}
        }
        @media(max-width:520px){
          .kpi-grid{grid-template-columns:1fr 1fr!important;}
          .hero-title{font-size:30px!important;}
          .login-label{display:none;}
        }
      `}</style>

      {/* HEADER — volontairement sans menu : un seul objectif sur cette page */}
      <header style={{background:"#fff",borderBottom:`1px solid ${C.border}`}}>
        <div className="nav-inner" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 48px",maxWidth:1200,margin:"0 auto"}}>
          <a href="/" style={{display:"flex",alignItems:"center"}}><LogoSVG width={72} showLabel={true}/></a>
          <a href="/auth/login" style={{fontSize:13,fontWeight:700,color:C.mid,textDecoration:"none",padding:"7px 12px",borderRadius:8}}>
            <span className="login-label">Déjà un compte ? </span><span style={{color:C.primary,fontWeight:800}}>Se connecter</span>
          </a>
        </div>
      </header>

      {/* HERO + FORMULAIRE */}
      <section className="hero-pad" style={{background:C.primary,padding:"56px 48px 64px"}}>
        <div className="hero-grid" style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:56,alignItems:"center",maxWidth:1120,margin:"0 auto"}}>
          <div>
            <div style={{display:"inline-block",background:"rgba(33,196,93,.18)",color:"#b9f5cf",fontSize:12,fontWeight:800,padding:"6px 14px",borderRadius:100,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:18}}>
              100 % gratuit · sans carte bancaire
            </div>
            <h1 className="hero-title" style={{fontSize:"clamp(32px,4vw,50px)",fontWeight:900,color:"#fff",lineHeight:1.08,margin:"0 0 18px"}}>
              Votre tableau de bord financier gratuit, prêt en quelques minutes.
            </h1>
            <p style={{fontSize:17,fontWeight:600,color:"rgba(255,255,255,.78)",lineHeight:1.6,margin:"0 0 24px",maxWidth:520}}>
              Vous importez votre relevé bancaire, on classe tout automatiquement : chiffre d&apos;affaires, charges, marge, salaires, résultat et TVA. Mois par mois, en un coup d&apos;œil.
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {["Sans carte bancaire, sans engagement","Compatible avec la plupart des banques (CSV ou OFX)","Un conseiller disponible pour démarrer ensemble"].map(t=>(
                <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",fontSize:15,fontWeight:700,color:"#fff"}}><Check light/>{t}</div>
              ))}
            </div>
          </div>

          <div id="inscription" style={{background:"#fff",borderRadius:22,padding:"28px 24px",boxShadow:"0 24px 70px rgba(0,0,0,.25)"}}>
            {signupStatus==="done" ? (
              <div style={{textAlign:"center",padding:"12px 4px"}}>
                <div style={{fontSize:20,fontWeight:900,color:C.primary,marginBottom:8}}>Votre compte est créé !</div>
                <div style={{fontSize:14.5,fontWeight:600,color:C.mid,lineHeight:1.6}}>
                  Il ne reste qu&apos;à vous connecter depuis l&apos;<a href="/auth/login" style={{color:C.primary,fontWeight:800}}>espace client</a> avec votre email et votre mot de passe.
                </div>
              </div>
            ) : (
              <form onSubmit={submitSignup} style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:21,fontWeight:900,color:C.text,lineHeight:1.2}}>Créer mon tableau de bord</div>
                <div style={{fontSize:13.5,fontWeight:700,color:C.muted,marginBottom:6}}>Accès immédiat, sans carte bancaire.</div>
                {[
                  {k:"company",ph:"Nom de votre entreprise",type:"text",ac:"organization"},
                  {k:"email",ph:"Email professionnel",type:"email",ac:"email"},
                  {k:"phone",ph:"Téléphone",type:"tel",ac:"tel"},
                  {k:"password",ph:"Mot de passe (8 caractères min.)",type:"password",ac:"new-password"},
                ].map(f=>(
                  <div key={f.k} style={{position:"relative"}}>
                    <input id={`signup-${f.k}`} className="lp-input" required aria-label={f.ph}
                      type={f.k==="password"&&showSignupPass?"text":f.type} autoComplete={f.ac} placeholder={f.ph} minLength={f.k==="password"?8:undefined}
                      value={signup[f.k as "company"|"email"|"phone"|"password"]}
                      onChange={e=>setSignup(prev=>({...prev,[f.k]:e.target.value}))}
                      style={inputStyle(f.k==="password")}/>
                    {f.k==="password"&&(
                      <button type="button" onClick={()=>setShowSignupPass(v=>!v)} aria-label={showSignupPass?"Masquer le mot de passe":"Afficher le mot de passe"}
                        style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.muted,display:"flex",padding:4}}>
                        {showSignupPass?<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
                          :<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                      </button>
                    )}
                  </div>
                ))}
                <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={signup.website}
                  onChange={e=>setSignup(prev=>({...prev,website:e.target.value}))}
                  style={{position:"absolute",left:"-9999px",width:1,height:1,opacity:0}}/>
                {signupError && <div style={{fontSize:13,fontWeight:700,color:"#dc2626"}}>{signupError}</div>}
                {signupSuggestion && (
                  <button type="button" onClick={()=>{ setSignup(prev=>({...prev,email:signupSuggestion})); setSignupSuggestion(null); setSignupError(null); }}
                    style={{alignSelf:"flex-start",background:C.bg,color:C.primary,border:`1px solid ${C.border}`,borderRadius:100,padding:"6px 12px",fontSize:12.5,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
                    Utiliser {signupSuggestion}
                  </button>
                )}
                <button type="submit" className="cta-main" disabled={signupStatus==="sending"}
                  style={{marginTop:4,background:C.green,color:C.text,padding:"15px",borderRadius:100,fontSize:15.5,fontWeight:900,border:"none",cursor:signupStatus==="sending"?"default":"pointer",opacity:signupStatus==="sending"?0.7:1,fontFamily:"inherit",boxShadow:"0 6px 24px rgba(33,196,93,.3)"}}>
                  {signupStatus==="sending"?"Création…":"Créer mon tableau de bord gratuit →"}
                </button>
                <div style={{fontSize:11,fontWeight:600,color:C.muted,lineHeight:1.5,textAlign:"center"}}>
                  En créant votre compte, vous acceptez les <a href="/cgv" style={{color:C.muted}}>CGV</a> et la <a href="/confidentialite" style={{color:C.muted}}>politique de confidentialité</a>. Un conseiller pourra vous appeler pour vous aider à démarrer.
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="section-pad" style={{padding:"72px 48px",maxWidth:1120,margin:"0 auto"}}>
        <h2 style={{fontSize:"clamp(24px,3vw,34px)",fontWeight:900,color:C.text,textAlign:"center",margin:"0 0 10px",lineHeight:1.15}}>Comment ça marche</h2>
        <p style={{fontSize:16,fontWeight:700,color:C.mid,textAlign:"center",margin:"0 0 36px"}}>Trois étapes, et vos chiffres sont enfin lisibles.</p>
        <div className="steps-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
          {STEPS.map((s,i)=>(
            <div key={s.t} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:18,padding:"24px 22px",boxShadow:"0 2px 12px rgba(0,86,83,.05)"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:C.primary,color:"#fff",fontSize:16,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>{i+1}</div>
              <div style={{fontSize:17,fontWeight:900,color:C.text,marginBottom:8,lineHeight:1.25}}>{s.t}</div>
              <div style={{fontSize:14.5,fontWeight:600,color:C.mid,lineHeight:1.6}}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CE QUE CONTIENT LE TABLEAU DE BORD */}
      <section style={{background:"#fff",borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>
        <div className="section-pad inside-grid" style={{padding:"72px 48px",maxWidth:1120,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:56,alignItems:"center"}}>
          <div>
            <h2 style={{fontSize:"clamp(24px,3vw,34px)",fontWeight:900,color:C.text,margin:"0 0 14px",lineHeight:1.15}}>Tout ce qu&apos;un dirigeant regarde, au même endroit.</h2>
            <p style={{fontSize:16,fontWeight:600,color:C.mid,lineHeight:1.65,margin:"0 0 22px"}}>
              Plus besoin d&apos;attendre le bilan pour savoir si le mois a été bon. On regroupe vos chiffres dans un tableau de bord clair, mis à jour à chaque import.
            </p>
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12,marginBottom:28}}>
              {INCLUDED.map(t=>(
                <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",fontSize:15,fontWeight:700,color:C.text}}><Check/>{t}</div>
              ))}
            </div>
            <button onClick={scrollToForm} className="cta-main"
              style={{background:C.green,color:C.text,padding:"14px 30px",borderRadius:100,fontSize:15,fontWeight:900,border:"none",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 6px 24px rgba(33,196,93,.3)"}}>
              Créer mon tableau de bord gratuit →
            </button>
          </div>
          <div>
            <DashboardPreview/>
            <div style={{fontSize:11.5,fontWeight:700,color:C.muted,textAlign:"center",marginTop:10}}>Aperçu avec des chiffres fictifs</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-pad" style={{padding:"72px 48px",maxWidth:760,margin:"0 auto"}}>
        <h2 style={{fontSize:"clamp(24px,3vw,34px)",fontWeight:900,color:C.text,textAlign:"center",margin:"0 0 28px",lineHeight:1.15}}>Vos questions</h2>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {FAQ.map((f,i)=>(
            <div key={f.q} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
              <button onClick={()=>setOpenFaq(openFaq===i?null:i)} aria-expanded={openFaq===i}
                style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"16px 18px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",fontSize:15.5,fontWeight:800,color:C.text}}>
                {f.q}
                <span style={{fontSize:20,fontWeight:700,color:C.primary,flexShrink:0,transform:openFaq===i?"rotate(45deg)":"none",transition:"transform .2s"}}>+</span>
              </button>
              {openFaq===i && <div style={{padding:"0 18px 16px",fontSize:14.5,fontWeight:600,color:C.mid,lineHeight:1.65}}>{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="hero-pad" style={{background:C.primary,padding:"64px 48px",textAlign:"center"}}>
        <h2 style={{fontSize:"clamp(26px,3vw,36px)",fontWeight:900,color:"#fff",margin:"0 0 12px",lineHeight:1.12}}>On commence ensemble ?</h2>
        <p style={{fontSize:16,fontWeight:600,color:"rgba(255,255,255,.75)",margin:"0 0 28px"}}>Votre tableau de bord est gratuit, et prêt en quelques minutes.</p>
        <button onClick={scrollToForm} className="cta-main"
          style={{background:C.green,color:C.text,padding:"16px 40px",borderRadius:100,fontSize:16,fontWeight:900,border:"none",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 24px rgba(33,196,93,.3)"}}>
          Créer mon tableau de bord gratuit →
        </button>
      </section>

      <footer style={{background:"#002e2c",padding:"24px 16px 88px",textAlign:"center"}}>
        <div style={{display:"flex",justifyContent:"center",gap:18,flexWrap:"wrap",marginBottom:10}}>
          {[{h:"/mentions-legales",l:"Mentions légales"},{h:"/confidentialite",l:"Confidentialité"},{h:"/cgv",l:"CGV"}].map(lk=>(
            <a key={lk.h} href={lk.h} style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.55)",textDecoration:"none"}}>{lk.l}</a>
          ))}
        </div>
        <p style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.35)",margin:0}}>© 2026 NVM Finance · Tous droits réservés</p>
      </footer>
    </div>
  );
}
