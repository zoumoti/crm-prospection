// api/_lib/env.ts
// Typed access to required server-side env vars. Throws if any is missing —
// safer than silent fallbacks (we'd rather fail loud at cold start than
// send broken Telegram messages forever).

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

export const env = {
  get TELEGRAM_BOT_TOKEN()        { return required('TELEGRAM_BOT_TOKEN') },
  get TELEGRAM_WEBHOOK_SECRET()   { return required('TELEGRAM_WEBHOOK_SECRET') },
  get CRON_SECRET()               { return required('CRON_SECRET') },
  get SUPABASE_URL()              { return required('SUPABASE_URL') },
  get SUPABASE_SERVICE_ROLE_KEY() { return required('SUPABASE_SERVICE_ROLE_KEY') },
  get PUBLIC_APP_URL()            { return required('PUBLIC_APP_URL') },
}
