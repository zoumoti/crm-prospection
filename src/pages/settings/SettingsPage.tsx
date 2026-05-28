import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { Logo } from '@/components/ui/Logo'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import {
  useCompanySettings,
  useUpsertSettings,
  useUploadLogo,
  useDeleteLogo,
} from '@/features/settings/hooks'
import {
  companyIdentitySchema,
  companyBankingSchema,
  emptyIdentityForm,
  emptyBankingForm,
  type CompanyIdentityValues,
  type CompanyIdentityOutput,
  type CompanyBankingValues,
  type CompanyBankingOutput,
} from '@/features/settings/schema'
import {
  taxSettingsSchema,
  emptyTaxSettingsForm,
  type TaxSettingsValues,
  type TaxSettingsOutput,
} from '@/features/taxes/schema'
import type { CompanySettings, TaxPeriodType } from '@/types/database'
import { ProspectionSettingsCard } from './components/ProspectionSettingsCard'

const MAX_LOGO_SIZE = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']

function settingsToIdentity(s: CompanySettings | null | undefined): CompanyIdentityValues {
  if (!s) return emptyIdentityForm
  return {
    legal_name: s.legal_name ?? '',
    commercial_name: s.commercial_name ?? '',
    address: s.address ?? '',
    siret: s.siret ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
  }
}

function settingsToBanking(s: CompanySettings | null | undefined): CompanyBankingValues {
  if (!s) return emptyBankingForm
  return {
    iban: s.iban ?? '',
    bic: s.bic ?? '',
    vat_mention: s.vat_mention ?? '',
  }
}

export function SettingsPage() {
  const { data: settings, isLoading } = useCompanySettings()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" className="text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <IdentitySection settings={settings ?? null} />
      <BankingSection settings={settings ?? null} />
      <TaxSettingsSection settings={settings ?? null} />
      <LogoSection settings={settings ?? null} />
      <ProspectionSettingsCard />
    </div>
  )
}

function IdentitySection({ settings }: { settings: CompanySettings | null }) {
  const upsert = useUpsertSettings()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CompanyIdentityValues, undefined, CompanyIdentityOutput>({
    resolver: zodResolver(companyIdentitySchema),
    defaultValues: settingsToIdentity(settings),
    mode: 'onBlur',
  })

  useEffect(() => {
    form.reset(settingsToIdentity(settings))
  }, [settings, form])

  async function onSubmit(values: CompanyIdentityOutput) {
    setError(null)
    try {
      await upsert.mutateAsync(values)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <Card>
      <h2 className="text-base font-semibold text-text mb-1">Identité</h2>
      <p className="text-sm text-muted mb-4">Informations légales et de contact.</p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <div>
          <Label className="mb-1.5 block">Nom complet (légal)</Label>
          <Input {...form.register('legal_name')} />
        </div>
        <div>
          <Label className="mb-1.5 block">Nom commercial</Label>
          <Input {...form.register('commercial_name')} placeholder="Ex: ASCENDY" />
        </div>
        <div>
          <Label className="mb-1.5 block">Adresse complète</Label>
          <textarea
            {...form.register('address')}
            aria-label="Adresse"
            rows={2}
            className={cn(
              'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted',
              'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5 block">SIRET</Label>
            <Input {...form.register('siret')} inputMode="numeric" placeholder="14 chiffres" />
            {form.formState.errors.siret && (
              <div className="text-xs text-danger mt-1">{form.formState.errors.siret.message}</div>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block">Téléphone</Label>
            <Input {...form.register('phone')} />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block">Email</Label>
          <Input type="email" {...form.register('email')} />
          {form.formState.errors.email && (
            <div className="text-xs text-danger mt-1">{form.formState.errors.email.message}</div>
          )}
        </div>
        {error && (
          <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && <span className="text-xs text-success">Enregistré</span>}
          <Button type="submit" disabled={upsert.isPending || !form.formState.isDirty}>
            {upsert.isPending ? <Spinner size="sm" /> : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function BankingSection({ settings }: { settings: CompanySettings | null }) {
  const upsert = useUpsertSettings()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CompanyBankingValues, undefined, CompanyBankingOutput>({
    resolver: zodResolver(companyBankingSchema),
    defaultValues: settingsToBanking(settings),
    mode: 'onBlur',
  })

  useEffect(() => {
    form.reset(settingsToBanking(settings))
  }, [settings, form])

  async function onSubmit(values: CompanyBankingOutput) {
    setError(null)
    try {
      await upsert.mutateAsync(values)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <Card>
      <h2 className="text-base font-semibold text-text mb-1">Coordonnées bancaires</h2>
      <p className="text-sm text-muted mb-4">RIB et mention TVA pour le pied de facture.</p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <div>
          <Label className="mb-1.5 block">IBAN</Label>
          <Input {...form.register('iban')} placeholder="FR76 ..." />
          {form.formState.errors.iban && (
            <div className="text-xs text-danger mt-1">{form.formState.errors.iban.message}</div>
          )}
        </div>
        <div>
          <Label className="mb-1.5 block">BIC</Label>
          <Input {...form.register('bic')} placeholder="CMCIFRPP" />
          {form.formState.errors.bic && (
            <div className="text-xs text-danger mt-1">{form.formState.errors.bic.message}</div>
          )}
        </div>
        <div>
          <Label className="mb-1.5 block">Mention TVA</Label>
          <textarea
            {...form.register('vat_mention')}
            aria-label="Mention TVA"
            rows={2}
            placeholder="Exonéré de TVA, article 293-B du CGI"
            className={cn(
              'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted',
              'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'
            )}
          />
        </div>
        {error && (
          <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && <span className="text-xs text-success">Enregistré</span>}
          <Button type="submit" disabled={upsert.isPending || !form.formState.isDirty}>
            {upsert.isPending ? <Spinner size="sm" /> : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function settingsToTax(s: CompanySettings | null | undefined): TaxSettingsValues {
  if (!s) return emptyTaxSettingsForm
  return {
    tax_rate: s.tax_rate == null ? '' : String(s.tax_rate).replace('.', ','),
    tax_acre: s.tax_acre,
    tax_frequency: s.tax_frequency,
  }
}

function TaxSettingsSection({ settings }: { settings: CompanySettings | null }) {
  const upsert = useUpsertSettings()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<TaxSettingsValues, undefined, TaxSettingsOutput>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: settingsToTax(settings),
    mode: 'onBlur',
  })

  useEffect(() => {
    form.reset(settingsToTax(settings))
  }, [settings, form])

  async function onSubmit(values: TaxSettingsOutput) {
    setError(null)
    try {
      await upsert.mutateAsync(values)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <Card>
      <h2 className="text-base font-semibold text-text mb-1">Cotisations</h2>
      <p className="text-sm text-muted mb-4">
        Paramètres URSSAF utilisés pour le calcul des déclarations.
      </p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <div>
          <Label className="mb-1.5 block">Taux de cotisations (%)</Label>
          <Input
            {...form.register('tax_rate')}
            inputMode="decimal"
            placeholder="Ex: 13,0"
          />
          <p className="text-xs text-muted mt-1">
            Ex: 26,1 (sans ACRE) ou 13,0 (avec ACRE)
          </p>
          {form.formState.errors.tax_rate && (
            <div className="text-xs text-danger mt-1">{form.formState.errors.tax_rate.message}</div>
          )}
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...form.register('tax_acre')}
            className="h-4 w-4 accent-accent"
          />
          <span className="text-sm text-text">Bénéficie de l'ACRE</span>
        </label>
        <div>
          <Label className="mb-1.5 block">Fréquence de déclaration</Label>
          <div className="flex gap-4 mt-1">
            {(['monthly', 'quarterly'] as TaxPeriodType[]).map((f) => (
              <label key={f} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={f}
                  {...form.register('tax_frequency')}
                  className="h-4 w-4 accent-accent"
                />
                <span className="text-sm text-text">
                  {f === 'monthly' ? 'Mensuelle' : 'Trimestrielle'}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-accent/10 px-3 py-2 text-xs text-text">
          Changer la fréquence ne supprime pas les déclarations existantes.
          Veille à ne pas déclarer deux fois la même période.
        </div>
        {error && (
          <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && <span className="text-xs text-success">Enregistré</span>}
          <Button type="submit" disabled={upsert.isPending || !form.formState.isDirty}>
            {upsert.isPending ? <Spinner size="sm" /> : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function LogoSection({ settings }: { settings: CompanySettings | null }) {
  const upload = useUploadLogo()
  const deleteLogo = useDeleteLogo()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleFile(file: File) {
    setError(null)
    if (file.size > MAX_LOGO_SIZE) {
      setError('Le fichier dépasse 2 MB.')
      return
    }
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError('Format non supporté (PNG, JPEG, SVG uniquement).')
      return
    }
    try {
      await upload.mutateAsync(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    }
  }

  async function doDelete() {
    setError(null)
    try {
      await deleteLogo.mutateAsync()
      setConfirmDelete(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  return (
    <>
      <Card>
        <h2 className="text-base font-semibold text-text mb-1">Logo</h2>
        <p className="text-sm text-muted mb-4">
          Apparaît dans la sidebar de l'app et en haut de chaque facture PDF.
        </p>

        <div className="flex items-center gap-6">
          <Logo size={96} className="border border-border" />
          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_LOGO_TYPES.join(',')}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
                e.target.value = ''
              }}
            />
            <Button
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? <Spinner size="sm" /> : <Upload className="h-4 w-4" />}
              Téléverser un logo
            </Button>
            {settings?.logo_path && (
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteLogo.isPending}
                className="text-danger hover:bg-danger/10"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            )}
            <p className="text-xs text-muted mt-1">PNG, JPEG ou SVG. Max 2 MB.</p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2 mt-4">{error}</div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        title="Supprimer le logo ?"
        description="Tu pourras en téléverser un nouveau à tout moment."
        confirmLabel="Supprimer"
        confirmVariant="danger"
        loading={deleteLogo.isPending}
      />
    </>
  )
}
