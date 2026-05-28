function isUrl(v: string): boolean {
  try {
    new URL(v)
    return true
  } catch {
    return false
  }
}

export function normalizeInstagram(v: string | null): string | null {
  if (!v) return null
  if (isUrl(v)) return v
  return `https://instagram.com/${v.replace(/^@/, '')}`
}

export function normalizeLinkedIn(v: string | null): string | null {
  if (!v) return null
  if (isUrl(v)) return v
  return `https://linkedin.com/in/${v.replace(/^@/, '')}`
}

export function normalizeTikTok(v: string | null): string | null {
  if (!v) return null
  if (isUrl(v)) return v
  return `https://tiktok.com/@${v.replace(/^@/, '')}`
}

export function displayHandle(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/^\/|\/$/g, '')
    if (u.host.includes('instagram')) return `@${path}`
    if (u.host.includes('linkedin')) return `/${path}`
    if (u.host.includes('tiktok')) return path.startsWith('@') ? path : `@${path}`
    return url
  } catch {
    return url
  }
}
