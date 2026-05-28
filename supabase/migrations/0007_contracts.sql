-- =====================================================================
-- 0007_contracts.sql
-- Contracts table + RLS + Storage bucket + Storage policies.
-- Soft delete via archived_at (fichier conservé dans Storage).
-- Réutilise set_updated_at() défini dans 0001_clients.sql.
-- =====================================================================

-- ============= Table =============
create table contracts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete restrict,
  name            text not null,
  signed_at       date not null,
  storage_path    text not null,
  file_name       text not null,
  file_size       integer not null,
  mime_type       text not null,
  notes           text,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index contracts_user_active_idx
  on contracts (user_id, archived_at) where archived_at is null;
create index contracts_client_active_idx
  on contracts (client_id) where archived_at is null;

create trigger trg_contracts_updated_at
  before update on contracts
  for each row execute function set_updated_at();

-- ============= RLS table =============
alter table contracts enable row level security;

create policy "contracts_select_own"
  on contracts for select using (auth.uid() = user_id);
create policy "contracts_insert_own"
  on contracts for insert with check (auth.uid() = user_id);
create policy "contracts_update_own"
  on contracts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "contracts_delete_own"
  on contracts for delete using (auth.uid() = user_id);

-- ============= Storage bucket =============
-- Privé, 10 MB max, MIME types PDF/DOC/DOCX whitelistés.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts',
  'contracts',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
) on conflict (id) do nothing;

-- ============= Storage policies =============
-- Chemin = "{user_id}/{contract_id}/{filename}".
-- foldername(name)[1] extrait le premier segment du path = user_id.
create policy "contracts_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "contracts_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "contracts_storage_update_own"
  on storage.objects for update
  using (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "contracts_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
