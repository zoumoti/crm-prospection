// api/telegram-webhook.ts
// POST endpoint that receives Telegram bot updates.
// Auth: X-Telegram-Bot-Api-Secret-Token header must match TELEGRAM_WEBHOOK_SECRET.
// Routing: /start (anywhere), then chat-allowlist via prospection_settings.telegram_chat_id,
// then /help, then URL intake (creates the contact immediately).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { env } from './_lib/env.js'
import { supabaseAdmin } from './_lib/supabase-admin.js'
import { sendMessage, escapeHtml } from './_lib/telegram.js'
import { parseProspectUrl } from './_lib/url-parser.js'
import { STAGE_LABELS } from './_lib/stage-labels.js'
import type { TelegramUpdate, ContactStage } from './_lib/types.js'

type UserRow = { user_id: string }

const PLATFORM_LABELS: Record<string, string> = {
  linkedin:  'LinkedIn',
  instagram: 'Instagram',
  tiktok:    'TikTok',
  twitter:   'X',
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // 1. Auth
  const secret = req.headers['x-telegram-bot-api-secret-token']
  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).send('Unauthorized')
    return
  }
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed')
    return
  }

  // 2. Parse update
  const update = req.body as TelegramUpdate | undefined
  const message = update?.message
  if (!message?.text) {
    res.status(200).send('ok')  // ignore non-text
    return
  }

  const chatId = String(message.chat.id)
  const text = message.text.trim()

  // 3. /start always allowed — bootstrap
  if (text === '/start') return handleStart(chatId, res)

  // 4. Chat allowlist
  const user = await findUserByTelegramChatId(chatId)
  if (!user) {
    await sendMessage(chatId,
      `🔒 <b>Chat non autorisé</b>\n\n` +
      `Configure ton <code>chat_id</code> dans :\n` +
      `<b>Paramètres → Prospection → Telegram</b>`,
    )
    res.status(200).send('ok')
    return
  }

  // 5. Commands
  if (text === '/help') return handleHelp(chatId, res)

  // 6. Default: treat as URL intake (create immediately)
  return handleIntake(chatId, text, user, res)
}

// ---------- handlers ----------

async function handleStart(chatId: string, res: VercelResponse): Promise<void> {
  await sendMessage(chatId,
    `👋 <b>Salut !</b>\n\n` +
    `Ton <code>chat_id</code> : <code>${chatId}</code>\n\n` +
    `Colle-le dans <b>Paramètres → Prospection → Telegram</b> pour activer l'ajout de prospects.\n\n` +
    `<i>Une fois configuré, envoie-moi une URL LinkedIn, Instagram, TikTok ou X : je l'ajoute direct au CRM.</i>`,
  )
  res.status(200).send('ok')
}

async function handleHelp(chatId: string, res: VercelResponse): Promise<void> {
  await sendMessage(chatId,
    `<b>📘 Aide</b>\n\n` +
    `<b>Commandes</b>\n` +
    `• <code>/start</code> — récupérer ton chat_id\n` +
    `• <code>/help</code> — afficher cette aide\n\n` +
    `<b>Ajouter un prospect</b>\n` +
    `Envoie l'URL d'un profil, je l'ajoute direct au CRM :\n` +
    `• LinkedIn — <code>linkedin.com/in/…</code>\n` +
    `• Instagram — <code>instagram.com/…</code>\n` +
    `• TikTok — <code>tiktok.com/@…</code>\n` +
    `• X / Twitter — <code>x.com/…</code>`,
  )
  res.status(200).send('ok')
}

// ---------- intake: create the contact immediately ----------

async function handleIntake(chatId: string, url: string, user: UserRow, res: VercelResponse): Promise<void> {
  const parsed = parseProspectUrl(url)
  if (!parsed) {
    await sendMessage(chatId,
      `🤷 <b>URL non reconnue</b>\n\n` +
      `Formats supportés :\n` +
      `• LinkedIn — <code>linkedin.com/in/…</code>\n` +
      `• Instagram — <code>instagram.com/…</code>\n` +
      `• TikTok — <code>tiktok.com/@…</code>\n` +
      `• X / Twitter — <code>x.com/…</code>`,
    )
    res.status(200).send('ok')
    return
  }

  const dup = await findActiveDuplicate(user.user_id, url)
  if (dup) {
    await replyDuplicate(chatId, dup)
    res.status(200).send('ok')
    return
  }

  const { data: created, error } = await supabaseAdmin()
    .from('contacts')
    .insert({
      user_id:    user.user_id,
      first_name: parsed.firstName,
      last_name:  parsed.lastName,
      source:     parsed.source,
      source_url: url,
      stage:      'to_contact',
    })
    .select('id, first_name, last_name')
    .single()

  if (error || !created) {
    console.error('intake insert failed', error)
    await sendMessage(chatId, `❌ Erreur lors de la création du contact.`)
    res.status(500).send('insert failed')
    return
  }

  const name = `${created.first_name} ${created.last_name}`.trim()
  const fiche = `${env.PUBLIC_APP_URL}/crm/contacts/${created.id}`
  const platformLabel = PLATFORM_LABELS[parsed.source] ?? parsed.source
  await sendMessage(chatId,
    `✅ <b>${escapeHtml(name)}</b> ajouté\n` +
    `<i>${platformLabel}</i>\n\n` +
    `🔗 <a href="${fiche}">Voir la fiche</a>`,
  )
  res.status(200).send('ok')
}

// ---------- helpers ----------

async function findActiveDuplicate(userId: string, url: string) {
  const { data } = await supabaseAdmin()
    .from('contacts')
    .select('id, stage, created_at')
    .eq('user_id', userId)
    .eq('source_url', url)
    .is('archived_at', null)
    .maybeSingle()
  return data as { id: string; stage: ContactStage; created_at: string } | null
}

async function replyDuplicate(chatId: string, existing: { id: string; stage: ContactStage; created_at: string }): Promise<void> {
  const stageLabel = STAGE_LABELS[existing.stage]
  const daysAgo = Math.floor((Date.now() - new Date(existing.created_at).getTime()) / 86_400_000)
  const ageLabel = daysAgo === 0 ? "aujourd'hui" : daysAgo === 1 ? 'hier' : `il y a ${daysAgo}j`
  const link = `${env.PUBLIC_APP_URL}/crm/contacts/${existing.id}`
  await sendMessage(chatId,
    `⚠️ <b>Déjà dans le CRM</b>\n` +
    `<i>${escapeHtml(stageLabel)} · ${ageLabel}</i>\n\n` +
    `→ <a href="${link}">Voir la fiche</a>`,
  )
}

async function findUserByTelegramChatId(chatId: string): Promise<UserRow | null> {
  const { data } = await supabaseAdmin()
    .from('prospection_settings')
    .select('user_id')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()
  return data as UserRow | null
}
