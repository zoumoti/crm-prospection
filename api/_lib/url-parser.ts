// api/_lib/url-parser.ts
// Parse a profile URL from one of the 4 supported platforms and extract
// (source, firstName, lastName). Returns null for any URL that doesn't
// match a known profile pattern, including platform pages like
// instagram.com/p/<post-id> or x.com/home — caller treats null as
// "URL non reconnue" and replies with a help message.

import type { ContactSource } from './types.js'

type ParsedProspect = {
  source: Extract<ContactSource, 'linkedin' | 'instagram' | 'tiktok' | 'twitter'>
  firstName: string
  lastName: string
}

// Non-profile path slugs to refuse. The PATTERN regex already constrains
// LinkedIn to /in/<slug> and TikTok to /@<slug>, so those are tight.
// IG and X share the same /<slug> structure as profiles, so we need a
// blacklist of system pages.
const RESERVED_SLUGS: Record<ParsedProspect['source'], Set<string>> = {
  linkedin:  new Set(),
  instagram: new Set([
    'p', 'reel', 'reels', 'explore', 'tv', 'stories',
    'accounts', 'about', 'directory', 'developer', 'legal',
  ]),
  tiktok:    new Set(),
  twitter:   new Set([
    'home', 'explore', 'notifications', 'messages',
    'i', 'search', 'settings', 'compose', 'login', 'signup',
  ]),
}

const PATTERNS: Array<{ source: ParsedProspect['source']; regex: RegExp; slugIndex: number }> = [
  { source: 'linkedin',  regex: /^https?:\/\/(www\.)?linkedin\.com\/in\/([^/?#]+)/i,            slugIndex: 2 },
  { source: 'instagram', regex: /^https?:\/\/(www\.)?instagram\.com\/([^/?#]+)/i,               slugIndex: 2 },
  { source: 'tiktok',    regex: /^https?:\/\/(www\.)?tiktok\.com\/@([^/?#]+)/i,                 slugIndex: 2 },
  { source: 'twitter',   regex: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/([^/?#]+)/i,        slugIndex: 3 },
]

export function parseProspectUrl(url: string): ParsedProspect | null {
  for (const { source, regex, slugIndex } of PATTERNS) {
    const m = url.match(regex)
    if (!m) continue
    const rawSlug = m[slugIndex]
    if (RESERVED_SLUGS[source].has(rawSlug.toLowerCase())) return null
    const { firstName, lastName } = extractName(rawSlug, source)
    return { source, firstName, lastName }
  }
  return null
}

function extractName(slug: string, source: ParsedProspect['source']): { firstName: string; lastName: string } {
  if (source === 'linkedin') {
    const parts = slug.split('-').filter(Boolean).map(capitalize)
    if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
    return { firstName: parts[0] ?? slug, lastName: '' }
  }
  const cleaned = slug.replace(/[._]/g, ' ').trim()
  return { firstName: capitalize(cleaned) || slug, lastName: '' }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
