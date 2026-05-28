import { Card } from '@/components/ui/Card'

export function StubPage({ title }: { title: string }) {
  return (
    <Card className="max-w-md mx-auto mt-12 text-center">
      <h2 className="text-xl font-semibold text-text mb-2">{title}</h2>
      <p className="text-muted">Module à venir.</p>
    </Card>
  )
}
