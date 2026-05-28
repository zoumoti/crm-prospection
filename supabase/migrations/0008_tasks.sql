-- =====================================================================
-- 0008_tasks.sql
-- Tasks module — owner-scoped tasks with optional client link and
-- assignee tracking. Prepares the future Client Portal Template
-- (separate repo) via the `assignee` column + a SELECT policy that
-- will be added later.
-- =====================================================================

create table tasks (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  client_id           uuid references clients(id) on delete set null,
  assignee            text not null default 'owner'
                        check (assignee in ('owner','client')),
  title               text not null,
  notes               text,
  due_date            date,
  priority            text not null default 'normal'
                        check (priority in ('high','normal','low')),
  completed           boolean not null default false,
  completed_at        timestamptz,
  completed_by        text check (completed_by in ('owner','client')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- A task assigned to a client must have a client_id
  constraint tasks_assignee_requires_client
    check (assignee = 'owner' or client_id is not null)
);

-- Hot index for the main "active tasks of this owner, sorted by due_date"
create index tasks_owner_active_idx
  on tasks (owner_id, completed, due_date)
  where completed = false;

-- For the "tasks of this client" lookup (fiche client + filtre par client)
create index tasks_client_id_idx
  on tasks (client_id)
  where client_id is not null;

-- Reuse the set_updated_at() function defined by 0001_clients.sql
create trigger trg_tasks_updated_at
  before update on tasks
  for each row
  execute function set_updated_at();

-- =====================================================================
-- Row Level Security — owner-scoped only in this iteration.
-- A future migration will add a SELECT policy for the client portal:
--   create policy "tasks_select_client_portal" on tasks for select
--     using (
--       client_id is not null
--       and exists (
--         select 1 from client_portal_users cpu
--         where cpu.user_id = auth.uid() and cpu.client_id = tasks.client_id
--       )
--     );
-- plus a UPDATE policy restricted to `completed` for assignee='client'.
-- Not part of this iteration.
-- =====================================================================

alter table tasks enable row level security;

create policy "tasks_select_own" on tasks for select
  using (auth.uid() = owner_id);

create policy "tasks_insert_own" on tasks for insert
  with check (auth.uid() = owner_id);

create policy "tasks_update_own" on tasks for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "tasks_delete_own" on tasks for delete
  using (auth.uid() = owner_id);
