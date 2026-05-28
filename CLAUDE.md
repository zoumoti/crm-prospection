# CRM Prospection — règles projet

App de prospection (PWA mobile-first) : Dashboard (funnel + objectifs + relances),
pipeline CRM, relances, et intake Telegram (URL → contact).

## Stack
React 19 + TS 6 + Vite + Tailwind v4 + Supabase + React Query + RHF + Zod.
Fonctions serverless Vercel dans `api/` (webhook Telegram).

## Conventions
- Mobile-first obligatoire : aucun débordement horizontal sur 360px, tableaux en
  cards sur mobile, touch targets ≥ 44px.
- Tokens couleurs uniquement (`bg-bg`, `bg-surface`, `bg-accent`, `text-text`…),
  jamais de hex hardcodé hors `globals.css`.
- RLS user-scoped sur toutes les tables Supabase.
- Soft delete via `archived_at`, pas de hard delete.
- Migration SQL unique : `supabase/migrations/0001_init.sql`.
- Nom de l'app centralisé dans `src/config/brand.ts`.

## Setup
Voir `README.md`.
