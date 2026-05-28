-- =====================================================================
-- 0016_client_portal_links.sql
-- Each client can be associated with N app URLs (e.g., "Espace tâches",
-- "Streams", "Billing"). Stored as a jsonb array of {label, url} objects
-- on the `clients` row — no separate table because the list is short
-- (a few entries) and only edited from the client's own profile.
-- =====================================================================

alter table clients
  add column portal_links jsonb not null default '[]'::jsonb;

-- Sanity check: must be a JSON array. Individual {label, url} validation
-- lives in the Zod schema on the front; the DB constraint just guards
-- against accidentally writing an object or a string in this column.
alter table clients
  add constraint clients_portal_links_is_array
  check (jsonb_typeof(portal_links) = 'array');
