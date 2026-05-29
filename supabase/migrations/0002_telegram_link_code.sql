-- =====================================================================
-- 0002_telegram_link_code.sql
-- À exécuter UNIQUEMENT si tu as déjà lancé 0001_init.sql AVANT cette
-- mise à jour. Les nouvelles installations (0001 à jour) n'en ont pas
-- besoin (l'instruction est idempotente, sans danger si relancée).
--
-- Ajoute un code à usage unique servant à relier un compte Telegram
-- depuis l'app (bouton « Connecter Telegram ») sans copier de chat_id.
-- =====================================================================

alter table prospection_settings
  add column if not exists telegram_link_code text;

create unique index if not exists prospection_settings_telegram_link_code_uniq
  on prospection_settings (telegram_link_code)
  where telegram_link_code is not null;
