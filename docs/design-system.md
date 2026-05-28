# Business OS — Design System Reference

> Ce document décrit **précisément** le système de design de Business OS pour qu'une app cliente (Client Portal Template ou tout autre projet du même opérateur) puisse adopter le même style à l'identique. Il est pensé pour être lu et appliqué par un développeur (ou par Claude Code dans une autre conversation).
>
> Stack visée : React 19 + Vite + TypeScript + Tailwind v4 + `lucide-react`.

---

## 1. Foundation

### 1.1 Tokens couleur (CSS variables)

Tout le projet utilise **uniquement** des tokens, jamais d'hex hardcodé en dehors de ce fichier de tokens et des PDFs (qui ont leur palette propre dans `pdf/styles.ts`).

Fichier : `src/styles/globals.css` (point d'entrée chargé dans `main.tsx`).

```css
@import "@fontsource-variable/inter";
@import "tailwindcss";

@theme {
  --color-bg: #F4F6F8;              /* fond général de l'app (gris très clair) */
  --color-surface: #FFFFFF;          /* cards, sidebar, header, modals */
  --color-accent: #10B981;           /* vert teal — couleur principale (change-la par client) */
  --color-accent-soft: rgba(16, 185, 129, 0.08);  /* fond actif/sélection */
  --color-accent-hover: #059669;     /* hover sur boutons primaires */
  --color-text: #0F172A;             /* texte principal (slate-900) */
  --color-muted: #64748B;            /* texte secondaire (slate-500) */
  --color-border: #E2E8F0;           /* bordures (slate-200) */
  --color-danger: #EF4444;           /* erreurs, alertes destructrices */
  --color-warning: #F59E0B;          /* en retard, attention */
  --color-success: #10B981;          /* identique à accent par défaut */
  --color-info: #3B82F6;             /* informations neutres */
  --color-purple: #8B5CF6;           /* tag/source LinkedIn ou similaire */
  --color-pink: #EC4899;             /* tag/source TikTok ou Instagram */

  /* Variantes "soft" — fond translucide à 8-12 % pour pills, badges, sélection */
  --color-success-soft: rgba(16, 185, 129, 0.10);
  --color-danger-soft:  rgba(239, 68, 68, 0.10);
  --color-warning-soft: rgba(245, 158, 11, 0.12);
  --color-info-soft:    rgba(59, 130, 246, 0.10);
  --color-purple-soft:  rgba(139, 92, 246, 0.10);
  --color-pink-soft:    rgba(236, 72, 153, 0.10);
  --color-muted-soft:   rgba(100, 116, 139, 0.10);

  --shadow-card: 0 2px 12px rgba(0, 0, 0, 0.06);

  --font-sans: "Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```

**Variantes dark mode** dans le même fichier :

```css
@layer base {
  html.dark {
    --color-bg: #0F172A;          /* slate-900 */
    --color-surface: #1E293B;     /* slate-800 */
    --color-text: #F8FAFC;
    --color-muted: #94A3B8;
    --color-border: #334155;
    /* soft variants slightly stronger to remain visible on dark background */
    --color-accent-soft: rgba(16, 185, 129, 0.14);
    --color-success-soft: rgba(16, 185, 129, 0.14);
    --color-danger-soft:  rgba(239, 68, 68, 0.14);
    --color-info-soft:    rgba(59, 130, 246, 0.18);
    --color-purple-soft:  rgba(139, 92, 246, 0.18);
    --color-pink-soft:    rgba(236, 72, 153, 0.18);
    --color-warning-soft: rgba(245, 158, 11, 0.22);
    --color-muted-soft:   rgba(148, 163, 184, 0.16);
  }

  html, body, #root {
    height: 100%;
    background-color: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }

  *, *::before, *::after { box-sizing: border-box; }
}

@utility no-scrollbar {
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
```

### 1.2 Comment changer la couleur d'accent par client

**Une seule chose à modifier** dans `globals.css` :
```css
--color-accent: #VOTRE_HEX;            /* ex: #3B82F6 pour bleu */
--color-accent-soft: rgba(R, G, B, 0.08);
--color-accent-hover: #VERSION_PLUS_FONCEE;
```

Et dans `index.html` :
```html
<meta name="theme-color" content="#VOTRE_HEX" />
```

Quelques palettes pré-faites (à utiliser comme accent) :

| Nom | accent | accent-soft | accent-hover |
|---|---|---|---|
| Vert (défaut) | `#10B981` | `rgba(16,185,129,0.08)` | `#059669` |
| Bleu | `#3B82F6` | `rgba(59,130,246,0.08)` | `#2563EB` |
| Violet | `#8B5CF6` | `rgba(139,92,246,0.08)` | `#7C3AED` |
| Orange | `#F97316` | `rgba(249,115,22,0.08)` | `#EA580C` |
| Rose | `#EC4899` | `rgba(236,72,153,0.08)` | `#DB2777` |

### 1.3 Typographie

**Police** : Inter Variable (importée via `@fontsource-variable/inter`, pas de Google Fonts CDN — tout est en local pour PWA).

**Échelle utilisée** (Tailwind classes) :
- `text-xs` (12px) : badges, labels d'actions secondaires, méta-infos
- `text-sm` (14px) : **taille de base** pour le contenu (boutons, inputs, texte courant)
- `text-base` (16px) : titre de section dans Card (h2)
- `text-lg` (18px) : titre de page (h1 dans le Header)
- `text-xl` (20px) : titre de page large (mobile) ou titre de Card prééminente
- `text-2xl` (24px) : titre de détail (ex: numéro de facture)

**Poids** :
- `font-medium` (500) : boutons, labels, nav items actifs, badges
- `font-semibold` (600) : titres, montants
- `font-bold` (700) : très rare (uniquement le "B" du logo fallback)
- `font-mono` : numéros de référence (factures, codes client) — utilise la mono système

**Tracking** : `tracking-wider` uniquement pour les en-têtes de groupe sidebar (`text-[11px] font-semibold tracking-wider text-muted uppercase`).

### 1.4 Spacing

Tailwind v4 default scale. Conventions du projet :

- **Padding interne Card** : `p-6` (24px) sur desktop, `p-4` (16px) sur les Card compactes mobile.
- **Padding page** : `p-4 md:p-6` sur `<main>`.
- **Gap entre Cards** : `space-y-6` ou `gap-6` (24px).
- **Gap entre champs de form** : `space-y-3` ou `gap-3` (12px).
- **Padding interne button** : `px-3` (sm) ou `px-4` (md), hauteur fixe (cf. 2.1).
- **Padding interne input** : `px-3 h-11` (hauteur 44px = touch target mobile).

### 1.5 Border radius

Échelle stricte, **importante pour l'identité visuelle** :

| Token | Valeur | Usage |
|---|---|---|
| `rounded-lg` | 8px | nav items, menu items dropdown, badges, petits boutons internes |
| `rounded-xl` | 12px | **boutons (md)**, **inputs**, dropdown panels, **logo** (small) |
| `rounded-2xl` | 16px | **Cards**, modals, drawers, large containers |
| `rounded-full` | 50% | avatar utilisateur, status dots |
| `rounded-md` | 6px | badges status (plus serrés que les pills) |

**Ne jamais utiliser** `rounded` (4px) ou `rounded-3xl` (24px+). Toujours dans l'échelle 8→12→16.

### 1.6 Shadows

Une seule shadow custom : `--shadow-card: 0 2px 12px rgba(0,0,0,0.06)`. Utilisée via `shadow-card` sur les Cards, modals, drawers, dropdown menus.

Pour les boutons primaires : `shadow-sm` (Tailwind built-in, plus léger). Pas de shadow sur secondaires ou ghost.

---

## 2. Primitives UI

Tous dans `src/components/ui/`. Tous utilisent `forwardRef` quand pertinent et la fonction `cn()` de `src/lib/utils.ts` (clsx + tailwind-merge).

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 2.1 Button

```tsx
type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md'

const variantClasses = {
  primary: 'bg-accent text-white shadow-sm hover:bg-accent-hover',
  secondary: 'bg-surface border border-border text-text hover:bg-bg',
  ghost: 'bg-transparent text-text hover:bg-bg',
}
const sizeClasses = {
  sm: 'h-9 px-3 text-sm',   // 36px, pour actions secondaires
  md: 'h-11 px-4 text-sm',  // 44px = touch target — taille par défaut
}

// classes communes
'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30'
```

**Règles d'usage** :
- `primary` : action principale par écran (max 1, parfois 2).
- `secondary` : actions alternatives (annuler, télécharger, modifier).
- `ghost` : actions tertiaires (fermer, défiler).
- `size="md"` par défaut. `sm` pour les actions inline dans listes/cards denses.
- Icône `lucide-react` à gauche du label, taille `h-4 w-4` (sm) ou `h-4 w-4` (md aussi — l'icône reste compacte). Gap géré par `gap-2`.

### 2.2 Card

```tsx
'bg-surface rounded-2xl shadow-card border border-border/40 p-6'
```

Note la bordure à 40 % d'opacité — elle adoucit la transition entre Card et bg. **Toujours** combiner `shadow-card` ET `border-border/40` — c'est ce qui donne ce rendu "floating mais ancré".

### 2.3 Input

```tsx
'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text placeholder:text-muted',
'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
'disabled:opacity-50 disabled:pointer-events-none',
```

**Variants** : pas de variants. Toujours pleine largeur dans son parent, hauteur fixe 44px. Si un input doit être plus court, on contraint son parent (`w-48`, `sm:w-44`…). Pour les types spéciaux (`type="date"`, `type="month"`, `type="number"`, etc.), la classe reste identique — Tailwind ne s'applique pas aux indicateurs natifs mais le reste est cohérent.

### 2.4 Label

```tsx
'text-sm font-medium text-muted'
```

Toujours au-dessus du champ avec `mb-1.5 block`. L'astérisque rouge `*` pour les champs requis est inline dans le label (pas séparé).

### 2.5 Spinner

SVG inline (pas d'image). Tailles `sm` (16px), `md` (24px), `lg` (40px). Animation via `animate-spin`. Couleur héritée via `text-current`, donc on combine : `<Spinner size="lg" className="text-accent" />`.

### 2.6 Combobox

Pattern de dropdown filtrable :
- Trigger : `h-11 rounded-xl border` (identique à un Input).
- ChevronDown à droite, valeur sélectionnée ou placeholder à gauche.
- Au click → ouvre un panneau `absolute z-30 mt-2 rounded-xl bg-surface border border-border shadow-card`.
- Input de recherche en haut du panneau, liste filtrée avec normalisation accent + casse.
- Item highlighted : `bg-bg`. Item sélectionné : `bg-accent-soft text-accent` + icône `Check` à droite.
- Touch targets : `h-11` minimum sur chaque item.
- Fermeture : click outside, Escape, sélection.

### 2.7 Drawer

Slide-from-right, mobile et desktop.

```tsx
// Backdrop
'absolute inset-0 bg-black/40'

// Panneau (mobile : full width, desktop : 480px)
'absolute right-0 top-0 h-full w-full md:w-[480px] bg-surface shadow-card flex flex-col'
'transition-transform duration-200 ease-out'
// open: 'translate-x-0', closed: 'translate-x-full'
```

Header drawer : `h-16 px-5 flex items-center justify-between border-b border-border shrink-0`. Bouton fermer X à droite (`h-10 w-10 rounded-xl`).

Footer drawer (optionnel) : `px-5 py-4 border-t border-border bg-surface shrink-0`.

**Comportements clés** :
- `body { overflow: hidden }` quand ouvert (lock scroll).
- Fermeture sur Escape.
- Autofocus du premier input/textarea/select sur ouverture.
- Z-index `z-40` (au-dessus du header `z-20`, sous les modals `z-50`).

### 2.8 ConfirmDialog

Modal centrée, fond `bg-black/40`, panneau `max-w-md rounded-2xl shadow-card border border-border/40 p-6`. Title `text-lg font-semibold`, description `text-sm text-muted mb-6`. Boutons alignés à droite : Annuler (ghost) + Confirmer (primary OU `bg-danger hover:bg-danger/90` si `confirmVariant='danger'`).

Z-index `z-50`. Escape ferme (sauf si `loading`).

### 2.9 FileUploadZone

Drop zone avec 3 états :
1. **Vide** : `rounded-xl border-2 border-dashed p-6 text-center cursor-pointer` + icône Upload + texte help.
2. **Drag over** : `border-accent bg-accent/5`.
3. **File picked** : `rounded-xl border border-accent/40 bg-accent/5 p-4` + nom + taille + bouton X pour retirer.

Si un fichier existant est passé en `currentFile` (mode édition), affiche un état "Replace" avec lien `text-accent hover:underline`.

---

## 3. Layout

### 3.1 AppLayout

```tsx
<div className="min-h-screen bg-bg">
  <Sidebar mobileOpen={menuOpen} onMobileClose={...} />
  <div className="md:pl-[220px] flex flex-col min-h-screen">
    <Header onOpenMenu={...} />
    <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
      <Outlet />
    </main>
  </div>
</div>
```

**Notes** :
- Sidebar fixe à gauche en desktop, drawer à gauche en mobile.
- Contenu principal a un `padding-left` de 220px (= largeur sidebar) **uniquement** à partir de `md:`.
- `overflow-x-hidden` sur `<main>` est un filet de sécurité — empêche un bug ponctuel de faire scroller toute la page.
- Auto-close du drawer mobile sur changement de route (`useEffect` sur `pathname`).

### 3.2 Sidebar (desktop)

```tsx
<aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 w-[220px] bg-surface border-r border-border z-30">
  <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
    <Logo size={32} />
    <span className="font-semibold text-text">Business OS</span>
  </div>
  <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
    {/* groupes */}
  </nav>
</aside>
```

**Groupes** : titre `text-[11px] font-semibold tracking-wider text-muted px-3 mb-2`. Items dans `<ul className="space-y-1">`.

**NavLink item** :
```tsx
className={({ isActive }) =>
  cn(
    'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
    isActive
      ? 'bg-accent-soft text-accent font-medium'
      : 'text-text/80 hover:bg-bg'
  )
}
```

Avec, quand actif, une **barre verticale verte** à gauche :
```tsx
{isActive && (
  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent" />
)}
```

C'est cette barre + le fond `bg-accent-soft` qui font l'identité visuelle de l'item actif.

### 3.3 Sidebar mobile (drawer slide-from-left)

Même `<NavContent />` réutilisé. Animation slide-from-left, fond `bg-black/40`, panneau `w-[260px] max-w-[80vw]`.

Comportement : lock body scroll, fermeture sur Escape, fermeture sur click backdrop, fermeture sur click NavLink (passe `onNavigate` qui appelle `onMobileClose`).

### 3.4 Header

```tsx
<header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
```

**Gauche** : bouton hamburger (`md:hidden`, `h-10 w-10 rounded-xl`) + titre de page (`text-lg font-semibold`, dérivé du pathname via `nav-items`).

**Droite** :
- Toggle thème (`h-10 w-10 rounded-xl text-muted hover:bg-bg`, icône `Sun` ou `Moon`).
- Avatar utilisateur (`h-10 w-10 rounded-full bg-accent-soft text-accent`, icône `User`).
- Au click avatar : dropdown `absolute right-0 mt-2 w-64 rounded-xl bg-surface border border-border shadow-card p-2 z-50`.
- Items du dropdown : padding `px-3 py-2`, hover `bg-bg`, gap `2`, icône taille `h-4 w-4`.
- Première section "Connecté en tant que" avec border-bottom.

### 3.5 Bottom nav mobile

**Pas utilisé dans Business OS final** — le drawer hamburger remplace cette approche pour scaler à N pages. Voir leçon `[2026-05-13]` dans `tasks/lessons.md`. Pour une app cliente avec peu de pages (≤4), une bottom nav reste valable.

Pattern bottom nav (si tu en veux une) :
```tsx
<nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-surface border-t border-border flex">
  {items.map(item => (
    <NavLink key={item.path} to={item.path}
      className={({ isActive }) => cn(
        'flex-1 flex flex-col items-center justify-center gap-1 text-xs',
        isActive ? 'text-accent' : 'text-muted'
      )}>
      <item.icon className="h-5 w-5" />
      <span>{item.label}</span>
    </NavLink>
  ))}
</nav>
```

Avec `pb-20 md:pb-0` (ou équivalent) sur `<main>` pour pas que le contenu passe sous la bottom nav.

---

## 4. Patterns récurrents

### 4.1 Status badges

Pattern pill avec fond soft + texte coloré.

```tsx
const STYLES = {
  pending: 'bg-bg text-muted',
  paid:    'bg-accent-soft text-accent',
  late:    'bg-danger/10 text-danger',
}

<span className={cn(
  'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
  STYLES[status]
)}>
  {label}
</span>
```

Variantes courantes :
- `bg-warning-soft text-warning` : en attente / en retard léger
- `bg-info-soft text-info` : info / neutre
- `bg-purple-soft text-purple` : tag custom
- `bg-pink-soft text-pink` : autre tag

### 4.2 Source / type chips colorés

Plus visuels (avec dot) pour les sources de prospects ou catégories :

```tsx
<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-info-soft text-info">
  <span className="h-1.5 w-1.5 rounded-full bg-info" />
  LinkedIn
</span>
```

### 4.3 Dropdown menus ⋯

Bouton trigger `h-11 w-11 rounded-xl border border-border bg-surface flex items-center justify-center text-text hover:bg-bg`.

Panneau :
```tsx
<div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface border border-border shadow-card p-2 z-30">
  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text hover:bg-bg transition">
    <Icon className="h-4 w-4" /> Action
  </button>
  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition">
    <Icon className="h-4 w-4" /> Action destructive
  </button>
</div>
```

⚠️ **Si le menu est dans une liste pouvant être proche du bas** : mesure l'espace disponible et bascule `top-12` ↔ `bottom-12` selon `window.innerHeight - rect.bottom`. Voir leçon `[2026-05-13]` dans `tasks/lessons.md`.

### 4.4 Empty states (Card centrée)

```tsx
<Card className="text-center py-12">
  <p className="text-sm text-muted mb-4">Aucun élément pour l'instant.</p>
  <Button onClick={...}>
    <Plus className="h-4 w-4" /> Créer
  </Button>
</Card>
```

### 4.5 Erreur / banner d'avertissement

```tsx
<div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
  Message d'erreur.
</div>
```

Variante warning :
```tsx
<div className="flex items-start gap-3 rounded-xl bg-warning/10 text-warning border border-warning/30 px-4 py-3">
  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
  <div className="flex-1 text-sm">Message d'attention.</div>
</div>
```

### 4.6 Focus rings

Tous les éléments interactifs (boutons, inputs, links) :
- `focus:outline-none focus:ring-2 focus:ring-accent/20` (inputs)
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30` (boutons)

**Toujours** une variante `focus-visible` (clavier uniquement) pour les boutons. `focus` brut sur inputs.

### 4.7 Transitions

`transition` (default Tailwind = 150ms) sur tous les éléments interactifs. Pas d'animation custom pour les boutons.

Pour les drawers / modals : `transition-transform duration-200 ease-out` et `transition-opacity duration-200`.

### 4.8 Tables vs cards mobile

**Règle absolue** : un tableau de données doit avoir une variante mobile en cards.

```tsx
{/* Desktop */}
<div className="hidden md:block">
  <table>...</table>
</div>

{/* Mobile */}
<div className="md:hidden space-y-3">
  {items.map(item => (
    <Card key={item.id} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-text truncate">{item.title}</div>
          <div className="text-xs text-muted mt-1">{item.subtitle}</div>
        </div>
        <ActionsMenu item={item} />
      </div>
    </Card>
  ))}
</div>
```

### 4.9 Forms

Layout type :
- Tout dans une `<Card>` ou plusieurs Cards (sections logiques).
- `space-y-3` entre champs verticalement.
- Grids `grid-cols-1 sm:grid-cols-2 gap-3` pour les champs courts (date + select).
- Bouton submit en bas, **align right** : `<div className="flex items-center justify-end gap-2"><Button variant="ghost">Annuler</Button><Button type="submit">Enregistrer</Button></div>`.
- Pendant submit : `<Spinner size="sm" />` à la place du label, `disabled` actif.

Pattern de form recommandé : **React Hook Form 7 + Zod 4** + `zodResolver`.

```tsx
const form = useForm<FormValues, undefined, FormOutput>({
  resolver: zodResolver(schema),
  defaultValues: empty,
  mode: 'onBlur',
})
```

**Double-submit guard obligatoire** (cf. leçon `[2026-05-13]` dans `tasks/lessons.md`) :

```tsx
const submittingRef = useRef(false)
async function guardedSubmit(values) {
  if (submittingRef.current) return
  submittingRef.current = true
  try { await onSubmit(values) }
  finally { submittingRef.current = false }
}
// ... onSubmit={handleSubmit(guardedSubmit)}
```

---

## 5. Mobile-first rules (du CLAUDE.md projet)

Recopiées ici pour rappel — à respecter sans exception :

- **Aucun débordement horizontal** sur écran 360px (iPhone SE). Tester en DevTools mode mobile **avant** de marquer une tâche complete.
- **Pas de largeurs fixes** (`w-48`, `w-[300px]`, etc.) sans variant responsive (`w-full sm:w-48`).
- **Boutons d'action** : sur mobile, `flex-wrap` ou stack vertical, **jamais** une ligne unique trop large. Pattern : `flex flex-wrap items-center gap-2` avec `flex-1 sm:flex-initial min-w-0` sur chaque bouton.
- **Cartes header / fiches détail** : `flex-col sm:flex-row` quand il y a un côté gauche (infos) + côté droit (action / montant).
- **Tableaux** : toujours fournir une variante mobile en cards.
- **Formulaires** : grille 2 colonnes uniquement à partir de `sm:` ou `md:`.
- **Texte long** (numéros, codes, références) : `break-words` ou `truncate` selon le contexte.
- **Touch targets** : min 44×44px (`h-11 w-11` ou `min-h-11`).
- **Layout split view** (form + preview côte à côte) : sur mobile, basculer en tabs ou stacker verticalement.

**Safety net** : `overflow-x-hidden` sur `<main>` dans `AppLayout`. **N'est pas une excuse** pour laisser du contenu déborder, c'est un filet.

---

## 6. Icônes

**`lucide-react` uniquement**. Tailles standards :

- `h-4 w-4` (16px) : dans les boutons sm, badges, menu items dropdown.
- `h-5 w-5` (20px) : dans le Header, Sidebar, boutons md, FileUploadZone.
- `h-6 w-6` (24px) : titre de section avec icône (rare).

Couleur : héritée du parent via `text-current`. Pour colorer explicitement : `text-muted`, `text-accent`, `text-danger`.

Icônes les plus utilisées : `Plus`, `Pencil`, `Trash2`, `Archive`, `X`, `Check`, `ChevronDown`, `ChevronRight`, `ArrowLeft`, `MoreHorizontal`, `Search`, `Sun`, `Moon`, `LogOut`, `Settings`, `User`, `FileText`, `Download`, `Upload`, `CheckCircle`, `AlertCircle`, `Spinner` (custom SVG, pas lucide).

---

## 7. Theme (light / dark)

Implémenté avec Zustand + persist. Fichier : `src/stores/theme.ts`.

- Mode initial : détecté via `prefers-color-scheme`.
- Persist : `localStorage` clé `business-os-theme` (renommer par projet).
- Application : `document.documentElement.classList.toggle('dark', mode === 'dark')`.
- Toggle bouton dans le Header.

Le CSS `html.dark { --color-* : ... }` fait le reste — tous les composants utilisant les tokens héritent automatiquement du dark mode. **Aucun composant ne devrait avoir de logique conditionnelle `dark:` Tailwind** — tout passe par les tokens.

---

## 8. PWA setup

### 8.1 `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Business OS',
        short_name: 'Business OS',
        description: 'Gestion d\'entreprise pour opérateur solo',
        theme_color: '#10B981',
        background_color: '#F4F6F8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },  // ⚠️ jamais en dev
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

⚠️ **`devOptions.enabled: false`** est critique. L'activer casse HMR (voir leçon `[2026-05-12]`).

### 8.2 Génération des icônes

`@vite-pwa/assets-generator` avec `minimal2023Preset`. Script `npm run generate-pwa-assets`. Note : génère `apple-touch-icon-180x180.png` (pas `apple-touch-icon.png`).

### 8.3 `index.html`

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="alternate icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#10B981" />
```

---

## 9. Fork pour une app cliente — Checklist

À chaque fois que tu prépares une nouvelle app cliente, voici la liste des fichiers à toucher pour adopter le style à l'identique :

1. **`src/styles/globals.css`** : copier intégralement. Changer `--color-accent`, `--color-accent-soft`, `--color-accent-hover` si tu veux personnaliser. Le reste (texte, bg, dark mode, shadow, fonts) ne change pas.
2. **`src/lib/utils.ts`** : copier la fonction `cn()` telle quelle.
3. **`src/components/ui/`** : copier `Button.tsx`, `Card.tsx`, `Input.tsx`, `Label.tsx`, `Spinner.tsx` minimum. Ajouter `Drawer`, `ConfirmDialog`, `FileUploadZone`, `Combobox` selon les besoins.
4. **`src/components/layout/`** : copier la structure mais simplifier — pour un portail client, **pas de sidebar** typiquement, juste un Header + tabs en haut (ou bottom nav si peu de pages).
5. **`src/stores/theme.ts`** : copier tel quel. Renommer la clé localStorage (`business-os-theme` → `<project>-theme`).
6. **`index.html`** : copier la structure, changer `<title>`, `<meta description>`, `<meta theme-color>`.
7. **`vite.config.ts`** : copier la config PWA, changer `manifest.name`, `short_name`, `description`, `theme_color`.
8. **PWA assets** : régénérer avec `npm run generate-pwa-assets` après avoir mis un nouveau logo dans `public/`.
9. **`tailwindcss-merge` + `clsx`** : installer comme dépendances (`tailwind-merge`, `clsx`).
10. **`@fontsource-variable/inter`** : dépendance NPM.

### Dépendances NPM minimales pour reproduire le système

```json
{
  "@fontsource-variable/inter": "^5.x",
  "@tailwindcss/vite": "^4.x",
  "clsx": "^2.x",
  "lucide-react": "^1.x",
  "tailwind-merge": "^3.x",
  "tailwindcss": "^4.x",
  "vite-plugin-pwa": "^1.x",
  "zustand": "^5.x"
}
```

Plus, selon le périmètre de l'app :
- `react-router-dom` v7
- `@tanstack/react-query` v5
- `react-hook-form` v7 + `@hookform/resolvers` + `zod` v4
- `@supabase/supabase-js` v2

---

## 10. Anti-patterns à éviter

À ne **jamais** faire pour préserver la cohérence visuelle :

- Hex couleurs hardcodés dans les composants (sauf dans `globals.css` et `pdf/styles.ts`).
- Ombres autres que `shadow-card` ou `shadow-sm`.
- Border radius hors de l'échelle `rounded-lg / xl / 2xl / full`.
- Touch targets < 44px sur mobile (sauf icônes décoratives non-cliquables).
- Tableaux scrollables horizontalement sur mobile.
- Largeurs fixes sans variante responsive.
- Mode dark via classes `dark:` Tailwind — toujours passer par les tokens.
- Variantes de Button autres que `primary / secondary / ghost`.
- Cards sans `shadow-card + border-border/40` (les deux).
- Police autre qu'Inter Variable.

---

## 11. Référence rapide — combos qui marchent

Cards listées dans une grille responsive :
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>...</Card>
</div>
```

Card avec header + corps + footer :
```tsx
<Card>
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-base font-semibold text-text">Titre</h2>
    <Button size="sm" variant="secondary">Action</Button>
  </div>
  <div className="space-y-3">{/* corps */}</div>
  <div className="flex items-center justify-end mt-4 pt-3 border-t border-border">
    {/* footer / total */}
  </div>
</Card>
```

Filtre + recherche + bouton create en ligne :
```tsx
<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  <div className="relative flex-1 max-w-md">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
    <Input className="pl-9" placeholder="Rechercher…" />
  </div>
  <Button onClick={...}><Plus className="h-4 w-4" /> Créer</Button>
</div>
```

Page header (titre + sous-titre + actions) :
```tsx
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
  <div className="min-w-0">
    <h1 className="text-xl sm:text-2xl font-semibold text-text mb-1 break-words">Titre de page</h1>
    <p className="text-sm text-muted">Sous-titre descriptif</p>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <Button variant="secondary">Action 2</Button>
    <Button>Action principale</Button>
  </div>
</div>
```

---

C'est tout. Avec ce doc + les fichiers copiables (`globals.css`, `cn()`, `Button.tsx`, `Card.tsx`, `Input.tsx`, `Label.tsx`, `Spinner.tsx`), un autre développeur (ou Claude) peut reproduire le système à l'identique. Pour une app cliente : copier les tokens, changer la couleur d'accent, et tout le reste suit.
