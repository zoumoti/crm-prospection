import type { ContactStage } from '@/types/database'

export interface StageDef {
  id: ContactStage
  label: string
  /** Tailwind class for the badge background (tokens only) */
  bg: string
  /** Tailwind class for the badge text (tokens only) */
  text: string
}

/**
 * Canonical ordering of the 7 stages. The Pipeline columns and mobile tabs
 * read from this array directly. Modify here only — never duplicate.
 */
export const STAGES: readonly StageDef[] = [
  { id: 'to_contact',        label: 'À contacter',       bg: 'bg-muted-soft',   text: 'text-muted' },
  { id: 'message_sent',      label: 'Message envoyé',    bg: 'bg-info-soft',    text: 'text-info' },
  { id: 'replied',           label: 'A répondu',         bg: 'bg-accent-soft',  text: 'text-success' },
  { id: 'booking_link_sent', label: 'Lien envoyé',       bg: 'bg-purple-soft',  text: 'text-purple' },
  { id: 'call_booked',       label: 'Appel réservé',     bg: 'bg-warning-soft', text: 'text-warning' },
  { id: 'closed_won',        label: 'Closé ✓',           bg: 'bg-accent',       text: 'text-white' },
  { id: 'closed_lost',       label: 'Pas intéressé ✗',  bg: 'bg-muted',        text: 'text-white' },
] as const

const STAGE_BY_ID: Record<ContactStage, StageDef> = Object.fromEntries(
  STAGES.map(s => [s.id, s])
) as Record<ContactStage, StageDef>

export function getStage(id: ContactStage): StageDef {
  return STAGE_BY_ID[id]
}

/**
 * CSS `var(--color-*)` reference for a stage's background, usable inside
 * inline `style={{ fill: ... }}` (e.g. SVG <polygon>). Strips the `bg-`
 * prefix and rewrites to the Tailwind v4 token CSS variable.
 *
 * Example: `bg-info-soft` → `var(--color-info-soft)`.
 */
export function getStageFillVar(id: ContactStage): string {
  const stage = getStage(id)
  const token = stage.bg.replace(/^bg-/, '')
  return `var(--color-${token})`
}

type SourceKey = NonNullable<import('@/types/database').ContactSource>

export const SOURCE_LABELS: Record<SourceKey, string> = {
  linkedin:  'LinkedIn',
  instagram: 'Instagram',
  twitter:   'Twitter/X',
  tiktok:    'TikTok',
  email:     'Email',
  other:     'Autre',
}

/**
 * Tailwind class pair (bg + text) for the source chip on contact cards.
 * Brand-evoking color per platform so the operator spots the channel at a glance.
 * Tokens only (see CLAUDE.md). Pink token added in globals.css for Instagram.
 */
export const SOURCE_STYLES: Record<SourceKey, { bg: string; text: string }> = {
  linkedin:  { bg: 'bg-info-soft',   text: 'text-info' },     // bleu LinkedIn
  instagram: { bg: 'bg-pink-soft',   text: 'text-pink' },     // rose/magenta Instagram
  tiktok:    { bg: 'bg-danger-soft', text: 'text-danger' },   // rouge TikTok
  twitter:   { bg: 'bg-muted-soft',  text: 'text-text' },     // X est noir / sombre
  email:     { bg: 'bg-muted-soft',  text: 'text-muted' },    // neutre
  other:     { bg: 'bg-muted-soft',  text: 'text-muted' },    // neutre
}
