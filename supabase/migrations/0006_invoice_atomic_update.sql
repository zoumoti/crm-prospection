-- =====================================================================
-- 0006_invoice_atomic_update.sql
-- Make invoice update atomic (single transaction) via an RPC.
-- Also: dedup any existing invoice_lines that got duplicated by the
-- previous non-atomic update path, and reconcile invoices.total_ht.
--
-- Background: the JS-side updateInvoice used to do three round-trips
-- (UPDATE invoice, DELETE lines, INSERT lines). A fast double-click could
-- interleave them as DELETE→DELETE→INSERT→INSERT and leave duplicate lines.
-- =====================================================================

-- ============= Atomic RPC: update invoice + replace lines =============
create or replace function update_invoice_with_lines(
  p_invoice_id    uuid,
  p_client_id     uuid,
  p_invoice_date  date,
  p_due_date      date,
  p_payment_method text,
  p_total_ht      numeric,
  p_vat_mention   text,
  p_lines         jsonb
)
returns invoices
language plpgsql
security invoker
as $$
declare
  result invoices;
begin
  update invoices
  set client_id       = p_client_id,
      invoice_date    = p_invoice_date,
      due_date        = p_due_date,
      payment_method  = p_payment_method,
      total_ht        = p_total_ht,
      vat_mention     = p_vat_mention
  where id = p_invoice_id
  returning * into result;

  if not found then
    raise exception 'Invoice not found or access denied' using errcode = 'P0002';
  end if;

  delete from invoice_lines where invoice_id = p_invoice_id;

  insert into invoice_lines (invoice_id, position, reference, description, unit_price_ht, quantity, total_ht)
  select p_invoice_id,
         (line->>'position')::int,
         nullif(line->>'reference', ''),
         line->>'description',
         (line->>'unit_price_ht')::numeric,
         (line->>'quantity')::numeric,
         (line->>'total_ht')::numeric
  from jsonb_array_elements(p_lines) as line;

  return result;
end;
$$;

-- ============= One-shot data cleanup =============
-- For each (invoice_id, position) pair, keep only the most recently created
-- line. This removes duplicates left over from the pre-RPC era.
delete from invoice_lines il
using invoice_lines il2
where il.invoice_id = il2.invoice_id
  and il.position = il2.position
  and il.created_at < il2.created_at;

-- ============= Reconcile invoices.total_ht =============
-- After dedup, the stored total_ht may no longer match sum(lines). Recompute
-- it so the detail page, the list, and the form all agree.
update invoices i
set total_ht = sub.total
from (
  select invoice_id, coalesce(sum(total_ht), 0) as total
  from invoice_lines
  group by invoice_id
) sub
where i.id = sub.invoice_id
  and i.total_ht <> sub.total;
