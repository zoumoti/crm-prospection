import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { useAuth } from './stores/auth'
import { queryClient } from './lib/queryClient'
import './styles/globals.css'

// Kick off auth initialization (non-blocking — components show spinner until ready)
useAuth.getState().init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
