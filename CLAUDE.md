# Business OS — règles projet

## Mobile-first obligatoire

Business OS est une **PWA installable sur mobile**. L'utilisateur opère parfois depuis son téléphone. Chaque nouvelle page / composant doit être pensé mobile dès la conception, pas en rattrapage.

### Checklist mobile à respecter pour TOUTE nouvelle UI

- **Aucun débordement horizontal** sur écran 360px (iPhone SE). Tester en DevTools mode mobile **avant** de marquer une tâche complete.
- **Pas de largeurs fixes** (`w-48`, `w-[300px]`, etc.) sans variant responsive (`w-full sm:w-48`).
- **Boutons d'action** : sur mobile, `flex-wrap` ou stack vertical, **jamais** une ligne unique trop large.
- **Cartes header / fiches détail** : `flex-col sm:flex-row` quand il y a un côté gauche (infos) + côté droit (action / montant).
- **Tableaux** : toujours fournir une variante mobile en cards (`hidden md:block` pour la table, `md:hidden` pour les cards). Pas de scroll horizontal sur un tableau.
- **Formulaires** : champs en grille 2 colonnes UNIQUEMENT à partir de `sm:` ou `md:`. En dessous, un champ par ligne pleine largeur.
- **Texte long** (numéros de facture, codes, références) : `break-words` ou `truncate` selon le contexte.
- **Touch targets** : min 44×44px sur tous les éléments interactifs (boutons, menus, chips).
- **Layout split view** (form + preview côte à côte) : sur mobile, basculer en tabs ou stacker verticalement.

### Safety net active

`AppLayout.tsx` applique `overflow-x-hidden` sur `<main>` pour éviter qu'un bug ponctuel ne casse toute la page. **Ce n'est pas une excuse** pour laisser du contenu déborder — c'est un filet, pas une solution.

### Avant chaque commit d'UI

1. Ouvre la page en DevTools mode mobile (Ctrl+Shift+M, iPhone 14 ou 360px)
2. Toute action testable depuis le mobile doit l'être
3. Pas de scroll horizontal inattendu
4. Modals / drawers / dropdowns lisibles et utilisables

## Conventions générales (rappel)

- Stack : React 19 + TS 6 + Vite + Tailwind v4 + Supabase + React Query + RHF + Zod
- Patterns établis dans `src/features/clients/` et `src/features/invoices/` : suivre la même structure (api / hooks / schema)
- RLS user-scoped sur toutes les tables Supabase
- Tokens couleurs uniquement (`bg-bg`, `bg-surface`, `bg-accent`, `text-text`, etc.) — **jamais** de hex hardcodé en dehors de `globals.css` et `pdf/styles.ts`
- Migrations SQL versionnées dans `supabase/migrations/000X_*.sql`, appliquées manuellement via le SQL editor
- Soft delete via `archived_at`, pas de hard delete
- Pas de tests automatisés dans cette phase du projet (vérification manuelle)

## Authentification

- Opérateur unique : `ascendly.io@gmail.com`
- Supabase project ref : `nslmdzmlaszyqeyrfxev`
- `.env.local` configuré, gitignoré

## Fichiers à toujours lire au démarrage de session

1. `tasks/lessons.md` — gotchas Windows/Supabase/TS rencontrés (ne pas re-tomber dedans)
2. `tasks/todo.md` — état des itérations
3. `business-os-brief.md` — vision globale du projet
