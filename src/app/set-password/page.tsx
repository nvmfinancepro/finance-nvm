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
  const [lienHs, setLienHs] = useState(false);
  const [aValider, setAValider] = useState<{ token_hash: string; type: "invite" | "recovery" } | null>(null);

  useEffect(() => {
    // Lien classique (/auth/v1/verify) : Supabase pose la session dans le hash de l'URL,
    // ou l'erreur (lien expiré ou déjà utilisé) s'il n'est plus valable.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Lien ?token_hash=… : rien n'est consommé à l'ouverture, seulement au clic sur le bouton.
    // Un aperçu de lien (WhatsApp, SMS, antivirus de messagerie) ne peut donc plus le griller.
    const query = new URLSearchParams(window.location.search);
    const token_hash = query.get("token_hash");
    const type = query.get("type");
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) { setSessionReady(true); return; }
      if (event !== "INITIAL_SESSION") return;
      if (token_hash && (type === "invite" || type === "recovery")) setAValider({ token_hash, type });
      else if (hash.get("error_code") || hash.get("error")) setLienHs(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const validerLien = async () => {
    if (!aValider) return;
    setLoading(true); setError("");
    const { error } = await supabase.auth.verifyOtp(aValider);
    setLoading(false);
    if (error) { setLienHs(true); return; }
    setSessionReady(true);
  };

  const handleSubmit = async () => {
    if (password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    // Prévient le conseiller que le compte vient d'être activé (une seule fois, sans bloquer).
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch("/api/compte-active", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => {});
    }
    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => { window.location.href = "/auth/login?success=1"; }, 2000);
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
        <div style={{fontSize:14,color:C.textLight}}>Redirection vers la page de connexion...</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg, ${C.primary} 0%, #003d3a 100%)`,fontFamily:"'Nunito',sans-serif"}}>
      <div style={{background:"white",borderRadius:20,padding:"48px 40px",width:"100%",maxWidth:420,boxShadow:"0 24px 60px rgba(0,0,0,0.3)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:32,fontWeight:900,color:C.primary,letterSpacing:"0.05em"}}>NVM FINANCE</div>
          <div style={{fontSize:13,color:C.textLight,marginTop:4,letterSpacing:"0.1em",textTransform:"uppercase"}}>Définir votre mot de passe</div>
        </div>

        {lienHs && !sessionReady ? (
          <div style={{textAlign:"center",color:C.text,fontSize:14,lineHeight:1.6}}>
            {"Ce lien n'est plus valable : il a déjà été utilisé ou il a dépassé 24 heures."}<br/>
            {"Demandez un nouveau lien à la personne qui vous a invité."}
          </div>
        ) : aValider && !sessionReady ? (
          <button onClick={validerLien} disabled={loading}
            style={{width:"100%",padding:"14px",background:C.primary,color:"white",border:"none",borderRadius:12,fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>
            {loading ? "Vérification..." : "Choisir mon mot de passe →"}
          </button>
        ) : !sessionReady ? (
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
