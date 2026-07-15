# Fichiers audio de la démo

Sons (Mixkit, licence gratuite usage commercial) en place :

| Fichier | Source Mixkit | Déclenché quand |
|---|---|---|
| `sfx-type.wav` | Interface option select | Frappe clavier (throttlé à 1 son/140ms) |
| `sfx-pop.wav` | Bubble pop up alert notification | (prévu pour les pop-ups de notif — pas encore branché) |
| `sfx-transition.wav` | Technology transition slide | Changement de panneau/étape |
| `sfx-check.wav` | Correct answer reward | Chaque étape validée (panneau Automatisez) |
| `sfx-login-success.wav` | Positive notification | Connexion réussie (panneau Login) |
| `sfx-outro-success.wav` | Achievement bell | Arrivée sur le panneau final |

## Musique de fond — en pause

`music-ambient.mp3` n'est **pas encore présent**. Dans `sounds.js`, `MUSIC_ENABLED = false` désactive proprement la lecture (aucune requête, aucune erreur). Repasser à `true` et déposer le fichier une fois la piste choisie.

Si un fichier manque ou ne charge pas, le son correspondant est simplement ignoré (pas d'erreur, pas de crash).
