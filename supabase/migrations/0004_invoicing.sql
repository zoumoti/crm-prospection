-- =====================================================================
-- 0004_invoicing.sql
-- Company settings + products + invoices + invoice_lines.
-- Plus the 'company-assets' storage bucket for the logo.
-- =====================================================================

-- ============= Company settings (1 row per user) =============
create table company_settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  legal_name       text,
  commercial_name  text,
  address          text,
  siret            text,
  iban             text,
  bic              text,
  phone            text,
  email            text,
  vat_mention      text,
  logo_path        text,
  updated_at       timestamptz not null default now()
);

create trigger trg_company_settings_updated_at
  before update on company_settings
  for each row
  execute function set_updated_at();

-- ============= Sequence for invoice numbers =============
create sequence if not exists invoice_number_seq start 1;

-- ============= Products catalog =============
create table products (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  reference          text not null,
  description        text not null,
  default_price_ht   numeric(12, 2),
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, reference)
);

create index products_user_active_idx
  on products (user_id, archived_at)
  where archived_at is null;

create trigger trg_products_updated_at
  before update on products
  for each row
  execute function set_updated_at();

-- ============= Invoices =============
create table invoices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  client_id         uuid not null references clients(id) on delete restrict,
  invoice_number    text unique not null,
  invoice_date      date not null default current_date,
  due_date          date,
  payment_method    text not null default 'Virement bancaire',
  status            text not null default 'pending' check (status in ('pending', 'paid')),
  total_ht          numeric(12, 2) not null default 0,
  vat_mention       text,
  paid_at           timestamptz,
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index invoices_user_active_idx
  on invoices (user_id, archived_at)
  where archived_at is null;
create index invoices_client_idx on invoices (client_id);
create index invoices_status_due_idx on invoices (status, due_date);

create or replace function set_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'F' || lpad(nextval('invoice_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger trg_set_invoice_number
  before insert on invoices
  for each row
  execute function set_invoice_number();

create trigger trg_invoices_updated_at
  before update on invoices
  for each row
  execute function set_updated_at();

-- ============= Invoice lines =============
create table invoice_lines (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references invoices(id) on delete cascade,
  position        int not null,
  reference       text,
  description     text not null,
  unit_price_ht   numeric(12, 2) not null,
  quantity        numeric(12, 2) not null default 1,
  total_ht        numeric(12, 2) not null,
  created_at      timestamptz not null default now()
);

create index invoice_lines_invoice_idx on invoice_lines (invoice_id, position);

-- ============= RLS =============
alter table company_settings enable row level security;
create policy "company_settings_select_own" on company_settings for select using (auth.uid() = user_id);
create policy "company_settings_insert_own" on company_settings for insert with check (auth.uid() = user_id);
create policy "company_settings_update_own" on company_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "company_settings_delete_own" on company_settings for delete using (auth.uid() = user_id);

alter table products enable row level security;
create policy "products_select_own" on products for select using (auth.uid() = user_id);
create policy "products_insert_own" on products for insert with check (auth.uid() = user_id);
create policy "products_update_own" on products for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "products_delete_own" on products for delete using (auth.uid() = user_id);

alter table invoices enable row level security;
create policy "invoices_select_own" on invoices for select using (auth.uid() = user_id);
create policy "invoices_insert_own" on invoices for insert with check (auth.uid() = user_id);
create policy "invoices_update_own" on invoices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invoices_delete_own" on invoices for delete using (auth.uid() = user_id);

alter table invoice_lines enable row level security;
create policy "invoice_lines_select_via_invoice" on invoice_lines for select
  using (exists (select 1 from invoices i where i.id = invoice_lines.invoice_id and i.user_id = auth.uid()));
create policy "invoice_lines_insert_via_invoice" on invoice_lines for insert
  with check (exists (select 1 from invoices i where i.id = invoice_lines.invoice_id and i.user_id = auth.uid()));
create policy "invoice_lines_update_via_invoice" on invoice_lines for update
  using (exists (select 1 from invoices i where i.id = invoice_lines.invoice_id and i.user_id = auth.uid()))
  with check (exists (select 1 from invoices i where i.id = invoice_lines.invoice_id and i.user_id = auth.uid()));
create policy "invoice_lines_delete_via_invoice" on invoice_lines for delete
  using (exists (select 1 from invoices i where i.id = invoice_lines.invoice_id and i.user_id = auth.uid()));

-- ============= Storage bucket 'company-assets' =============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-assets',
  'company-assets',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "company_assets_select_own"
  on storage.objects for select
  using (bucket_id = 'company-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "company_assets_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'company-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "company_assets_update_own"
  on storage.objects for update
  using (bucket_id = 'company-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "company_assets_delete_own"
  on storage.objects for delete
  using (bucket_id = 'company-assets' and (storage.foldername(name))[1] = auth.uid()::text);
