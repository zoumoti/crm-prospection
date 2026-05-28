// api/_lib/stage-labels.ts
// French labels for contact stages. Kept in sync with src/features/crm/stages.ts
// (which is the source of truth for the UI). Server-side duplicate so that
// the Telegram bot can show "Message envoyé" instead of the raw enum.

import type { ContactStage } from './types.js'

export const STAGE_LABELS: Record<ContactStage, string> = {
  to_contact:        'À contacter',
  message_sent:      'Message envoyé',
  replied:           'A répondu',
  booking_link_sent: 'Lien envoyé',
  call_booked:       'Call booké',
  closed_won:        'Gagné',
  closed_lost:       'Perdu',
}
