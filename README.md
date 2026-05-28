# CRM Prospection

Petit CRM de prospection auto-hébergeable : pipeline Kanban, relances automatiques,
dashboard de conversion (funnel + objectifs hebdo), et ajout de prospects par Telegram
(tu envoies une URL LinkedIn/Instagram/TikTok/X au bot → le contact est créé).

Chaque utilisateur déploie **sa propre instance** : son Supabase (ses données), son
Vercel, son bot Telegram. Personne ne partage rien.

---

## Ce que tu pourras paramétrer (dans Paramètres → Prospection)

- **Objectifs hebdo** : nombre de messages / appels visés par semaine.
- **Délais de relance** : délai 1ʳᵉ relance, délai relances suivantes, cadence de
  suivi de conversation, nombre max de relances avant abandon.
- **Telegram** : ton `chat_id` (pour activer l'ajout de prospects par le bot).

---

## Installation (≈ 15 min)

Prérequis : un compte [GitHub](https://github.com), [Supabase](https://supabase.com)
et [Vercel](https://vercel.com) (offres gratuites suffisantes), et
[Node.js 20+](https://nodejs.org) installé sur ton ordinateur.

### 1. Récupérer le code
Fork ce repo sur ton GitHub (bouton **Fork**), puis clone-le :
```bash
git clone https://github.com/<ton-compte>/crm-prospection.git
cd crm-prospection
npm install
```

### 2. Créer le projet Supabase
1. Sur Supabase, **New project**. Note le mot de passe DB.
2. Une fois prêt : **Project Settings → API**, copie :
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (secrète — ne jamais l'exposer côté navigateur)
3. **SQL Editor → New query** : colle tout le contenu de
   `supabase/migrations/0001_init.sql`, puis **Run**. (Crée les tables, la sécurité
   RLS et les fonctions.)

### 3. Créer ton compte utilisateur
Dans Supabase : **Authentication → Users → Add user** → renseigne ton email + mot de
passe, et coche **Auto Confirm User**. C'est ce compte que tu utiliseras pour te
connecter à l'app.

### 4. Créer le bot Telegram
1. Sur Telegram, parle à **@BotFather** → `/newbot` → suis les étapes.
2. Copie le **token** du bot (du genre `123456789:ABC...`).
3. Choisis un **secret** au hasard (ex. une longue suite de lettres/chiffres) : ce
   sera ton `TELEGRAM_WEBHOOK_SECRET`.

### 5. Déployer sur Vercel
1. Sur Vercel : **Add New → Project**, importe ton repo GitHub.
2. **Environment Variables** : ajoute toutes les variables de `.env.example`
   (valeurs de l'étape 2 + token/secret de l'étape 4). Laisse `PUBLIC_APP_URL` vide
   pour l'instant.
3. **Deploy**. Une fois déployé, copie l'URL (`https://ton-app.vercel.app`).
4. Reviens dans **Environment Variables**, renseigne `PUBLIC_APP_URL` avec cette URL,
   puis **Redeploy** (onglet Deployments → ⋯ → Redeploy).

### 6. Connecter le bot Telegram
Sur ton ordinateur, crée un fichier `.env.local` (copie de `.env.example` rempli avec
les mêmes valeurs que sur Vercel), puis lance :
```bash
npm run setup:telegram
```
Tu dois voir `✅ Webhook enregistré`.

### 7. Premier lancement
1. Ouvre `https://ton-app.vercel.app`, connecte-toi avec le compte de l'étape 3.
2. Va dans **Paramètres → Prospection**.
3. Sur Telegram, envoie `/start` à ton bot → il te renvoie ton `chat_id`. Colle-le
   dans le champ **Chat ID Telegram**, règle tes délais/objectifs, **Enregistre**.
4. Envoie une URL de profil (LinkedIn, Instagram, TikTok, X) à ton bot → le contact
   apparaît dans le **CRM Pipeline** 🎉

---

## Développement local
```bash
npm run dev      # serveur de dev
npm run build    # typecheck + build de prod
```

## Variables d'environnement
Voir `.env.example`. Les variables `VITE_*` sont publiques (navigateur) ; les autres
sont secrètes (fonctions serverless uniquement).
