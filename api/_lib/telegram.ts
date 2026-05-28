// api/_lib/telegram.ts
// Minimal Telegram Bot API wrapper. Just sendMessage + HTML escape.
// We always use parse_mode='HTML' — easier escaping than MarkdownV2
// (only <, >, & need to be escaped, no .!() chores).

import { env } from './env.js'

type SendOptions = {
  parse_mode?: 'HTML'
  reply_markup?: { force_reply: boolean; selective?: boolean }
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  opts: SendOptions = {},
): Promise<void> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: opts.parse_mode ?? 'HTML',
    disable_web_page_preview: true,
  }
  if (opts.reply_markup) body.reply_markup = opts.reply_markup

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '<no body>')
    console.error('Telegram sendMessage failed', { status: res.status, detail })
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
