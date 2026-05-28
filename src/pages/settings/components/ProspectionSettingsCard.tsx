import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import {
  prospectionSettingsSchema,
  emptyProspectionSettingsForm,
  type ProspectionSettingsFormValues,
  type ProspectionSettingsFormOutput,
} from '@/features/crm/schema'
import { useProspectionSettings, useUpsertProspectionSettings } from '@/features/crm/hooks'
import type { ProspectionSettings } from '@/types/database'

function toFormValues(s: ProspectionSettings | null | undefined): ProspectionSettingsFormValues {
  if (!s) return emptyProspectionSettingsForm
  return {
    weekly_message_goal: s.weekly_message_goal,
    weekly_call_goal: s.weekly_call_goal,
    followup_1_days: s.followup_1_days,
    followup_2_days: s.followup_2_days,
    conversation_followup_days: s.conversation_followup_days,
    max_followups: s.max_followups,
    telegram_chat_id: s.telegram_chat_id ?? '',
    daily_recap_enabled: s.daily_recap_enabled,
    daily_recap_hour: s.daily_recap_hour,
  }
}

export function ProspectionSettingsCard() {
  const { data: settings, isLoading } = useProspectionSettings()
  const upsertMutation = useUpsertProspectionSettings()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const busyRef = useRef(false)

  const form = useForm<ProspectionSettingsFormValues, undefined, ProspectionSettingsFormOutput>({
    resolver: zodResolver(prospectionSettingsSchema),
    defaultValues: emptyProspectionSettingsForm,
    mode: 'onBlur',
  })
  const { register, handleSubmit, reset, formState } = form
  const { errors } = formState

  useEffect(() => {
    if (!isLoading) reset(toFormValues(settings))
  }, [isLoading, settings, reset])

  async function onValid(values: ProspectionSettingsFormOutput) {
    if (busyRef.current) return
    busyRef.current = true
    setSubmitError(null)
    try {
      await upsertMutation.mutateAsync(values)
      setSavedAt(Date.now())
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      busyRef.current = false
    }
  }

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-6"><Spinner className="text-accent" /></div>
      </Card>
    )
  }

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold mb-1">Prospection</h2>
      <p className="text-sm text-muted mb-4">
        Objectifs hebdomadaires et délais des relances. Les délais s'appliquent à 9h00 (Europe/Paris).
      </p>

      <form onSubmit={handleSubmit(onValid)} className="space-y-5" noValidate>
        {submitError && (
          <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2" role="alert">{submitError}</div>
        )}

        <Section title="Objectifs hebdo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldWrapper label="Messages / semaine" error={errors.weekly_message_goal?.message}>
              <Input type="number" inputMode="numeric" min={0} max={10000}
                     {...register('weekly_message_goal')} />
            </FieldWrapper>
            <FieldWrapper label="Appels / semaine" error={errors.weekly_call_goal?.message}>
              <Input type="number" inputMode="numeric" min={0} max={10000}
                     {...register('weekly_call_goal')} />
            </FieldWrapper>
          </div>
        </Section>

        <Section title="Délais relances">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldWrapper label="Délai relance #1 (jours)" error={errors.followup_1_days?.message}>
              <Input type="number" inputMode="numeric" min={1} max={365}
                     {...register('followup_1_days')} />
            </FieldWrapper>
            <FieldWrapper label="Délai relance #2+ (jours)" error={errors.followup_2_days?.message}>
              <Input type="number" inputMode="numeric" min={1} max={365}
                     {...register('followup_2_days')} />
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldWrapper label='Cadence suivi conversation (jours)'
                          error={errors.conversation_followup_days?.message}>
              <Input type="number" inputMode="numeric" min={1} max={365}
                     {...register('conversation_followup_days')} />
            </FieldWrapper>
            <FieldWrapper label="Nombre max de relances avant abandon"
                          error={errors.max_followups?.message}>
              <Input type="number" inputMode="numeric" min={1} max={10}
                     {...register('max_followups')} />
            </FieldWrapper>
          </div>
        </Section>

        <Section title="Telegram">
          <p className="text-xs text-muted -mt-1 mb-1">
            Pour activer l'intake mobile et le récap quotidien : ouvre Telegram,
            envoie <code>/start</code> à ton bot, et colle ici le <code>chat_id</code> qu'il te renvoie.
          </p>
          <FieldWrapper label="Chat ID Telegram" error={errors.telegram_chat_id?.message}>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="ex. 123456789"
              {...register('telegram_chat_id')}
            />
          </FieldWrapper>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldWrapper label="Heure du récap (Europe/Paris)" error={errors.daily_recap_hour?.message}>
              <select
                className="w-full min-h-[44px] rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                {...register('daily_recap_hour', { valueAsNumber: true })}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                ))}
              </select>
            </FieldWrapper>
            <FieldWrapper label="Récap quotidien">
              <label className="flex items-center gap-2 min-h-[44px]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-accent"
                  {...register('daily_recap_enabled')}
                />
                <span className="text-sm">Recevoir chaque matin</span>
              </label>
            </FieldWrapper>
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {savedAt && Date.now() - savedAt < 5000 && (
            <span className="text-xs text-success">✓ Enregistré</span>
          )}
          <Button type="submit" disabled={upsertMutation.isPending} className="ml-auto">
            {upsertMutation.isPending ? <Spinner size="sm" /> : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wider text-muted uppercase mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function FieldWrapper({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <Label className="mb-1.5 block">{label}</Label>}
      {children}
      {error && <div className={cn('text-xs text-danger mt-1')}>{error}</div>}
    </div>
  )
}
