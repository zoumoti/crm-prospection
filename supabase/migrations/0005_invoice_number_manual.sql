-- =====================================================================
-- 0005_invoice_number_manual.sql
-- Allow manual override of invoice_number. When user provides a number
-- like 'F00018', advance the sequence so subsequent auto-numbers continue
-- from there (F00019, F00020, ...).
-- =====================================================================

create or replace function set_invoice_number()
returns trigger
language plpgsql
as $$
declare
  num int;
begin
  if new.invoice_number is null or new.invoice_number = '' then
    -- No manual number provided: auto-generate from sequence
    new.invoice_number := 'F' || lpad(nextval('invoice_number_seq')::text, 5, '0');
  else
    -- Manual number: parse the digits and advance the sequence if needed
    -- so that the next auto-generated number continues from this point.
    begin
      num := (regexp_replace(new.invoice_number, '[^0-9]', '', 'g'))::int;
      if num > 0 then
        perform setval('invoice_number_seq', greatest(currval('invoice_number_seq'), num));
      end if;
    exception when others then
      -- If parsing fails, leave sequence untouched and accept the manual value as-is.
      null;
    end;
  end if;
  return new;
end;
$$;
