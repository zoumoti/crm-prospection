// api/_lib/types.ts
// Local copies of types we can't import from src/ (Vercel functions
// run in an isolated tsconfig and importing across the boundary
// would pull React/Vite-flavored types).

export type ContactStage =
  | 'to_contact'
  | 'message_sent'
  | 'replied'
  | 'booking_link_sent'
  | 'call_booked'
  | 'closed_won'
  | 'closed_lost'

export type ContactSource = 'linkedin' | 'instagram' | 'twitter' | 'tiktok' | 'email' | 'other'

export type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
}

export type TelegramMessageEntity = {
  type: string  // 'text_link', 'bold', 'italic', 'code', etc.
  offset: number
  length: number
  url?: string  // only present when type === 'text_link'
}

export type TelegramMessage = {
  message_id: number
  chat: { id: number }
  text?: string
  entities?: TelegramMessageEntity[]
  reply_to_message?: TelegramMessage
}
