// api/_lib/supabase-admin.ts
// Service-role Supabase client for server-side use only.
// Bypasses RLS — every query MUST explicitly filter by user_id
// to maintain user-scoping semantics.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env.js'

let cached: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
