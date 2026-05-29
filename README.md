# CRM Prospection

Un petit CRM de prospection que **tu héberges toi-même**, gratuitement. Il fait 3 choses :

1. **Un pipeline Kanban** : tes prospects passent par des colonnes (À contacter → Message envoyé → A répondu → … → Client gagné).
2. **Des relances automatiques** : quand tu envoies un message à un prospect, l'app te programme une relance toute seule, et te rappelle quand relancer.
3. **Un ajout de prospects par Telegram** : tu envoies l'URL d'un profil (LinkedIn, Instagram, TikTok, X) à ton bot Telegram, et le contact se crée tout seul dans le CRM.

Plus un **dashboard** qui te montre ton entonnoir de conversion (« combien de messages pour 1 client ») et ta progression sur tes objectifs de la semaine.

> **Important :** chaque personne installe **sa propre copie**, avec **sa propre base de données**. Tes prospects ne sont visibles que par toi. Personne (même pas celui qui t'a donné l'app) ne voit tes données.

---

## Sommaire

- [Comment ça marche (le principe)](#comment-ça-marche-le-principe)
- [Ce dont tu as besoin](#ce-dont-tu-as-besoin)
- [Installation pas à pas](#installation-pas-à-pas)
  - [Étape 1 — Récupérer ta copie du code](#étape-1--récupérer-ta-copie-du-code)
  - [Étape 2 — Créer la base de données (Supabase)](#étape-2--créer-la-base-de-données-supabase)
  - [Étape 3 — Créer ton compte de connexion](#étape-3--créer-ton-compte-de-connexion)
  - [Étape 4 — Créer le bot Telegram](#étape-4--créer-le-bot-telegram)
  - [Étape 5 — Déployer l'app (Vercel)](#étape-5--déployer-lapp-vercel)
  - [Étape 6 — Relier le bot Telegram](#étape-6--relier-le-bot-telegram)
  - [Étape 7 — Première connexion + réglages](#étape-7--première-connexion--réglages)
- [Vérifier que tout marche](#vérifier-que-tout-marche)
- [Comment utiliser l'app au quotidien](#comment-utiliser-lapp-au-quotidien)
- [Ce que tu peux régler](#ce-que-tu-peux-régler)
- [Mode partagé (plusieurs personnes sur une instance)](#mode-partagé-plusieurs-personnes-sur-une-instance)
- [En cas de problème (dépannage)](#en-cas-de-problème-dépannage)

---

## Comment ça marche (le principe)

L'app repose sur **3 services gratuits** qui se parlent entre eux :

| Service | Rôle | Qui le possède |
|---|---|---|
| **GitHub** | Stocke le code de l'app | Toi (ta copie) |
| **Vercel** | Met l'app en ligne (le site web + une mini-fonction pour Telegram) | Toi |
| **Supabase** | La base de données (tes prospects) + la connexion (login) | Toi |
| **Telegram (@BotFather)** | Ton bot personnel pour ajouter des prospects | Toi |

Le déroulé : tu envoies une URL à ton **bot Telegram** → Telegram prévient une petite fonction hébergée sur **Vercel** → cette fonction enregistre le contact dans **ta base Supabase** → tu le vois dans l'app.

Comme **chaque personne a son propre Supabase**, les données sont totalement cloisonnées. La sécurité est gérée par Supabase (RLS) : même techniquement, un utilisateur ne peut voir que ses propres lignes.

---

## Ce dont tu as besoin

- Un compte **[GitHub](https://github.com)** (gratuit)
- Un compte **[Supabase](https://supabase.com)** (gratuit)
- Un compte **[Vercel](https://vercel.com)** (gratuit — connecte-le à ton GitHub, c'est plus simple)
- **Telegram** installé (mobile ou desktop)
- **[Node.js](https://nodejs.org)** installé sur ton ordinateur (version 20 ou plus) — sert juste à lancer une commande à la fin
- ~15-20 minutes

Aucune carte bancaire n'est nécessaire : les offres gratuites suffisent largement.

---

## Installation pas à pas

### Étape 1 — Récupérer ta copie du code

Tu ne touches **jamais** au repo de quelqu'un d'autre : tu crées **ta propre copie**.

**Méthode recommandée — « Use this template » :**
1. Va sur la page GitHub du projet qu'on t'a partagé.
2. Clique le bouton vert **« Use this template »** → **« Create a new repository »**.
3. Donne un nom (ex. `crm-prospection`), choisis **Private** ou **Public**, puis **Create**.
4. Tu as maintenant **ton propre repo** sur ton compte GitHub. C'est lui qu'on utilisera partout ensuite.

> Si le bouton « Use this template » n'apparaît pas, utilise **Fork** à la place (même résultat : une copie t'appartenant).

Tu n'as pas besoin de télécharger le code sur ton ordinateur tout de suite — Vercel le lira directement depuis GitHub. (On clonera juste à l'étape 6 pour une seule commande.)

### Étape 2 — Créer la base de données (Supabase)

1. Sur [Supabase](https://supabase.com), clique **New project**. Donne-lui un nom (ex. `crm`), choisis une région proche, note le **mot de passe** de la base (tu peux le garder de côté, on n'en aura pas besoin tout de suite). Attends 1-2 min que le projet soit prêt.
2. Va dans **Project Settings** (roue crantée, en bas à gauche) → **API**. Garde cet onglet ouvert, tu vas y copier 3 valeurs :
   - **Project URL** — ressemble à `https://abcd1234.supabase.co`
   - **Project API keys → anon public** — une longue clé qui commence par `eyJ...`
   - **Project API keys → service_role** — une autre longue clé `eyJ...` ⚠️ **celle-ci est secrète**, ne la mets jamais sur un site public.
3. Crée les tables : menu **SQL Editor** (icône `</>`) → **New query**. Dans ton code (sur GitHub), ouvre le fichier **`supabase/migrations/0001_init.sql`**, **copie tout son contenu**, colle-le dans l'éditeur SQL, puis clique **Run** (en bas à droite). Tu dois voir « Success ». ✅ (Ça crée les tables, la sécurité et les fonctions automatiques des relances.)

### Étape 3 — Créer ton compte de connexion

L'app a une page de login. On crée ton utilisateur directement dans Supabase (pas d'inscription publique, c'est voulu) :

1. Dans Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Mets ton **email** + un **mot de passe**, et **coche « Auto Confirm User »** (sinon tu ne pourras pas te connecter).
3. **Create user.** C'est ce couple email/mot de passe que tu utiliseras pour entrer dans l'app.

> Pour une instance **partagée** où chacun crée son compte lui-même, tu peux sauter cette étape et activer plutôt l'inscription : voir [Mode partagé](#mode-partagé-plusieurs-personnes-sur-une-instance).

### Étape 4 — Créer le bot Telegram

1. Sur Telegram, cherche **@BotFather** (le bot officiel) et ouvre une conversation.
2. Envoie `/newbot`, puis suis les questions (un nom, puis un identifiant qui doit finir par `bot`).
3. À la fin, BotFather te donne un **token** du genre `123456789:AAH...`. **Copie-le**, on en aura besoin.
4. Invente aussi un **secret** au hasard (une longue suite de lettres et chiffres, ex. `f8K2m9Qz...`). On l'appellera `TELEGRAM_WEBHOOK_SECRET`. Il sert à empêcher n'importe qui d'écrire dans ta base via le webhook.

### Étape 5 — Déployer l'app (Vercel)

1. Sur [Vercel](https://vercel.com) → **Add New…** → **Project**.
2. Importe **ton** repo GitHub (celui de l'étape 1). Si Vercel ne le voit pas, autorise-le à accéder à ton GitHub.
3. **Avant de cliquer Deploy**, ouvre la section **Environment Variables** et ajoute les variables ci-dessous. Le fichier **`.env.example`** dans le code liste exactement ces variables avec, pour chacune, **où trouver la valeur** :

   | Variable | Valeur |
   |---|---|
   | `VITE_SUPABASE_URL` | la *Project URL* (étape 2) |
   | `VITE_SUPABASE_ANON_KEY` | la clé *anon public* (étape 2) |
   | `VITE_TELEGRAM_BOT_USERNAME` | le nom de ton bot **sans le @** (ex. `MonSuperBot`) |
   | `SUPABASE_URL` | la même *Project URL* |
   | `SUPABASE_SERVICE_ROLE_KEY` | la clé *service_role* (étape 2) |
   | `TELEGRAM_BOT_TOKEN` | le token du bot (étape 4) |
   | `TELEGRAM_WEBHOOK_SECRET` | ton secret inventé (étape 4) |
   | `PUBLIC_APP_URL` | **laisse vide pour l'instant** |

   (Pour une instance **partagée** où plusieurs personnes créent leur propre compte, ajoute aussi `VITE_ALLOW_SIGNUP=true` — voir la section [Mode partagé](#mode-partagé-plusieurs-personnes-sur-une-instance) plus bas.)

   ⚠️ Les variables qui commencent par `VITE_` doivent être présentes **avant** ce premier déploiement (elles sont « gravées » dans le site au moment du build).

4. Clique **Deploy** et attends. À la fin, Vercel te donne l'adresse de ton app, du genre `https://crm-prospection-xxxx.vercel.app`. **Copie-la.**
5. Retourne dans **Settings → Environment Variables**, renseigne `PUBLIC_APP_URL` avec cette adresse, **enregistre**, puis va dans l'onglet **Deployments** → sur le dernier déploiement, menu **⋯** → **Redeploy**. (C'est normal : l'adresse n'existe qu'après le 1er déploiement, d'où ce 2e tour.)

### Étape 6 — Relier le bot Telegram

Cette étape « branche » ton bot à ton app (sinon le bot ne sait pas où envoyer les messages). Une seule commande à lancer sur ton ordinateur :

1. Récupère le code en local (une fois) :
   ```bash
   git clone https://github.com/<ton-compte>/crm-prospection.git
   cd crm-prospection
   npm install
   ```
2. Crée ton fichier de secrets local en copiant le modèle :
   - **PowerShell (Windows) :** `Copy-Item .env.example .env.local`
   - **Mac/Linux :** `cp .env.example .env.local`
3. Ouvre `.env.local` et remplis-le avec **exactement les mêmes valeurs** que celles mises dans Vercel (y compris `PUBLIC_APP_URL` cette fois).
4. Lance :
   ```bash
   npm run setup:telegram
   ```
   Tu dois voir **`✅ Webhook enregistré`**. C'est bon, le bot est relié.

### Étape 7 — Première connexion + réglages

1. Ouvre ton app (l'URL Vercel) et connecte-toi avec l'email/mot de passe de l'étape 3.
2. Va dans **Paramètres → Prospection**.
3. Dans la carte **Telegram**, clique **« Connecter Telegram »** : Telegram s'ouvre sur ton bot → tape **Démarrer**. Reviens dans l'app, ça affiche **« ✓ Telegram connecté »** tout seul (pas de `chat_id` à copier).
4. Règle tes **objectifs** et tes **délais de relance** (ou laisse les valeurs par défaut), puis **Enregistre**.

🎉 C'est installé. Passe à la vérification.

---

## Vérifier que tout marche

Coche ces points :

- [ ] Je me connecte → j'arrive sur le **Dashboard** (3 blocs : Relances du jour, Objectifs, Entonnoir).
- [ ] Dans **CRM Pipeline**, je peux créer un contact à la main et le glisser d'une colonne à l'autre.
- [ ] J'envoie une **URL LinkedIn/Instagram** à mon bot → il répond **`✅ … ajouté`** → le contact apparaît dans la colonne **À contacter**.
- [ ] Dans **Paramètres → Telegram**, **« Connecter Telegram »** relie bien mon compte (affiche « ✓ Telegram connecté »).
- [ ] Je renvoie **la même URL** → le bot répond **`⚠️ Déjà dans le CRM`** (anti-doublon).
- [ ] Sur mon téléphone, l'app est lisible et il n'y a pas de scroll horizontal bizarre.

Si un point bloque, va voir la section **Dépannage** plus bas.

---

## Comment utiliser l'app au quotidien

**Le pipeline (colonnes), de gauche à droite :**

| Colonne | Ce que ça veut dire |
|---|---|
| **À contacter** | Prospect ajouté, pas encore contacté |
| **Message envoyé** | Tu lui as envoyé ton 1er message |
| **A répondu** | Il t'a répondu |
| **Lien de RDV envoyé** | Tu lui as envoyé ton lien de réservation |
| **Appel calé** | Un appel est programmé |
| **Client gagné** | 🎉 Il est devenu client |
| **Perdu / abandonné** | Pas intéressé ou plus de réponse |

**Les relances, comment ça marche :**
- Quand tu fais glisser un contact vers **Message envoyé**, l'app programme automatiquement une **1ʳᵉ relance** (par défaut dans 3 jours, à 9h).
- Quand tu coches cette relance comme faite, elle en reprogramme une autre (par défaut +7 jours), jusqu'à un **nombre max** (par défaut 3). Après ça, le contact apparaît dans l'onglet **« Fin de relance »** pour que tu décides à la main (relancer autrement, ou le passer en Perdu).
- Quand un prospect passe en **A répondu**, l'app programme un **suivi de conversation** récurrent (par défaut tous les 2 jours) tant qu'il reste dans cette colonne.
- La page **Relances** regroupe tout : *en retard*, *aujourd'hui*, *à venir*.

**Ajouter un prospect depuis le téléphone :** envoie simplement l'URL de son profil à ton bot Telegram. Il se crée dans **À contacter**.

**Le Dashboard :** l'**entonnoir** te montre combien de prospects à chaque étape et ton ratio « X messages → 1 client ». Le bloc **Objectifs** suit tes messages/appels de la semaine par rapport à tes cibles.

---

## Ce que tu peux régler

Dans **Paramètres → Prospection** :

- **Objectifs hebdo** : nombre de messages et d'appels visés par semaine (affichés sur le dashboard).
- **Délai relance #1** : nombre de jours avant la première relance après un message envoyé.
- **Délai relance #2+** : nombre de jours entre les relances suivantes.
- **Cadence suivi conversation** : nombre de jours entre deux relances quand le prospect a répondu.
- **Nombre max de relances** : après combien de relances on arrête (le contact part en « Fin de relance »).
- **Telegram** : le bouton **« Connecter Telegram »** relie ton compte au bot (1 tap, pas de copier-coller).

Toutes les relances se déclenchent à **9h00 (heure de Paris)**.

---

## Mode partagé (plusieurs personnes sur une instance)

Par défaut l'app est mono-utilisateur (tu crées le compte à la main dans Supabase). Tu peux aussi
héberger **une seule instance pour plusieurs personnes** (ex. un groupe d'accompagnement) : chacun
crée son compte et ne voit que ses propres prospects (isolation garantie par la sécurité RLS).

Pour activer ce mode, **côté hôte** :
1. **Vercel** : ajoute la variable `VITE_ALLOW_SIGNUP=true` puis redeploie → un bouton **« Créer un compte »** apparaît sur la page de connexion.
2. **Supabase** → **Authentication** → **Sign In / Providers** (ou **Settings**) → **désactive « Confirm email »**. L'inscription devient instantanée, sans email de confirmation à gérer.
3. Partage simplement l'**URL de l'app** à tes invités.

Côté invité : ouvrir l'URL → **Créer un compte** → **Paramètres → Connecter Telegram** → taper *Démarrer*.
Tout le monde partage le **même bot**, mais chacun a sa **conversation privée** : les prospects de
chacun atterrissent dans son propre CRM.

> ⚠️ Inscriptions ouvertes = n'importe qui avec l'URL peut créer un compte (et consomme ton quota
> Supabase). Pour un petit groupe c'est OK ; sinon laisse `VITE_ALLOW_SIGNUP=false` et crée les
> comptes à la main (étape 3).

---

## En cas de problème (dépannage)

**Page blanche après le déploiement**
→ Les variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` manquaient au moment du build. Vérifie-les dans Vercel, puis **Redeploy**.

**« Voir la fiche » ou un rafraîchissement de page donne une erreur 404**
→ Normalement géré par le fichier `vercel.json` (déjà inclus). Assure-toi qu'il est bien présent dans ton repo et redeploie.

**Le bot répond « 🔒 Chat non autorisé »**
→ Ton compte n'est pas relié. Va dans **Paramètres → Telegram → Connecter Telegram**, et tape **Démarrer** dans Telegram. (Vérifie aussi que `VITE_TELEGRAM_BOT_USERNAME` est bien renseignée dans Vercel.)

**Le bot ne répond pas du tout quand j'envoie une URL**
→ L'étape 6 (`npm run setup:telegram`) n'a pas été faite, ou `PUBLIC_APP_URL` est vide/incorrect dans Vercel. Vérifie `PUBLIC_APP_URL`, redeploie, puis relance `npm run setup:telegram`.

**`npm run setup:telegram` affiche « Variables manquantes »**
→ Ton fichier `.env.local` n'existe pas ou est incomplet. Recopie `.env.example` en `.env.local` et remplis les 3 variables demandées (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `PUBLIC_APP_URL`).

**Le bot dit « URL non reconnue »**
→ Seuls LinkedIn, Instagram, TikTok et X/Twitter sont reconnus. Envoie un lien de **profil** (ex. `linkedin.com/in/...`), pas un lien de post.

**Je n'arrive pas à me connecter à l'app**
→ Vérifie que tu as bien créé l'utilisateur dans Supabase (étape 3) **avec « Auto Confirm User » coché**.

---

## Pour les développeurs

```bash
npm run dev      # serveur de développement local
npm run build    # vérification TypeScript + build de production
```

Stack : React 19 + TypeScript + Vite + Tailwind v4 + Supabase + React Query. Le nom de l'app est centralisé dans `src/config/brand.ts`. La fonction Telegram est dans `api/telegram-webhook.ts`. Toute la base est dans `supabase/migrations/0001_init.sql`.
