// scripts/setup-telegram.mjs
// Enregistre le webhook Telegram pour que le bot transmette les messages à ton
// app déployée. Lit TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET et PUBLIC_APP_URL
// depuis l'environnement ou depuis un fichier local .env.local / .env.
// Usage (une fois après déploiement) :  npm run setup:telegram

import { readFileSync, existsSync } from 'node:fs'

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const token  = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const appUrl = process.env.PUBLIC_APP_URL

const missing = []
if (!token)  missing.push('TELEGRAM_BOT_TOKEN')
if (!secret) missing.push('TELEGRAM_WEBHOOK_SECRET')
if (!appUrl) missing.push('PUBLIC_APP_URL')
if (missing.length) {
  console.error(`❌ Variables manquantes : ${missing.join(', ')}`)
  console.error(`   Ajoute-les dans .env.local (ou exporte-les) puis relance la commande.`)
  process.exit(1)
}

const webhookUrl = `${appUrl.replace(/\/+$/, '')}/api/telegram-webhook`

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ['message'],
  }),
})
const data = await res.json()

if (data.ok) {
  console.log(`✅ Webhook enregistré : ${webhookUrl}`)
} else {
  console.error('❌ Échec de l\'enregistrement :', data)
  process.exit(1)
}
