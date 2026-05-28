import { Card } from '@/components/ui/Card'

export function LinkedSectionStub({ title }: { title: string }) {
  return (
    <Card>
      <h3 className="text-xs font-semibold tracking-wider text-muted uppercase mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted">Module à venir.</p>
    </Card>
  )
}
