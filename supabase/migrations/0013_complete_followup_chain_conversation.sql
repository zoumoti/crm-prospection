-- =====================================================================
-- 0013_complete_followup_chain_conversation.sql
-- Replaces complete_followup() to also chain conversation_followups
-- while the contact remains in 'replied' stage.
--
-- Old behavior: marking a conversation_followup as done just logged the
-- followup_done event. The chain stopped after the first check-in.
--
-- New behavior: when v_type = 'conversation_followup' AND the contact
-- is still in 'replied', the function schedules the next check-in at
-- +conversation_followup_days days at 9am Europe/Paris. The chain
-- continues indefinitely as long as the contact stays in 'replied';
-- moving them to any other stage (via change_contact_stage) cancels
-- any pending conversation_followup as usual, stopping the chain.
--
-- Rationale: the operator wants periodic "stay-warm" reminders to
-- nudge replied-but-not-booked prospects. The cadence is the same
-- setting that controlled the first check-in.
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

  -- ===== prospect_followup chain (unchanged from 0012) =====
  if v_type = 'prospect_followup' and v_contact_stage = 'message_sent' then
    select * into v_settings from prospection_settings where user_id = v_user_id;
    if not found then
      v_settings.followup_2_days := 7;
      v_settings.max_followups   := 3;
    end if;

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

  -- ===== conversation_followup chain (NEW) =====
  -- Recurring check-up while the contact stays in 'replied'. No max:
  -- stage change away from 'replied' cancels the pending one and stops
  -- the chain naturally.
  if v_type = 'conversation_followup' and v_contact_stage = 'replied' then
    select * into v_settings from prospection_settings where user_id = v_user_id;
    if not found then
      v_settings.conversation_followup_days := 2;
    end if;

    v_next_at :=
      ((now() at time zone 'Europe/Paris')::date
       + v_settings.conversation_followup_days * interval '1 day'
       + interval '9 hours') at time zone 'Europe/Paris';
    insert into followups (contact_id, type, scheduled_at)
      values (v_contact_id, 'conversation_followup', v_next_at)
      returning id into v_new_followup_id;
    insert into interactions (contact_id, type, payload)
      values (v_contact_id, 'followup_created',
              jsonb_build_object('followup_id', v_new_followup_id,
                                 'followup_type', 'conversation_followup',
                                 'scheduled_at', v_next_at));
  end if;
end;
$$;

revoke all on function complete_followup(uuid, text) from public;
grant execute on function complete_followup(uuid, text) to authenticated;
