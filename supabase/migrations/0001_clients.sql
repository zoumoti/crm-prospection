-- =====================================================================
-- 0001_clients.sql
-- Clients actifs table + RLS + auto-incremented code + soft delete.
-- =====================================================================

-- Sequence for auto-incremented code_client (C00001, C00002, ...)
create sequence if not exists client_code_seq start 1;

-- Main table
create table clients (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  code_client     text unique not null,
  first_name      text not null,
  last_name       text not null,
  company         text,
  siret           text,
  address         text,
  email           text,
  phone           text,
  instagram       text,
  linkedin        text,
  tiktok          text,
  notes           text,
  start_date      date,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Partial index for the common "active clients of this user" query
create index clients_user_active_idx
  on clients (user_id, archived_at)
  where archived_at is null;

create index clients_user_id_idx on clients (user_id);

-- Trigger: auto-fill code_client on insert if not provided
create or replace function set_client_code()
returns trigger
language plpgsql
as $$
begin
  if new.code_client is null or new.code_client = '' then
    new.code_client := 'C' || lpad(nextval('client_code_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger trg_set_client_code
  before insert on clients
  for each row
  execute function set_client_code();

-- Trigger: auto-update updated_at on every update
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_clients_updated_at
  before update on clients
  for each row
  execute function set_updated_at();

-- Row Level Security
alter table clients enable row level security;

create policy "clients_select_own"
  on clients for select
  using (auth.uid() = user_id);

create policy "clients_insert_own"
  on clients for insert
  with check (auth.uid() = user_id);

create policy "clients_update_own"
  on clients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "clients_delete_own"
  on clients for delete
  using (auth.uid() = user_id);
