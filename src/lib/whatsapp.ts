// Notification WhatsApp vers Nathan via CallMeBot (service gratuit, non officiel).
// Ne lève jamais : une notification ratée ne doit pas faire échouer l'action du client.
export async function notifyWhatsApp(text: string) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) {
    console.error("whatsapp: CALLMEBOT_PHONE / CALLMEBOT_APIKEY manquants, notification non envoyée");
    return false;
  }
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
    const res = await fetch(url);
    if (!res.ok) console.error("whatsapp: notification échouée", res.status);
    return res.ok;
  } catch (err) {
    console.error("whatsapp: notification échouée", err);
    return false;
  }
}
