-- =====================================================================
-- 0012_complete_followup_no_auto_close.sql
-- Replaces complete_followup() to drop the auto_closed_lost branch.
--
-- Old behavior: when marking the N-th followup as done with N >=
-- max_followups, the contact was auto-flipped to 'closed_lost'.
-- That decision was too eager — replies sometimes arrive late, so the
-- operator wants a manual "A répondu / Abandonné" choice instead.
--
-- New behavior: when N >= max_followups, no new followup is created
-- AND no auto stage change happens. The contact stays in 'message_sent'
-- with no pending followup — the front-end's "Fin de relance" tab
-- surfaces these contacts so the operator can decide manually.
--
-- The 'auto_closed_lost' interaction_type enum value stays in the schema
-- for historical entries (existing pre-migration auto-closed contacts).
-- No new rows of that type will be written.
-- =====================================================================

create or replace function complete_followup(
  p_followup_id uuid,
  p_note        text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id      uuid;
  v_user_id         uuid;
  v_type            followup_type;
  v_index           smallint;
  v_contact_stage   contact_stage;
  v_status          followup_status;
  v_settings        prospection_settings;
  v_next_at         timestamptz;
  v_new_followup_id uuid;
begin
  select f.contact_id, c.user_id, f.type, f.followup_index, c.stage, f.status
    into v_contact_id, v_user_id, v_type, v_index, v_contact_stage, v_status
    from followups f
    join contacts c on c.id = f.contact_id
    where f.id = p_followup_id;

  if v_user_id is null then
    raise exception 'followup_not_found' using errcode = 'P0002';
  end if;
  if v_user_id <> auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_status <> 'pending' then
    raise exception 'followup_already_handled' using errcode = '22000';
  end if;

  update followups
    set status = 'done', done_at = now(),
        note   = coalesce(nullif(p_note, ''), note)
    where id = p_followup_id;

  insert into interactions (contact_id, type, payload)
    values (v_contact_id, 'followup_done',
            jsonb_build_object('followup_id', p_followup_id,
                               'followup_type', v_type,
                               'followup_index', v_index,
                               'note', p_note));

  if v_type = 'prospect_followup' and v_contact_stage = 'message_sent' then
    select * into v_settings from prospection_settings where user_id = v_user_id;
    if not found then
      v_settings.followup_2_days := 7;
      v_settings.max_followups   := 3;
    end if;

    -- Only chain a next followup if we haven't hit max. At max, leave the
    -- contact in message_sent with no pending followup; the operator will
    -- decide manually via the "Fin de relance" UI tab.
    if v_index < v_settings.max_followups then
      v_next_at :=
        ((now() at time zone 'Europe/Paris')::date
         + v_settings.followup_2_days * interval '1 day'
         + interval '9 hours') at time zone 'Europe/Paris';
      insert into followups (contact_id, type, followup_index, scheduled_at)
        values (v_contact_id, 'prospect_followup', v_index + 1, v_next_at)
        returning id into v_new_followup_id;
      insert into interactions (contact_id, type, payload)
        values (v_contact_id, 'followup_created',
                jsonb_build_object('followup_id', v_new_followup_id,
                                   'followup_type', 'prospect_followup',
                                   'followup_index', v_index + 1,
                                   'scheduled_at', v_next_at));
    end if;
  end if;
end;
$$;

revoke all on function complete_followup(uuid, text) from public;
grant execute on function complete_followup(uuid, text) to authenticated;
