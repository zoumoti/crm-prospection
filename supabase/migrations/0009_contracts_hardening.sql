-- =====================================================================
-- 0009_contracts_hardening.sql
-- Defense-in-depth follow-up to 0007_contracts.sql.
-- Both items are theoretical hardening — the app works correctly without
-- them. Applying them now while the table is small keeps the migration
-- cheap, and the same Storage pattern will be reused for the Finance
-- module's expense receipts.
-- =====================================================================

-- ============= 1) unique constraint on contracts.storage_path =============
-- Why: storage_path is the canonical pointer from the DB row to the file
-- in Storage. If two rows ever share the same path, one of them is
-- effectively orphaned (or pointing at the wrong file). The application
-- generates paths from a fresh UUID, so a collision is practically
-- impossible — but the DB constraint turns "practically impossible" into
-- "actually impossible at the storage layer". Costs nothing.
alter table contracts
  add constraint contracts_storage_path_unique unique (storage_path);

-- ============= 2) with check on the storage UPDATE policy =============
-- Why: the original policy in 0007 only filtered which rows can be
-- UPDATE'd ("you can only touch your own files"). It did not constrain
-- the new values written. Supabase Storage's current API doesn't expose
-- rename, so this is theoretical — but if it ever does, a user could
-- rewrite "name" (the storage path) to land an object inside another
-- user's folder. The fix mirrors the dual using/with check form already
-- used on the table's "contracts_update_own" policy and on the storage
-- INSERT policy.
drop policy if exists "contracts_storage_update_own" on storage.objects;

create policy "contracts_storage_update_own"
  on storage.objects for update
  using (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
