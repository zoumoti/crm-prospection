import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

function detectSystemMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: detectSystemMode(),
      setMode: (mode) => {
        applyMode(mode)
        set({ mode })
      },
      toggle: () => {
        const next = get().mode === 'dark' ? 'light' : 'dark'
        applyMode(next)
        set({ mode: next })
      },
    }),
    {
      name: 'business-os-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyMode(state.mode)
      },
    }
  )
)
