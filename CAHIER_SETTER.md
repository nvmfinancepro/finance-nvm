# Cahier des charges — Outil de travail des setters

Rédigé le 2026-10-16 avec Nathan. Toutes les décisions ci-dessous ont été tranchées par lui : ne pas les
remettre en question, et demander avant d'ajouter quoi que ce soit qui n'y figure pas.

## Contexte

Les setters appellent des dirigeants à froid pour leur faire réserver une visio de 30 min avec Nathan. Le
rôle, le script, les objections et les commissions sont expliqués sur la page publique
`src/app/espace-setter/page.tsx` (nvm-finance.fr/espace-setter). Il leur faut maintenant un **outil de
travail** : importer leurs prospects, les appeler, noter les résultats, poser les RDV et suivre leurs
commissions.

- **Équipe :** 1 à 3 setters. Pas de gestion d'équipe poussée.
- **Canal :** téléphone uniquement.
- **Appareils :** l'outil doit être aussi confortable sur ordinateur que sur téléphone.
- **Lieu :** l'outil se construit dans ce projet (Next.js + Supabase), sur une route à part, par exemple
  `/setter`. **Ne pas l'ajouter dans `NVMFinance.jsx`.**
- **Charte graphique :** palette NVM (`#005653`, `#21C45D`, `#ecfdf5`…), la même que l'objet `C` de
  `espace-setter/page.tsx`. Ne jamais changer ces couleurs.

## Hors périmètre (refusé par Nathan)

Ne pas construire :
- l'appel à l'API Google Places ;
- le lien avec la base de prospection LinkedIn de Nathan (`prospects.db`, autre projet) ;
- l'email de présentation en 1 clic ;
- les objectifs et le classement des setters ;
- la fiche de préparation de visio envoyée par email ;
- le suivi visio honorée / pas venu ;
- l'intégration de la téléphonie (Ringover/Aircall) : elle viendra peut-être plus tard. Ne rien construire
  aujourd'hui, mais ne pas fermer la porte (le journal d'appels doit pouvoir accueillir une durée et un
  enregistrement plus tard).

## Comptes et sécurité

- Nouveau rôle `SETTER` dans `public.profiles`. Nathan (ADMIN) crée les comptes setters depuis son espace,
  sur le modèle de `/api/invite` et `/api/create-cabinet` : route serveur, vérification du Bearer, service
  role.
- **Connexion :** un SETTER qui se connecte doit arriver sur `/setter`, jamais sur l'espace client.
  Vérifier le flux de connexion de `NVMFinance.jsx` (tables héritées `admin_users`/`client_users`, puis
  `profiles`) pour qu'un SETTER n'y tombe pas dans un état bancal.
- **RLS sur chaque nouvelle table :** ADMIN voit et écrit tout ; SETTER uniquement ses propres lignes
  (`setter_id = auth.uid()`). Un setter ne doit **jamais** voir les prospects d'un autre setter, ni aucune
  donnée client (finances, etc.). Vérifier aussi que les policies existantes ne donnent rien au rôle SETTER.
- Prochaine migration : `034_…`.

## Étape 1 — Import et vérification des prospects

### Ce que fait le setter
Il scrape Google Maps sur son propre Chrome avec l'extension **Instant Data Scraper**, puis glisse le
fichier (.xlsx ou .csv) dans l'outil. Ajouter sur la page d'import un petit guide pas à pas :
1. installer l'extension ;
2. chercher sur Google Maps, par exemple « nettoyage Bourg-en-Bresse » ;
3. faire défiler la liste jusqu'en bas ;
4. cliquer sur l'extension ;
5. télécharger en .xlsx ;
6. glisser le fichier ici.

### Format de l'export (exemple réel : `/Users/nathan/nvm-prospection/google.xlsx`, 127 lignes)
Les en-têtes sont des classes CSS de Google Maps (`hfpxzc href`, `xxVWCe`, `W4Efsd`, `UsdlK`,
`lcr4fd href`…). **Ils changent d'un export à l'autre** : reconnaître chaque colonne par son
**contenu**, jamais par son nom.

| Information | Comment la reconnaître |
|---|---|
| Lien Maps | URL `google.com/maps/place/…`. Contient la position GPS : `!3d<lat>!4d<lng>` |
| Nom | Texte court, une valeur différente sur presque chaque ligne |
| Catégorie | Peu de valeurs différentes, qui se répètent (« Couvreur », « Agence immobilière »…) |
| Téléphone | Format français (`04 37 62 90 06`) |
| Site web | URL hors Google. Une URL `google.com/aclk…` est une pub : la traiter comme « pas de site » |
| À ignorer | Horaires (« · Ferme à 20:00 »), extraits d'avis, colonnes vides |

À savoir sur cet export :
- il ne contient **ni adresse ni note Google** ;
- les premières lignes peuvent être vides ;
- 7 lignes sur 127 n'ont pas de téléphone : les écarter avec la raison « pas de téléphone ».

### Traitement de chaque ligne
1. **Normaliser le téléphone** (format +33…) et nettoyer le nom (le nom Maps contient parfois la ville :
   « Nettoyage X - Bourg-en-Bresse »).
2. **Anti-doublon sur toute la base, tous setters confondus**, par téléphone puis par SIREN. Comme la RLS
   cache aux setters les prospects des autres, cette vérification doit se faire **côté serveur** (contrainte
   d'unicité et/ou route serveur avec le service role). Un doublon est écarté avec la raison « déjà dans
   l'outil ». Ne jamais révéler à quel setter il appartient.
3. **Retrouver l'entreprise dans la base officielle** avec l'API gratuite
   `https://recherche-entreprises.api.gouv.fr/search` (sans clé ; vérifier la limite de débit dans sa doc et
   la respecter). Chercher par nom, puis départager les résultats par la distance entre le point GPS du lien
   Maps et les coordonnées des établissements renvoyés (`siege` / `matching_etablissements`). Champs utiles :
   `siren`, `nom_complet`, `nature_juridique`, `date_creation`, `finances` (CA par année, quand il est
   publié), `dirigeants` (prénom et nom du dirigeant personne physique).
4. **Appliquer l'ICP** (cible) de la page setter :
   - **Rejeté** si c'est une personne physique (entrepreneur individuel / micro-entreprise : code
     `nature_juridique` commençant par `1`), une entreprise créée il y a moins de 3 ans, une entreprise
     fermée, ou un dernier CA publié hors de la fourchette 20 k€ – 3 M€.
   - **Qualifié** si tout est OK. Un CA non publié n'est pas un motif de rejet.
   - **À vérifier** si l'entreprise n'est pas retrouvée avec certitude (l'enseigne Google est différente de
     la raison sociale). Le setter peut alors la valider ou la rejeter à la main.
5. **Afficher le résultat de l'import** : nombre de qualifiés, à vérifier et rejetés, avec la raison de
   chaque rejet.

Garder le prénom et le nom du dirigeant : le script demande « Je suis bien avec [Prénom Nom] ? ».

**Validation de l'étape 1 :** tester avec `google.xlsx` et montrer le résultat à Nathan avant de passer à
la suite.

## Étape 2 — Session d'appels et RDV

### File « prochain à appeler »
Ordre de la file : les rappels arrivés à échéance d'abord, puis les nouveaux qualifiés, puis les « pas de
réponse » à retenter.

La fiche à l'écran affiche :
- l'entreprise et le dirigeant ;
- la catégorie, l'ancienneté et le CA s'il est connu ;
- le site web et le lien Maps ;
- le **numéro cliquable** (`tel:`) ;
- l'historique des appels.

### Script et objections pendant l'appel
- Le script reste affiché pendant l'appel : l'accroche, personnalisée avec le prénom et le nom du
  dirigeant et le prénom du setter, plus les objections et la FAQ.
- **Une seule source de contenu :** extraire les tableaux `objections` et `faq` de
  `espace-setter/page.tsx` dans un module partagé (par ex. `src/lib/setter-script.ts`), utilisé par la page
  publique ET par l'outil.

### Résultat de l'appel en 1 clic
| Résultat | Ce qui se passe |
|---|---|
| Pas de réponse | Nouvel essai automatique à un autre moment de la journée (matin ↔ après-midi), le lendemain puis à J+2. Après 3 essais : « injoignable », sorti de la file mais consultable |
| Rappel daté | Le setter choisit la date et l'heure, et peut ajouter une note (cas « envoyez-moi un mail » : le setter envoie lui-même le lien du site et fixe le rappel) |
| RDV posé | Voir ci-dessous |
| Pas intéressé | Raison obligatoire (par ex. « déjà bien accompagné ») + note |
| Pas la cible | Raison |
| Faux numéro | — |

Chaque appel est enregistré dans un journal : prospect, setter, résultat, note, date.

### RDV posé
1. Le bouton ouvre `https://calendly.com/nvmfinance-pro/30min` dans un nouvel onglet, pré-rempli avec le
   nom et l'email si possible (paramètres `name` / `email` de Calendly).
2. Le setter réserve le créneau sur Calendly. **Il n'y a pas de lien automatique entre Calendly et
   l'outil** (choix de Nathan).
3. Il remplit la fiche de suivi de la page setter : date et heure du RDV, email du dirigeant, CA
   approximatif, enjeux mentionnés.

## Étape 3 — Espace admin (Nathan) et commissions

### Espace admin
- Liste des setters et création de leurs comptes.
- Tous les prospects, avec un filtre par setter.
- Stats par setter :
  - appels passés ;
  - appels décrochés (tous les résultats sauf « pas de réponse » et « faux numéro ») ;
  - RDV posés ;
  - clients signés ;
  - taux de conversion.
- Liste des RDV. Après la visio, Nathan marque **signé** avec la formule, ou **perdu**. Plus tard, il pourra
  marquer **client parti** avec une date de fin.

### Commissions (20 %, cf. page setter)
| Formule | Prix | Commission |
|---|---|---|
| Tableau de bord | Gratuit | 0 € |
| Pilotage mensuel | 490 € HT/mois | 98 € par mois, chaque mois civil où le client est actif, à partir du mois de signature et jusqu'à « client parti » |
| Audit one-shot | 3 000 € HT | 600 € une seule fois, le mois de signature |

- **Côté setter :** page « Mes gains » avec ses clients actifs, le total du mois en cours et l'historique.
- **Côté admin :** relevé mensuel par setter, exportable (CSV ou page imprimable).

## Étape 4 — Mise en ligne

- Appliquer les migrations sur Supabase et déployer comme d'habitude pour ce projet.
- Nathan crée le compte de son premier setter, puis on fait un test complet de bout en bout avec lui :
  import, appel, RDV, signature et commission.

## Méthode de travail

Nathan avance **étape par étape** : finir une étape, la lui montrer, attendre son feu vert, puis passer à
la suivante. Toujours expliquer simplement ce qui a été fait.
