# Prompt — Lancement du Client Portal Template

## Mode d'emploi

1. **Crée un nouveau dossier vide** sur ta machine, par exemple `c:\Users\benja\Documents\Claude\client-portal-template\`.
2. **Ouvre une nouvelle conversation Claude DANS ce dossier** (pas dans Business OS). Sur VS Code : ouvre le dossier vide puis lance Claude Code, ou via le terminal `cd` dans ce dossier puis `claude`.
3. **Copie-colle tout le bloc ci-dessous** dans la conversation.
4. Claude va te poser des questions de brainstorming en premier (couleur accent, type d'auth, etc.). Tu réponds. Puis il écrit un spec, attend ta validation, écrit un plan, puis exécute via subagents.
5. **Pré-requis avant de lancer** : appliquer la migration SQL prérequise sur ton Supabase Business OS (elle est incluse dans le prompt — Claude te dira de le faire si pas déjà fait).

⚠️ Ce prompt est totalement self-contained. Claude n'a PAS besoin d'accéder au repo Business OS pour comprendre — toutes les infos nécessaires sont dans le texte.

---

## Le prompt (à copier-coller intégralement)

```
Je veux que tu démarres une **nouvelle app React** : le **Client Portal** pour Business OS. C'est un repo séparé que je vais forker / copier-coller pour chaque nouveau client. Chaque client a son repo + son déploiement Vercel, mais tous les portails clients se connectent au **même Supabase que Business OS**.

## Contexte (à lire en premier)

Tu es dans un nouveau dossier vide. Le Business OS principal est dans un autre repo (que tu n'as PAS besoin de lire pour ce travail, je te donnerai ce qu'il faut).

Lis si présents : `tasks/lessons.md`, `tasks/todo.md`, `CLAUDE.md` à la racine. Sinon crée-les au démarrage selon les conventions ci-dessous.

## Objectif

Une **app web PWA légère** qu'un client unique peut installer sur son téléphone. Elle expose :
- Authentification email/password Supabase (compte créé par l'opérateur dans le dashboard Supabase).
- Une page "Mes tâches" : liste des tâches que l'opérateur lui a assignées, checkbox pour cocher fait.
- Une nav par onglets, conçue pour qu'on rajoute facilement des modules custom client par client (sans toucher au code partagé).

## Stack (identique à Business OS)

- React 19 + TypeScript + Vite
- Tailwind v4 (tokens couleur uniquement : `bg-bg`, `bg-surface`, `text-text`, `bg-accent`, etc.)
- React Router v7
- React Query 5
- React Hook Form 7 + Zod 4
- Supabase JS 2
- vite-plugin-pwa (`devOptions: { enabled: false }`)
- lucide-react

## Variables d'environnement (le client connectera au Supabase de Business OS)

```env
VITE_SUPABASE_URL=https://nslmdzmlaszyqeyrfxev.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_CLIENT_ID=...  # UUID du client dans la table `clients` de Business OS
```

Le `VITE_CLIENT_ID` est figé au build : chaque déploiement Vercel cible UN client. Pas de multi-tenant runtime côté portail.

## Migration prérequise (à appliquer sur le Supabase de Business OS, PAS dans ce repo)

```sql
-- Lien auth.users (compte portail) → clients (row Business OS)
alter table clients add column portal_user_id uuid references auth.users(id) unique;
alter table clients add column portal_url text;

-- RLS supplémentaire : un portail peut lire SON propre client row
create policy "clients_select_self_portal" on clients for select
  using (auth.uid() = portal_user_id);

-- RLS supplémentaire : un portail peut lire/cocher SES tâches client-side
create policy "tasks_select_self_portal" on tasks for select
  using (
    assignee = 'client'
    and exists (
      select 1 from clients c
      where c.id = tasks.client_id and c.portal_user_id = auth.uid()
    )
  );

create policy "tasks_update_self_portal" on tasks for update
  using (
    assignee = 'client'
    and exists (
      select 1 from clients c
      where c.id = tasks.client_id and c.portal_user_id = auth.uid()
    )
  )
  with check (
    assignee = 'client'
    and exists (
      select 1 from clients c
      where c.id = tasks.client_id and c.portal_user_id = auth.uid()
    )
  );
```

Cette migration sera la première itération Business OS suivante. Si elle n'est pas encore appliquée quand tu démarres ce repo, signale-le-moi et on l'applique avant.

## Architecture du portail

### Structure de fichiers attendue

```
client-portal-template/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/             # Button, Card, Spinner, Input, etc. (copie minimaliste depuis Business OS)
│   │   └── layout/         # Header, Nav (tabs)
│   ├── features/
│   │   └── tasks/          # copie depuis Business OS : api.ts, hooks.ts, schema.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── TasksPage.tsx
│   │   └── [futurs modules custom]
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── utils.ts (cn)
│   ├── App.tsx             # route Login / Authenticated layout
│   ├── main.tsx
│   ├── globals.css
│   └── types/
│       └── database.ts     # copie réduite : juste Task, Client
├── index.html
├── vite.config.ts (avec vite-plugin-pwa)
├── tsconfig.json
├── tailwind.config.ts (ou via @tailwindcss/vite)
└── package.json
```

### Auth flow

1. App charge → check session Supabase.
2. Si pas de session → `LoginPage` (formulaire email + password).
3. Si session → fetch `clients` where `portal_user_id = auth.uid()`. Doit retourner exactement 1 row, sinon afficher "Compte non lié" + bouton déconnexion.
4. Si client row trouvé → afficher l'app. Sinon erreur claire.

### Tasks UI

- Sections : "À faire" (incomplétées) + "Complétées" (collapsible, dépliable).
- Pour chaque tâche : titre, badge priorité, date d'échéance (rouge si en retard), notes.
- Checkbox click → mutate `completed=true, completed_by='client', completed_at=now()`. Toast confirmation.
- Refetch on focus (l'opérateur peut avoir mis à jour de son côté). Pas de Supabase Realtime au début.

### Modules custom (extension future)

Le `App.tsx` doit avoir une nav par onglets que je peux étendre facilement :

```tsx
const tabs = [
  { path: '/', label: 'Mes tâches', component: TasksPage },
  // { path: '/streams', label: 'Mes streams', component: StreamsPage }, // exemple custom client A
]
```

Documente clairement dans le README / un fichier `EXTEND.md` comment ajouter un onglet custom : créer la page, l'ajouter à `tabs`, ajouter la migration SQL si besoin (toujours appliquée sur Business OS Supabase).

## Contraintes techniques

- **Mobile-first** absolu — c'est l'app principale du client, sur téléphone 90 % du temps.
- **Tokens couleur Tailwind uniquement.**
- **Triple-generic useForm** si formulaires avec transforms.
- **Submit guard `useRef`** sur les mutations (même règle que Business OS).
- **PWA installable** : manifest + icons + service worker. Le client doit pouvoir "Ajouter à l'écran d'accueil".
- **Pas de tests automatisés** dans cette phase.

## Ne touche PAS à

- Business OS lui-même (autre repo).
- Le projet Supabase autrement que via les policies RLS dans la migration ci-dessus (et JAMAIS dans une migration de ce repo — le portail ne contient pas de migrations).

## Workflow obligatoire

1. **Brainstorming** (skill `superpowers:brainstorming` si dispo). Questions à clarifier :
   - Branding par client (couleur accent depuis variable d'env ou figée ?)
   - Login : magic link OU email/password ? (j'ai dit email/password, mais magic link serait plus simple côté client final)
   - Comportement quand un task est `assignee='owner'` (pas pour le client) — invisible côté portail bien sûr, mais que dire dans le README pour qu'un dev qui débarque comprenne ?
   - Gestion d'erreur de session expirée : redirect auto vers login ?
   - Mobile-first : tabs nav en bas (bottom nav) ou en haut ?
   - PWA : nom + icône configurables via env ou hardcodés (à override par client) ?
2. **Présente 2-3 approches** sur l'architecture des modules custom (onglets statiques vs dynamiques).
3. **Spec** dans `docs/superpowers/specs/YYYY-MM-DD-client-portal-design.md`, attends ma validation.
4. **Plan** dans `docs/superpowers/plans/YYYY-MM-DD-client-portal-plan.md`.
5. **Subagent-driven-development** pour l'exécution.
6. Commits granulaires sur `main`.
7. Vérifications manuelles mobile (DevTools 360px) ET desktop.

Quand tu es prêt, fais un `ls` pour voir l'état du dossier, résume ta compréhension, et pose tes premières questions.
```

---

## Après que Claude a terminé le scaffolding

Pour onboarder Hugo (ton premier vrai client) :

1. Sur GitHub (ou local) : duplique le repo `client-portal-template` → `client-portal-hugo`.
2. Dans le dashboard Supabase : crée un compte auth pour Hugo (Authentication → Users → Invite).
3. En SQL editor Supabase :
   ```sql
   update clients
   set portal_user_id = '<UUID du compte auth Hugo>',
       portal_url = 'https://client-portal-hugo.vercel.app'
   where id = '<UUID de Hugo dans clients>';
   ```
4. Sur Vercel : import le repo `client-portal-hugo`, configure les 3 env vars :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CLIENT_ID` = UUID de Hugo dans la table `clients`
5. Déploie.
6. Donne à Hugo : URL Vercel + email + password.

## Mini-itération Business OS associée (à faire de ton côté avant ou après)

Une fois que tu auras quelques portails déployés, fais une mini-itération sur **Business OS** :
- Page admin `/clients/apps` qui liste tous tes clients avec leur `portal_url` cliquable.
- Endpoint Vercel `/api/impersonate-portal` qui mint un magic link Supabase via `service_role` et redirige vers l'URL du portail du client. Click "Voir comme Hugo" → tu te retrouves connecté dans son portail sans relogin.

Cette mini-itération je peux te la générer en prompt aussi le moment venu.
