"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoSVG } from "@/components/ui/Logo";

export default function LoginPage() {
  const [email,  setEmail]  = useState("");
  const [pass,   setPass]   = useState("");
  const [err,    setErr]    = useState("");
  const [loading,setLoading]= useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent,  setForgotSent]  = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    setLoading(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setErr("Identifiants incorrects. Vérifiez votre e-mail et mot de passe.");
    else router.push("/dashboard");
    setLoading(false);
  };

  const handleForgot = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    if (error) { setErr(error.message); return; }

    // Enregistrer la demande en base pour notifier l'admin
    await supabase.from("reset_requests").insert({ email: forgotEmail, name: forgotEmail, status: "pending" });
    setForgotSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #003d3a 0%, #005653 55%, #00706c 100%)" }}>

      {/* Modal mot de passe oublié */}
      {forgot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-2xl">
            {!forgotSent ? (
              <>
                <h2 className="text-lg font-black text-gray-800 mb-2">Mot de passe oublié</h2>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  Entrez votre e-mail. Un lien de réinitialisation vous sera envoyé et votre conseiller NVM sera notifié.
                </p>
                <input value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); setErr(""); }}
                  type="email" placeholder="vous@entreprise.fr"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3 outline-none focus:border-primary"/>
                {err && <p className="text-red-500 text-xs font-bold mb-3">{err}</p>}
                <div className="flex gap-3">
                  <button onClick={() => { setForgot(false); setErr(""); setForgotEmail(""); }}
                    className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50">
                    Annuler
                  </button>
                  <button onClick={handleForgot}
                    className="flex-2 flex-grow py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90">
                    Envoyer
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">✉</div>
                <h2 className="text-lg font-black text-green-600 mb-2">Demande envoyée</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Un lien de réinitialisation a été envoyé à <strong>{forgotEmail}</strong>.
                  Votre conseiller NVM Finance a également été notifié.
                </p>
                <button onClick={() => { setForgot(false); setForgotSent(false); setForgotEmail(""); }}
                  className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold">
                  Retour à la connexion
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formulaire login */}
      <div className="bg-white rounded-2xl p-10 w-[420px] shadow-2xl">
        <div className="flex justify-center mb-8">
          <LogoSVG width={180} showLabel />
        </div>
        <p className="text-xs text-gray-400 uppercase tracking-widest text-center mb-6">
          Espace de connexion sécurisé
        </p>

        {[{ label: "Adresse e-mail", val: email, set: setEmail, type: "email", ph: "vous@entreprise.fr" },
          { label: "Mot de passe",   val: pass,  set: setPass,  type: "password", ph: "••••••••" }
        ].map(f => (
          <div key={f.label} className="mb-4">
            <label className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block mb-1">{f.label}</label>
            <input value={f.val} onChange={e => f.set(e.target.value)} type={f.type} placeholder={f.ph}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-colors"/>
          </div>
        ))}

        {err && <p className="text-red-500 text-sm font-bold mb-3">{err}</p>}

        <button onClick={handleLogin} disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-xl text-sm font-extrabold hover:opacity-90 transition-opacity mt-1">
          {loading ? "Connexion…" : "Se connecter →"}
        </button>

        <div className="text-center mt-4">
          <button onClick={() => { setForgot(true); setErr(""); }}
            className="text-primary text-xs font-bold underline">
            Mot de passe oublié ?
          </button>
        </div>
      </div>
    </div>
  );
}
