import { type FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/stores/auth'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Logo } from '@/components/ui/Logo'
import { APP_NAME } from '@/config/brand'

const ALLOW_SIGNUP = import.meta.env.VITE_ALLOW_SIGNUP === 'true'

export function LoginPage() {
  const { session, signIn, signUp, loading, initialized } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Spinner size="lg" className="text-accent" />
      </div>
    )
  }

  if (session) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
    return <Navigate to={from} replace />
  }

  const isSignup = mode === 'signup'

  function switchMode(next: 'signin' | 'signup') {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (isSignup) {
      const { error, needsConfirmation } = await signUp(email, password)
      if (error) {
        setError(error)
        return
      }
      if (needsConfirmation) {
        setInfo('Compte créé. Vérifie ta boîte mail pour confirmer, puis connecte-toi.')
        setMode('signin')
        return
      }
      navigate('/', { replace: true })
      return
    }

    const { error } = await signIn(email, password)
    if (error) {
      setError(error)
      return
    }
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={36} />
          <span className="font-semibold text-text text-lg">{APP_NAME}</span>
        </div>

        <h1 className="text-2xl font-semibold text-text mb-1">
          {isSignup ? 'Créer un compte' : 'Se connecter'}
        </h1>
        <p className="text-sm text-muted mb-6">
          {isSignup ? 'Crée ton espace de prospection.' : 'Accède à ton espace de prospection.'}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted hover:text-text transition"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {info && (
            <div className="text-sm text-success bg-success/10 rounded-lg px-3 py-2">
              {info}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Spinner size="sm" /> : isSignup ? 'Créer mon compte' : 'Se connecter'}
          </Button>
        </form>

        {ALLOW_SIGNUP && (
          <div className="mt-4 text-center text-sm text-muted">
            {isSignup ? (
              <>
                Déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-accent font-medium hover:underline"
                >
                  Se connecter
                </button>
              </>
            ) : (
              <>
                Pas encore de compte ?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-accent font-medium hover:underline"
                >
                  Créer un compte
                </button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
