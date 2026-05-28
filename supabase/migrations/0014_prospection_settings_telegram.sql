-- =====================================================================
-- 0014_prospection_settings_telegram.sql
-- Adds Telegram integration columns to prospection_settings:
-- - telegram_chat_id : nullable text, lookup key from the bot's webhook
-- - daily_recap_enabled : on/off toggle (default true)
-- - daily_recap_hour : 0-23, hour in Europe/Paris at which the cron sends
--   the daily recap. The cron runs hourly and filters by current Paris hour.
--
-- A unique index on telegram_chat_id (WHERE not null) prevents two users
-- from accidentally pointing to the same Telegram chat.
-- =====================================================================

alter table prospection_settings
  add column telegram_chat_id     text,
  add column daily_recap_enabled  boolean not null default true,
  add column daily_recap_hour     smallint not null default 7
    check (daily_recap_hour between 0 and 23);

create unique index prospection_settings_telegram_chat_id_uniq
  on prospection_settings (telegram_chat_id)
  where telegram_chat_id is not null;
