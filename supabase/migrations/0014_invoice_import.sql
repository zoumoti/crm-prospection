-- =====================================================================
-- 0014_invoice_import.sql
-- Allow importing a pre-existing PDF for backfilled invoices (historique
-- avant Business OS). The structured data (client, number, date, lines)
-- is still required — the PDF is just an attachment that becomes the
-- visible preview and download source on the detail page.
--
-- Edit lock: imported invoices are read-only by convention (enforced
-- client-side in InvoiceEditPage). The DB does not block updates so an
-- admin can still correct typos via SQL if needed.
-- =====================================================================

alter table invoices
  add column imported_pdf_path text;

-- Used to filter "imported" vs "generated" invoices in queries / dashboards
-- without a full table scan if the column grows sparse.
create index invoices_imported_idx
  on invoices (user_id, imported_pdf_path)
  where imported_pdf_path is not null;

-- ============= Storage bucket =============
-- Private, 10 MB max, PDF only (we don't accept Word for invoices —
-- a facture is supposed to be a definitive PDF document).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imported-invoices',
  'imported-invoices',
  false,
  10485760,
  array['application/pdf']
) on conflict (id) do nothing;

-- ============= Storage policies =============
-- Path layout: "{user_id}/{invoice_id}.pdf"
-- foldername(name)[1] extracts the first path segment = user_id.
create policy "imported_invoices_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'imported-invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "imported_invoices_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'imported-invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "imported_invoices_storage_update_own"
  on storage.objects for update
  using (
    bucket_id = 'imported-invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'imported-invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "imported_invoices_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'imported-invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
