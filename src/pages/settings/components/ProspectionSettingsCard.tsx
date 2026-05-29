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
import {
  useProspectionSettings,
  useUpsertProspectionSettings,
  useSetTelegramLinkCode,
  useDisconnectTelegram,
} from '@/features/crm/hooks'
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
    <>
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

      <TelegramCard connected={!!settings?.telegram_chat_id} />
    </>
  )
}

function TelegramCard({ connected }: { connected: boolean }) {
  const setLinkCode = useSetTelegramLinkCode()
  const disconnect = useDisconnectTelegram()
  const [error, setError] = useState<string | null>(null)
  const [opened, setOpened] = useState(false)

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined

  async function handleConnect() {
    setError(null)
    if (!botUsername) {
      setError("Bot Telegram non configuré (variable VITE_TELEGRAM_BOT_USERNAME manquante).")
      return
    }
    try {
      const code = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      await setLinkCode.mutateAsync(code)
      const handle = botUsername.replace(/^@/, '')
      window.open(`https://t.me/${handle}?start=${code}`, '_blank')
      setOpened(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  async function handleDisconnect() {
    setError(null)
    try {
      await disconnect.mutateAsync()
      setOpened(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold mb-1">Telegram</h2>
      <p className="text-sm text-muted mb-4">
        Une fois connecté, envoie une URL de profil (LinkedIn, Instagram, TikTok, X) à ton bot
        depuis ton téléphone et le contact se crée tout seul dans ton CRM.
      </p>

      {error && (
        <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2 mb-3" role="alert">{error}</div>
      )}

      {connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-success font-medium">✓ Telegram connecté</span>
          <Button
            variant="ghost"
            onClick={handleDisconnect}
            disabled={disconnect.isPending}
            className="text-danger hover:bg-danger/10"
          >
            {disconnect.isPending ? <Spinner size="sm" /> : 'Déconnecter'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button onClick={handleConnect} disabled={setLinkCode.isPending}>
            {setLinkCode.isPending ? <Spinner size="sm" /> : 'Connecter Telegram'}
          </Button>
          {opened && (
            <p className="text-xs text-muted">
              Telegram s'est ouvert → tape <b>Démarrer</b>, puis reviens ici : l'état se met à jour tout seul.
            </p>
          )}
        </div>
      )}
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
