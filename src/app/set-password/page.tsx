"use client";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

function SetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase gère automatiquement le token depuis le hash de l'URL
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) setSessionReady(true);
    });
  }, []);

  const handleSubmit = async () => {
    if (password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true);
    setTimeout(() => { window.location.href = "/"; }, 2000);
  };

  const C = {
    primary: "#005653", bg: "#ecfdf5", text: "#002e2c",
    textLight: "#6aaca8", border: "#a7d4d0", green: "#059669"
  };

  if (success) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg, ${C.primary} 0%, #003d3a 100%)`}}>
      <div style={{background:"white",borderRadius:20,padding:"48px 40px",textAlign:"center",maxWidth:420}}>
        <div style={{fontSize:48,marginBottom:16}}>✅</div>
        <div style={{fontSize:20,fontWeight:900,color:C.primary,marginBottom:8}}>Mot de passe défini !</div>
        <div style={{fontSize:14,color:C.textLight}}>Redirection vers votre espace client...</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg, ${C.primary} 0%, #003d3a 100%)`,fontFamily:"'Nunito',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet"/>
      <div style={{background:"white",borderRadius:20,padding:"48px 40px",width:"100%",maxWidth:420,boxShadow:"0 24px 60px rgba(0,0,0,0.3)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:32,fontWeight:900,color:C.primary,letterSpacing:"0.05em"}}>NVM FINANCE</div>
          <div style={{fontSize:13,color:C.textLight,marginTop:4,letterSpacing:"0.1em",textTransform:"uppercase"}}>Définir votre mot de passe</div>
        </div>

        {!sessionReady ? (
          <div style={{textAlign:"center",color:C.textLight,fontSize:14}}>
            Vérification du lien en cours...
          </div>
        ) : (
          <>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:800,color:C.textLight,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Nouveau mot de passe</label>
              <input
                type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                style={{width:"100%",padding:"12px 16px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}
              />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:11,fontWeight:800,color:C.textLight,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Confirmer le mot de passe</label>
              <input
                type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
                placeholder="Répétez votre mot de passe"
                style={{width:"100%",padding:"12px 16px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}
              />
            </div>
            {error && <div style={{color:"#dc2626",fontSize:13,marginBottom:16,textAlign:"center"}}>{error}</div>}
            <button onClick={handleSubmit} disabled={loading}
              style={{width:"100%",padding:"14px",background:C.primary,color:"white",border:"none",borderRadius:12,fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>
              {loading ? "Enregistrement..." : "Définir mon mot de passe →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#005653"}}/>}>
      <SetPasswordForm/>
    </Suspense>
  );
}
