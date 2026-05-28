// api/telegram-webhook.ts
// POST endpoint that receives Telegram bot updates.
// Auth: X-Telegram-Bot-Api-Secret-Token header must match TELEGRAM_WEBHOOK_SECRET.
// Routing: /start (anywhere), then chat-allowlist via prospection_settings.telegram_chat_id,
// then /help, reply-to-bot (niche-then-create), URL (intake question).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { env } from './_lib/env.js'
import { supabaseAdmin } from './_lib/supabase-admin.js'
import { sendMessage, escapeHtml } from './_lib/telegram.js'
import { parseProspectUrl } from './_lib/url-parser.js'
import { STAGE_LABELS } from './_lib/stage-labels.js'
import type { TelegramUpdate, TelegramMessage, ContactStage } from './_lib/types.js'

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

  // 2. Parse update (Vercel auto-parses JSON body when Content-Type matches)
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

  // 5. Commands & reply-aware routing
  if (text === '/help') return handleHelp(chatId, res)
  if (message.reply_to_message) return handleNicheReply(chatId, message, user, res)

  // 6. Default: treat as URL intake (ask niche, create on reply)
  return handleIntake(chatId, text, user, res)
}

// ---------- handlers ----------

async function handleStart(chatId: string, res: VercelResponse): Promise<void> {
  await sendMessage(chatId,
    `👋 <b>Salut !</b>\n\n` +
    `Ton <code>chat_id</code> : <code>${chatId}</code>\n\n` +
    `Colle-le dans <b>Paramètres → Prospection → Telegram</b> pour activer l'intake et le récap quotidien.\n\n` +
    `<i>Une fois configuré, envoie-moi une URL LinkedIn, Instagram, TikTok ou X pour ajouter un prospect.</i>`,
  )
  res.status(200).send('ok')
}

async function handleHelp(chatId: string, res: VercelResponse): Promise<void> {
  await sendMessage(chatId,
    `<b>📘 Aide Business OS</b>\n\n` +
    `<b>Commandes</b>\n` +
    `• <code>/start</code> — récupérer ton chat_id\n` +
    `• <code>/help</code> — afficher cette aide\n\n` +
    `<b>Ajouter un prospect</b>\n` +
    `Envoie l'URL d'un profil :\n` +
    `• LinkedIn — <code>linkedin.com/in/…</code>\n` +
    `• Instagram — <code>instagram.com/…</code>\n` +
    `• TikTok — <code>tiktok.com/@…</code>\n` +
    `• X / Twitter — <code>x.com/…</code>\n\n` +
    `<i>Le bot te demandera la niche, et créera le contact une fois ta réponse reçue.</i>`,
  )
  res.status(200).send('ok')
}

// ---------- intake: ask niche only, do NOT create contact yet ----------

async function handleIntake(chatId: string, url: string, user: UserRow, res: VercelResponse): Promise<void> {
  // 1. Parse URL
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

  // 2. Check duplicate (active uniquement, archivés ignorés volontairement)
  const dup = await findActiveDuplicate(user.user_id, url)
  if (dup) {
    await replyDuplicate(chatId, dup)
    res.status(200).send('ok')
    return
  }

  // 3. Ask niche via force_reply. The profile URL is embedded as a text_link
  // — we extract it back on reply to re-parse and create the contact with the
  // niche already set. No DB write yet.
  const name = `${parsed.firstName} ${parsed.lastName}`.trim()
  const platformLabel = PLATFORM_LABELS[parsed.source] ?? parsed.source
  await sendMessage(chatId,
    `✨ <b>${escapeHtml(name)}</b>\n` +
    `<i>${platformLabel}</i>  ·  🔗 <a href="${url}">Voir le profil</a>\n\n` +
    `✍️ <b>Quelle niche ?</b>\n` +
    `<i>Réponds à ce message avec la niche pour créer le contact.</i>`,
    { reply_markup: { force_reply: true, selective: true } },
  )

  res.status(200).send('ok')
}

// ---------- niche reply: now create the contact with niche set ----------

async function handleNicheReply(chatId: string, msg: TelegramMessage, user: UserRow, res: VercelResponse): Promise<void> {
  const replyTo = msg.reply_to_message
  if (!replyTo) {
    res.status(200).send('ok')
    return
  }

  // Recover the original profile URL from the bot's previous message.
  const profileUrl = extractProfileUrlFromEntities(replyTo)
  if (!profileUrl) {
    await sendMessage(chatId, `❌ <i>Impossible de retrouver le profil. Renvoie l'URL pour recommencer.</i>`)
    res.status(200).send('ok')
    return
  }

  // Reject empty or /skip — niche is mandatory in this workflow.
  const rawNiche = (msg.text ?? '').trim()
  if (!rawNiche || rawNiche.toLowerCase() === '/skip') {
    await sendMessage(chatId,
      `✋ <b>Niche obligatoire</b>\n` +
      `<i>Réponds à ma question précédente avec la niche du prospect (ex. « Coachs sportifs »).</i>`,
    )
    res.status(200).send('ok')
    return
  }
  const niche = rawNiche.slice(0, 120)

  // Re-parse the URL — we trust the URL pulled from our own previous message,
  // but a fresh parse keeps the logic centralized.
  const parsed = parseProspectUrl(profileUrl)
  if (!parsed) {
    await sendMessage(chatId, `❌ <i>L'URL du profil n'est plus reconnaissable. Renvoie-la pour recommencer.</i>`)
    res.status(200).send('ok')
    return
  }

  // Re-check duplicate (in case it was created via the app between the question and the reply).
  const dup = await findActiveDuplicate(user.user_id, profileUrl)
  if (dup) {
    await replyDuplicate(chatId, dup)
    res.status(200).send('ok')
    return
  }

  // Create the contact with the niche already set.
  const { data: created, error } = await supabaseAdmin()
    .from('contacts')
    .insert({
      user_id: user.user_id,
      first_name: parsed.firstName,
      last_name:  parsed.lastName,
      source:     parsed.source,
      source_url: profileUrl,
      niche,
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
    `<i>${platformLabel} · niche : ${escapeHtml(niche)}</i>\n\n` +
    `🔗 <a href="${fiche}">Voir la fiche</a>`,
  )
  res.status(200).send('ok')
}

// ---------- helpers ----------

/**
 * Find an existing active contact for this user with the same source_url.
 * Returns null if none found, or the existing row if a duplicate exists.
 */
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

/**
 * Pull the first profile URL we recognise out of the previous bot message's
 * entities. We embed the profile URL via a `<a>` tag in the question message
 * (becomes a `text_link` entity in Telegram's wire format), so we can recover
 * it on reply without storing pending state in the DB.
 */
function extractProfileUrlFromEntities(msg: TelegramMessage): string | null {
  if (!msg.entities) return null
  for (const e of msg.entities) {
    if (e.type !== 'text_link' || !e.url) continue
    if (parseProspectUrl(e.url)) return e.url
  }
  return null
}

async function findUserByTelegramChatId(chatId: string): Promise<UserRow | null> {
  const { data } = await supabaseAdmin()
    .from('prospection_settings')
    .select('user_id')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()
  return data as UserRow | null
}
