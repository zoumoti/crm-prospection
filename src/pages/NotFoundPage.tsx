import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <Card className="max-w-md text-center">
        <h1 className="text-4xl font-bold text-accent mb-2">404</h1>
        <p className="text-muted mb-4">Cette page n'existe pas.</p>
        <Link to="/" className="text-accent hover:underline text-sm font-medium">
          Retour au dashboard
        </Link>
      </Card>
    </div>
  )
}
