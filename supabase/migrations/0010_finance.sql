-- =====================================================================
-- 0010_finance.sql
-- Module Finance : table expenses, table tax_declarations,
-- extension company_settings (3 colonnes cotisations),
-- bucket Storage expense-receipts + policies (incluant hardening 0009
-- d'emblée : unique storage_path + with check sur l'UPDATE policy).
-- =====================================================================

-- ============= Table expenses =============
create table expenses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  amount          numeric(12,2) not null check (amount > 0),
  category        text not null check (length(trim(category)) > 0),
  description     text not null check (length(trim(description)) > 0),
  expense_date    date not null,
  storage_path    text,
  file_name       text,
  file_size       integer,
  mime_type       text,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index expenses_storage_path_unique
  on expenses (storage_path) where storage_path is not null;
create index expenses_user_date_idx
  on expenses (user_id, expense_date desc) where archived_at is null;
create index expenses_user_category_idx
  on expenses (user_id, lower(category)) where archived_at is null;

create trigger trg_expenses_updated_at
  before update on expenses
  for each row execute function set_updated_at();

alter table expenses enable row level security;

create policy "expenses_select_own"
  on expenses for select using (auth.uid() = user_id);
create policy "expenses_insert_own"
  on expenses for insert with check (auth.uid() = user_id);
create policy "expenses_update_own"
  on expenses for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_delete_own"
  on expenses for delete using (auth.uid() = user_id);

-- ============= Table tax_declarations =============
create table tax_declarations (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  period_type           text not null check (period_type in ('monthly','quarterly')),
  period_year           int not null,
  period_index          int not null,
  ca_brut_snapshot      numeric(12,2) not null,
  rate_snapshot         numeric(5,2) not null,
  acre_snapshot         boolean not null,
  amount_due_snapshot   numeric(12,2) not null,
  paid_at               timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  unique (user_id, period_type, period_year, period_index),
  constraint tax_declarations_index_range check (
    (period_type = 'monthly'   and period_index between 1 and 12) or
    (period_type = 'quarterly' and period_index between 1 and 4)
  )
);

-- Immutable snapshot table — no updated_at, no UPDATE trigger by design.
-- A declaration represents a payment frozen in time; corrections happen via
-- DELETE + INSERT (the UI exposes "Annuler la déclaration" for this).

create index tax_declarations_user_idx
  on tax_declarations (user_id, period_year desc, period_index desc);

alter table tax_declarations enable row level security;

create policy "tax_declarations_select_own"
  on tax_declarations for select using (auth.uid() = user_id);
create policy "tax_declarations_insert_own"
  on tax_declarations for insert with check (auth.uid() = user_id);
create policy "tax_declarations_update_own"
  on tax_declarations for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tax_declarations_delete_own"
  on tax_declarations for delete using (auth.uid() = user_id);

-- ============= Extension company_settings =============
alter table company_settings
  add column if not exists tax_rate numeric(5,2)
    check (tax_rate is null or (tax_rate >= 0 and tax_rate <= 100)),
  add column if not exists tax_acre boolean not null default false,
  add column if not exists tax_frequency text not null default 'quarterly'
    check (tax_frequency in ('monthly','quarterly'));

-- ============= Storage bucket expense-receipts =============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-receipts',
  'expense-receipts',
  false,
  5242880,
  array['application/pdf','image/jpeg','image/png']
) on conflict (id) do nothing;

-- ============= Storage policies expense-receipts =============
create policy "expenses_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'expense-receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "expenses_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'expense-receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "expenses_storage_update_own"
  on storage.objects for update
  using (
    bucket_id = 'expense-receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'expense-receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "expenses_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'expense-receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
