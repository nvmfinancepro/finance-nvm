import { SupabaseClient } from "@supabase/supabase-js";

// Ses leads jamais appelés repartent pour les autres setters : ceux du stock y redeviennent libres,
// les autres (import Maps, base officielle, ajout à la main) sont retirés de l'outil, donc
// importables à nouveau par un collègue. Les rejetés et les leads déjà appelés restent.
export async function libererLeads(admin: SupabaseClient, setterId: string) {
  const { data: leads, error: e1 } = await admin.from("setter_prospects").delete()
    .eq("setter_id", setterId).eq("statut", "a_appeler").is("dernier_appel", null).in("verification", ["qualifie", "a_verifier"])
    .select("siren, source");
  if (e1) throw e1;
  const sirens = (leads || []).filter(l => l.source === "stock" && l.siren).map(l => l.siren as string);
  const libre = { statut: "libre", setter_id: null, sorti_le: null, recherche: null };
  for (let i = 0; i < sirens.length; i += 200) {
    const { error } = await admin.from("setter_stock").update(libre).eq("setter_id", setterId).in("siren", sirens.slice(i, i + 200));
    if (error) throw error;
  }
  // Leads réservés sans numéro (« Numéros à trouver ») : jamais entrés dans sa file.
  const { data: reserves, error: e2 } = await admin.from("setter_stock").update(libre)
    .eq("setter_id", setterId).eq("statut", "sorti").is("telephone", null).select("id");
  if (e2) throw e2;
  return (leads || []).length + reserves.length; // nombre de leads repartis
}
