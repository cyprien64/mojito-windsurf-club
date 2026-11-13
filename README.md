# 🌴 Mojito Windsurf Club

**Find your wind. Find your spot.**

Plateforme météo du club : conditions actuelles, prévisions sur 48 h et 7 jours, comparaison des modèles météo (ECMWF, GFS, ICON, ARPEGE, AROME), webcams et une fonctionnalité centrale, **« Où naviguer aujourd'hui ? »**, qui classe automatiquement les spots du club, avec un conseil matériel et le choix windsurf ou wing foil.

React · TypeScript · Vite · Tailwind CSS · Recharts · Lucide · Open-Meteo. PWA installable sur smartphone.

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Installation et lancement local](#installation-et-lancement-local)
3. [Arborescence](#arborescence)
4. [Modifier les spots](#modifier-les-spots)
5. [Modifier les paramètres de vent (sans code)](#modifier-les-paramètres-de-vent-sans-code)
6. [Ajouter une webcam](#ajouter-une-webcam)
7. [Algorithme de notation](#algorithme-de-notation)
8. [Déploiement](#déploiement)
9. [API et sources utilisées](#api-et-sources-utilisées)
10. [Notifications (évolutions)](#notifications-évolutions)
11. [Limites connues](#limites-connues)

---

## Fonctionnalités

| Page | Contenu |
|---|---|
| **Spots** (accueil) | Carte « 🌴 Où naviguer aujourd'hui ? », 5 cartes spots (photo, vent, rafales, direction, température, navigabilité, créneau conseillé), favoris ⭐ |
| **Où naviguer ?** | Classement 1 → 5 avec note /100, explications, meilleur créneau (début, dégradation, durée), avertissements de sécurité, détail des critères |
| **Conditions** | Vent moyen et rafales (nœuds et km/h), direction (degrés et cardinal), rose des vents du spot, navigabilité, force, orientation, stabilité, rafales, meilleur créneau, température, ressenti, pression, humidité, nuages, pluie, lever et coucher du soleil |
| **Prévisions** | 48 h heure par heure (vent, rafales, direction, température, pluie), créneaux favorables surlignés, sélection de période ; 7 jours jour par jour |
| **Modèles météo** | Tableau ECMWF / GFS / ICON / ICON-EU / ARPEGE / AROME HD, heure du dernier run de chaque modèle, graphique comparatif, indicateur d'accord (forte convergence, convergence moyenne, forte divergence) |
| **Webcams** | Webcams publiques intégrées (Viewsurf / office de tourisme de Leucate), rechargement automatique, plein écran, affichage multiple, liens vers les webcams proches pour les spots sans caméra |
| **Matériel** | Profil du rider (poids, niveau, voiles et ailes possédées) puis conseils : taille de voile, volume de planche, aileron, aile de wing, volume de planche de foil, aile avant, longueur de mât, et choix **windsurf ou wing foil** |
| **Week-end** | Meilleur spot et meilleur créneau du samedi et du dimanche |
| **Sur l'eau** | « J'y suis / j'y étais » : qui navigue en ce moment, retours de session, tailles de voile et d'aile réellement utilisées par le club *(nécessite Supabase)* |
| **Classement** | Classement général (distance, temps sur l'eau, sessions, vitesse moyenne, vitesse max) sur 7 jours, 30 jours, la saison ou tout, filtrable par spot, et **micro-compétitions** créées par les admins (période, spot, discipline, critère) avec podium *(nécessite Supabase)* |
| **Trajets** | Distance et temps de route vers chaque spot depuis votre position (GPS ou ville), avec liens Google Maps et Waze. Itinéraires OSRM / OpenStreetMap, sans trafic ; la position reste sur l'appareil |
| **Carte** | Carte OpenStreetMap des spots (couleur = navigabilité) et des balises de vent |
| **Comparer** | Plusieurs spots côte à côte (tableau et graphique 48 h) |
| **Historique** | 7 derniers jours (valeurs modélisées) et heures navigables par jour |
| **Alertes** | Règles de notification (vent > X nds, conditions favorables, modèles qui convergent) |
| **Admin** | Rose des vents interactive (idéale, acceptable, défavorable, dangereuse) par spot, seuils de vent et de rafales, pondérations, export et import |

Règles d'honnêteté appliquées partout :
- toutes les données viennent d'Open-Meteo, sans aucune valeur inventée. Une donnée manquante s'affiche « — » ou « indisponible » ;
- les conditions « actuelles » sont des **valeurs de modèle**, pas des mesures de station ; c'est indiqué à l'écran ;
- chaque modèle est nommé, avec l'heure de son dernier run ;
- aucune webcam n'est simulée : un spot sans webcam l'indique clairement ;
- une recommandation n'est jamais présentée comme une garantie de sécurité.

---

## Installation et lancement local

Prérequis : **Node.js 18+** (https://nodejs.org).

```bash
git clone https://github.com/<votre-compte>/mojito-windsurf-club.git
cd mojito-windsurf-club
npm install
npm run dev          # http://localhost:5173
```

Autres commandes :

```bash
npm run build        # vérification TypeScript + build de production dans dist/
npm run preview      # sert le build localement
```

---

## Arborescence

```
mojito-windsurf-club/
├── .github/workflows/deploy.yml   # build + déploiement GitHub Pages automatique
├── public/
│   ├── club-settings.json         # réglages partagés du club (exportés depuis Admin)
│   ├── manifest.webmanifest       # PWA
│   ├── sw.js                      # service worker (hors ligne, notifications)
│   ├── icons/                     # logo et icônes PWA
│   └── spots/                     # photos des spots (Wikimedia Commons, crédits dans spots.ts)
├── src/
│   ├── config/
│   │   ├── spots.ts               # ⭐ FICHIER CENTRAL : spots, GPS, orientations, seuils
│   │   ├── webcams.ts             # ⭐ liste des webcams
│   │   ├── models.ts              # modèles météo comparés
│   │   └── scoring.ts             # pondérations, seuils de notation, fréquences d'actualisation
│   ├── services/
│   │   ├── weather.ts             # API Open-Meteo (prévisions, modèles, métadonnées des runs)
│   │   ├── cache.ts               # cache localStorage + repli hors ligne
│   │   ├── webcams.ts             # service webcams
│   │   ├── settings.ts            # paramètres administrables (local / club / défaut)
│   │   └── notifications.ts       # règles d'alerte et notifications
│   ├── lib/
│   │   ├── scoring.ts             # ⭐ algorithme de notation, créneaux, accord des modèles
│   │   ├── wind.ts                # directions, secteurs, Beaufort, conversions
│   │   ├── format.ts              # formatage FR
│   │   └── weatherCodes.ts        # codes météo WMO
│   ├── context/AppContext.tsx     # état global : données, évaluations, favoris, réglages
│   ├── hooks/useSpotRoute.ts
│   ├── components/                # Layout, WindRose, SpotCard, RatingBadge, WindArrow…
│   ├── pages/                     # Home, WhereToSail, Conditions, Forecast, Models, Webcams,
│   │                              # Compare, HistoryPage, Alerts, Admin
│   ├── App.tsx                    # routes
│   ├── main.tsx
│   ├── index.css
│   └── types.ts
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
├── netlify.toml / vercel.json     # déploiement alternatif
└── README.md
```

---

## Modifier les spots

Tout se trouve dans **`src/config/spots.ts`**. Chaque spot contient :

```ts
{
  id: 'la-mine',                       // identifiant unique (utilisé dans les URL)
  name: 'Leucate – La Mine',
  shortName: 'La Mine',
  location: 'Étang de Leucate · Leucate (11)',
  kind: 'étang',                       // 'lac' | 'étang'
  lat: 42.8971, lon: 3.0155,           // coordonnées GPS du point de navigation
  coordSource: '…',                    // d'où viennent les coordonnées
  coordCheckedOn: '2026-11-13',
  photo: { src: 'spots/la-mine.jpg', author: '…', license: 'CC BY-SA 3.0', sourceUrl: '…', caption: '…' },
  info: 'Texte affiché sur le dashboard',
  defaults: { sectors: […16 valeurs…], speed: {…}, gusts: {…}, notes: '' },
}
```

**Coordonnées utilisées (vérifiées le 13/11/2026) :**

| Spot | Lat, Lon | Source |
|---|---|---|
| Lac du Gabas / Eslourenties | 43.2803, -0.1291 | OpenStreetMap, centre du « Réservoir du Gabas » |
| Lac de Léon | 43.8945, -1.3205 | OpenStreetMap / Nominatim, « Étang de Léon » |
| Leucate – La Mine | 42.8971, 3.0155 | Fiche spot unplug-kitesurf.com |
| Leucate – Parc à huîtres | 42.8732, 3.0350 | Windfinder, spot « Parc à huîtres » |
| Leucate – Éole | 42.8321, 3.0347 | Windfinder, spot « Eole » |
| Saint-Jean-de-Luz | 43.3887, -1.6627 | Windfinder, spot « Saint-Jean-de-Luz » (Grande Plage) |
| Lac marin d'Hossegor | 43.6722, -1.4287 | OpenStreetMap / Nominatim, « Lac d'Hossegor » |
| Étang de Soustons | 43.7703, -1.3277 | OpenStreetMap, centre de l'« Étang de Soustons » |
| Gruissan – Étang de Mateille | 43.1252, 3.1260 | OpenStreetMap / Nominatim, « Étang de Mateille » |
| Leucate – La Franqui (mer) | 42.9419, 3.0388 | OpenStreetMap, poste de secours des Coussoules |
| Lac de Lourdes | 43.1083, -0.0858 | OpenStreetMap, centre du « Lac de Lourdes » |
| Lac de la Ganguise | 43.3179, 1.8055 | OpenStreetMap / Nominatim, réservoir « Lac de la Ganguise » |
| Lac de Sanguinet | 44.4972, -1.0927 | Windfinder, spot « Lac de Sanguinet / Sanguinet » |
| Narbonne – La Nautique | 43.1420, 3.0093 | OpenStreetMap / Nominatim, port de Port-la-Nautique |

> Le « Lac de Cabas / Esclourentis » demandé correspond au **lac du Gabas** à **Eslourenties-Daban** (64) : c'est l'orthographe officielle utilisée dans le site.
> Pour plus de précision, remplacez ces coordonnées par celles de votre point de mise à l'eau habituel (clic droit dans Google Maps, puis copier les coordonnées).

**Ajouter un spot** : ajoutez un objet au tableau `SPOTS`. Il apparaît automatiquement partout (accueil, classement, prévisions, modèles, admin…).

**Photos** : déposez une image dans `public/spots/` et renseignez `photo`. Sans photo, une illustration est affichée.

---

## Modifier les paramètres de vent (sans code)

Page **Admin** du site :

1. Choisissez le spot.
2. Choisissez une catégorie (**Idéale**, **Acceptable**, **Défavorable**, **Dangereuse**) puis cliquez sur les secteurs de la rose des vents (16 secteurs de 22,5°, avec degrés et points cardinaux).
3. Réglez les plages de vent : *trop faible sous*, *idéal de… à…*, *excessif au-delà*.
4. Réglez les rafales : rafale maximale acceptable et rapport rafale / vent moyen maximal.
5. Ajustez les pondérations de la note /100 et le score minimum d'un « bon créneau ».
6. **Enregistrer** : les réglages sont conservés dans ce navigateur.

### Partager les réglages avec tout le club

Le site est statique (pas de base de données), donc :

1. Dans Admin, cliquez sur **Exporter** pour obtenir `club-settings.json`.
2. Sur GitHub, remplacez `public/club-settings.json` par ce fichier (*Add file → Upload files*, puis commit).
3. Le site se redéploie tout seul : tous les membres reçoivent les mêmes réglages.

Ordre de priorité : réglages locaux de l'appareil > `club-settings.json` > valeurs par défaut du code.

> ⚠️ Les valeurs par défaut sont une **base de départ à valider** (vent dominant, axe du plan d'eau). Seules les orientations **offshore vers le large de Saint-Jean-de-Luz** (S à ESE) sont classées « dangereuses » par défaut, par prudence. Pour les autres spots, c'est une décision de sécurité qui revient aux admins qui les connaissent (vent offshore, zones interdites…).
> La page Admin n'est pas protégée par mot de passe : sur un site statique, une protection côté navigateur ne serait pas une vraie sécurité. Seul un fichier `club-settings.json` validé dans le dépôt change les réglages pour tout le monde, et cela passe par GitHub.

---

## Ajouter une webcam

Éditez **`src/config/webcams.ts`** :

```ts
{
  id: 'ma-webcam',
  title: 'Nom affiché',
  provider: 'Fournisseur',
  kind: 'iframe',            // 'iframe' (lecteur intégrable) | 'image' (JPEG rafraîchi) | 'link' (lien externe)
  url: 'https://…',          // URL du lecteur, de l'image ou de la page
  sourcePage: 'https://…',   // page source créditée
  spotIds: ['la-mine'],      // spots concernés
  proximity: 'À 1 km du spot',
  refreshSeconds: 600,       // rechargement automatique (iframe / image)
  live: false,               // true uniquement si c'est un vrai direct
}
```

N'intégrez que des flux publics dont l'intégration est autorisée par la source (lecteur « embed » fourni, ou image publique). Sinon, utilisez `kind: 'link'`.

Webcams intégrées actuellement (lecteurs Viewsurf utilisés par les offices de tourisme) : Base de voile de Port Leucate (côté étang), Leucate-Village, Port Leucate, La Franqui et Leucate-Plage, ainsi que, à Saint-Jean-de-Luz, la Grande Plage, le Fort de Socoa, le chenal et Sainte-Barbe. Aucune webcam publique n'a été trouvée pour le **lac de Léon** (lien vers Moliets, la plus proche, sur la côte) ni pour le **lac du Gabas**.

---

## Algorithme de notation

Fichier : `src/lib/scoring.ts`. Note /100 = moyenne pondérée (pondérations réglables dans Admin) :

| Critère | Poids par défaut | Calcul |
|---|---:|---|
| Orientation du vent | 30 % | idéale 1 · acceptable 0,6 · défavorable 0,15 · dangereuse 0 |
| Vitesse du vent | 25 % | 1 dans la plage idéale, décroît vers « trop faible » et « excessif » |
| Régularité | 15 % | variation de la vitesse et de la direction sur 4 h |
| Rafales | 15 % | rapport rafale / vent moyen et seuil de rafale max |
| Évolution | 10 % | qualité des 3 heures suivantes |
| Accord des modèles | 5 % | écart de vitesse et de direction entre modèles |

**Règles de sécurité (prioritaires sur la note) :**
- orientation **dangereuse** : recommandation **bloquée** (note ≤ 10), le spot est **toujours classé après** les spots non bloqués, même avec 25 nœuds ;
- vent > seuil « excessif » : note plafonnée à 35 et avertissement ;
- rafales > seuil : note plafonnée à 45 et avertissement ;
- vent trop faible : note plafonnée à 30.

Niveaux : ≥ 78 **excellentes** (vert foncé) · ≥ 60 **bonnes** (vert) · ≥ 40 **moyennes** (orange) · < 40 **défavorables** (rouge).

**Meilleur créneau** : chaque heure des 48 prochaines heures reçoit une note (orientation, vitesse, rafales, régularité locale). Les heures consécutives de jour au-dessus du seuil (60 par défaut) forment des créneaux. Le meilleur créneau maximise la qualité × la durée. Le calcul est refait à chaque actualisation des prévisions (toutes les 15 min).

---

## Conseil matériel (windsurf / wing foil)

Fichier : `src/lib/gear.ts`. Les calculs utilisent le profil du rider (page **Matériel**, enregistré sur l'appareil), le vent (maintenant ou meilleur créneau) et le plan d'eau du spot (`water` dans `spots.ts` : profondeur, algues, clapot, foil possible ou non).

| Élément | Règle utilisée (ordre de grandeur) |
|---|---|
| Voile de windsurf | ≈ 1,34 × poids (kg) / vent (nds), arrondie à une taille du commerce, plafonnée selon le niveau |
| Volume de planche windsurf | poids + marge (plus de vent : moins de volume ; débutant : +70 à +90 L) |
| Aileron | ≈ 5,5 × surface de voile (cm) ; anti-algues sur les spots à algues ; plus court sur les spots peu profonds |
| Aile de wing | ≈ poids (kg) / vent (nds) |
| Planche et foil de wing | volume selon le niveau, aile avant de 900 à 2 200 cm², mât court si l'eau est peu profonde |

**Windsurf ou wing foil ?** Le site compare les deux. Vent trop léger pour planer mais suffisant pour voler : wing. Vent fort et établi : windsurf. Vent rafaleux : léger avantage au wing. Plan d'eau peu profond ou à algues (La Mine, Parc à huîtres) : foil déconseillé. Orientation dangereuse : aucune session conseillée.

---

## Déploiement

### GitHub Pages (recommandé, déjà configuré)

1. Poussez le code sur la branche `main` du dépôt.
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. Chaque push sur `main` lance `.github/workflows/deploy.yml` (installation, vérification TypeScript, build, publication).
4. Le site est disponible sur `https://<votre-compte>.github.io/mojito-windsurf-club/`.

Le site utilise des chemins relatifs (`base: './'`) et un routage par `#`. Il fonctionne donc dans un sous-dossier sans configuration supplémentaire.

### Netlify / Vercel

Importez le dépôt : `netlify.toml` et `vercel.json` sont fournis (commande `npm run build`, dossier `dist`).

### Installer l'application sur smartphone (PWA)

- **Android / Chrome** : menu ⋮ → *Installer l'application*.
- **iPhone / Safari** : bouton Partager → *Sur l'écran d'accueil*.

---

## API et sources utilisées

| Source | Usage | Clé |
|---|---|---|
| [Open-Meteo Forecast API](https://open-meteo.com/en/docs) | Conditions actuelles, 7 jours de prévisions, 7 jours d'historique (modèle « best match ») | Non (usage non commercial) |
| Open-Meteo, paramètre `models` | ECMWF IFS 0.25°, GFS, ICON, ICON-EU, ARPEGE Europe, AROME France HD | Non |
| `api.open-meteo.com/data/{modèle}/static/meta.json` | Heure du dernier run de chaque modèle | Non |
| [Pioupiou / OpenWindMap](https://developers.pioupiou.fr/api/live/) | Vent **mesuré** par les balises proches (Gabas, Leucate, Saint-Jean-de-Luz, Gruissan) | Non |
| Open-Meteo Marine, `sea_level_height_msl` | Marées (Saint-Jean-de-Luz, Hossegor), heures approximatives, sans coefficient | Non |
| [OpenStreetMap](https://www.openstreetmap.org) + Leaflet | Carte des spots | Non |
| [OSRM](https://project-osrm.org) (serveur de démonstration) + Nominatim | Temps et distance de route vers les spots (à la demande de l'utilisateur) | Non |
| [Telegram Bot API](https://core.telegram.org/bots/api) | Alertes automatiques (facultatif) | Jeton de bot |
| [Supabase](https://supabase.com) | Retours de session, réglages partagés, connexion des admins (facultatif) | Clé publique « anon » |
| [Viewsurf](https://www.viewsurf.com) (via l'office de tourisme de Leucate) | Webcams intégrées | Non |
| [Wikimedia Commons](https://commons.wikimedia.org) | Photos des spots (licences CC BY-SA, crédits affichés) | Non |
| OpenStreetMap / Nominatim, Windfinder, unplug-kitesurf | Vérification des coordonnées GPS (lors de la configuration, pas à l'exécution) | — |

Les données Open-Meteo sont sous licence CC BY 4.0 (attribution dans le pied de page).
**Open-Meteo Marine** (`marine-api.open-meteo.com`) est utilisé seulement pour les spots en mer qui déclarent un point `marine` dans `spots.ts` (Saint-Jean-de-Luz : houle au large de la baie). Il n'est pas pertinent pour les lacs et les étangs.

**Appels API** : un seul appel groupé pour les 5 spots (prévisions) et un autre pour les modèles, mis en cache 15 et 30 min dans le navigateur, avec repli sur la dernière donnée connue en cas d'erreur réseau.

---

## Activer les fonctions communautaires (Supabase, gratuit)

Ces fonctions ont besoin d'une petite base de données : retours de session (« Sur l'eau »), statistiques du club, publication des réglages en un clic et connexion sécurisée des admins. Sans elle, tout le reste du site fonctionne.

1. Créez un compte puis un projet sur https://supabase.com (offre gratuite).
2. **SQL Editor → New query** : collez le contenu de `supabase/schema.sql`, puis cliquez sur **Run**.
3. **Authentication → Sign In / Providers → Email** : désactivez « Allow new users to sign up ». Dans **Email Templates → Magic Link**, ajoutez `{{ .Token }}` au message pour que le code à 6 chiffres soit envoyé.
4. **Authentication → Users → Invite user** : invitez l'e-mail de chaque admin du club.
5. **Project Settings → API** : copiez l'**URL du projet** et la clé **anon public** (cette clé est faite pour être publique ; la sécurité est assurée par les règles du schéma).
6. Sur GitHub : **Settings → Secrets and variables → Actions → Variables → New repository variable** :
   - `SUPABASE_URL` : l'URL du projet ;
   - `SUPABASE_ANON_KEY` : la clé anon.
7. Relancez le déploiement (**Actions → Build & deploy → Run workflow**).

> **Mise à jour du schéma** : après une nouvelle version du site (ajout de colonnes ou de tables), relancez simplement `supabase/schema.sql` dans le SQL Editor. Le script peut être exécuté plusieurs fois sans erreur.

Les admins se connectent ensuite dans la page **Admin** avec leur e-mail (code reçu par e-mail), puis **Publier ces réglages** : tous les membres les reçoivent immédiatement.

---

## Alertes Telegram (même site fermé)

Le workflow `.github/workflows/alerts.yml` tourne deux fois par jour (vers 6-7 h et 17-18 h). Il applique le même moteur de notation que le site (`scripts/alerts.ts`) et envoie les bonnes sessions des 36 prochaines heures sur Telegram.

1. Sur Telegram, parlez à **@BotFather** → `/newbot` → récupérez le **jeton** du bot.
2. Ajoutez le bot au groupe du club et envoyez-y un message, puis ouvrez `https://api.telegram.org/bot<JETON>/getUpdates` pour lire le `chat.id` du groupe (un nombre négatif).
3. GitHub → **Settings → Secrets and variables → Actions → Secrets** : `TELEGRAM_BOT_TOKEN` et `TELEGRAM_CHAT_ID`.
4. Facultatif (onglet *Variables*) : `ALERT_MIN_SCORE` (70 par défaut).
5. Testez avec **Actions → Alertes Telegram → Run workflow**.

WhatsApp n'a pas d'API gratuite pour les groupes ; le bouton **Partager** du site permet en revanche d'envoyer un spot sur WhatsApp en un geste.

---

## Notifications (évolutions)

`src/services/notifications.ts` définit des **règles** (`wind-above`, `good-conditions`, `models-converge`) évaluées à chaque actualisation, avec une notification système si l'utilisateur l'a autorisée (page Alertes).

Pour des notifications envoyées **même site fermé**, il faudra ajouter un petit backend :
1. une tâche planifiée (GitHub Actions `schedule`, Cloudflare Worker cron…) qui appelle Open-Meteo et réutilise `lib/scoring.ts` ;
2. un envoi Web Push (clés VAPID) vers les abonnements enregistrés par le service worker (`public/sw.js` gère déjà `notificationclick`).

---

## Limites connues

- Les conditions « actuelles » viennent de modèles météo. Les balises Pioupiou affichées ne sont pas exactement sur le plan d'eau (ex. la balise « Aéromodélisme Leucatois » est sur le plateau) : leur utilisation pour la note est donc une option à activer spot par spot dans Admin. Les effets locaux (venturi, dévent, thermiques) peuvent différer.
- Les modèles globaux (ECMWF, GFS à environ 25 km) lissent les effets locaux ; AROME HD (environ 1,5 km) est le plus fin, mais ne prévoit qu'à environ 2 jours.
- Les heures affichées dans les lecteurs de webcam sont fournies par la source ; le site n'a pas accès à l'horodatage interne d'un lecteur intégré.
- Les réglages Admin sont stockés par appareil, sauf s'ils sont publiés via `club-settings.json`.

**Avertissement :** cet outil est une aide à la décision. Vérifiez toujours les conditions réelles, les restrictions locales et les vigilances Météo-France avant de naviguer.
