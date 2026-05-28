-- =====================================================================
-- 0015_client_code_fill_gaps.sql
-- Replaces the auto-fill trigger for clients.code_client so it picks
-- the LOWEST unused number (C00001 → C00002 → C00003 ...) instead of
-- advancing a monotonic sequence. This way, deleting C00002 and creating
-- a new client gives C00002 back, not C00004.
--
-- Concurrency note: two simultaneous inserts could compute the same
-- "lowest free" code; the existing UNIQUE constraint on code_client
-- will reject the duplicate, the second caller can retry. Single-operator
-- MVP — no advisory lock needed.
--
-- The old client_code_seq sequence is no longer used. Dropped at the end.
-- =====================================================================

create or replace function set_client_code()
returns trigger
language plpgsql
as $$
declare
  v_next_n int;
  v_max_n  int;
begin
  if new.code_client is not null and new.code_client <> '' then
    return new;  -- caller provided a code, respect it
  end if;

  -- Highest existing numeric suffix across ALL clients (the unique constraint
  -- is global, not per-user, so we scan all rows). Numeric parse defaults to 0
  -- when no rows exist.
  select coalesce(max(substring(code_client from 2)::int), 0)
    into v_max_n
    from clients
   where code_client ~ '^C[0-9]+$';

  -- Lowest unused integer in [1 .. v_max_n + 1]. If clients is empty,
  -- v_max_n = 0 so generate_series gives {1} — we pick 1.
  select min(n) into v_next_n
    from generate_series(1, v_max_n + 1) as n
   where not exists (
     select 1 from clients
      where code_client = 'C' || lpad(n::text, 5, '0')
   );

  new.code_client := 'C' || lpad(v_next_n::text, 5, '0');
  return new;
end;
$$;

-- The trigger itself is unchanged (still before-insert on clients), just
-- the underlying function got swapped via create or replace.

-- Drop the now-unused sequence (defensive: only if it exists)
drop sequence if exists client_code_seq;
