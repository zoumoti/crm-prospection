import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  initialized: boolean
  loading: boolean
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  initialized: false,
  loading: false,

  init: async () => {
    const { data } = await supabase.auth.getSession()
    set({
      session: data.session,
      user: data.session?.user ?? null,
      initialized: true,
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
    })
  },

  signIn: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    set({
      session: data.session,
      user: data.user,
      loading: false,
    })
    return { error: error?.message ?? null }
  },

  signUp: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signUp({ email, password })
    set({
      session: data.session,
      user: data.user,
      loading: false,
    })
    // When "Confirm email" is OFF in Supabase, signUp returns a session and the
    // user is logged in immediately. When it's ON, session is null and they must
    // confirm via email first.
    return { error: error?.message ?? null, needsConfirmation: !error && !data.session }
  },

  signOut: async () => {
    set({ loading: true })
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[auth] signOut failed:', error)
    set({ session: null, user: null, loading: false })
  },
}))
