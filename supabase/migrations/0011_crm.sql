-- =====================================================================
-- 0011_crm.sql
-- CRM Prospection module — Phase 1 web-only.
-- Tables: contacts (prospects), followups (relances), interactions
-- (timeline append-only), prospection_settings (1 row per user).
-- RPC: change_contact_stage, complete_followup — atomic plpgsql
-- functions that orchestrate stage transitions and followup completion.
-- =====================================================================

-- ============= Enums =============
create type contact_stage as enum (
  'to_contact', 'message_sent', 'replied',
  'booking_link_sent', 'call_booked',
  'closed_won', 'closed_lost'
);

create type contact_source as enum (
  'linkedin', 'instagram', 'twitter', 'tiktok', 'email', 'other'
);

create type followup_type as enum ('prospect_followup', 'conversation_followup');
create type followup_status as enum ('pending', 'done', 'cancelled');

create type interaction_type as enum (
  'stage_change',
  'note',
  'followup_created',
  'followup_done',
  'followup_cancelled',
  'auto_closed_lost'
);

-- ============= Tables =============
create table contacts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  first_name    text not null,
  last_name     text not null,
  company       text,
  job_title     text,
  email         text,
  phone         text,
  source        contact_source,
  source_url    text,
  niche         text,
  stage         contact_stage not null default 'to_contact',
  loom_url      text,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index contacts_user_active_idx
  on contacts (user_id, stage)
  where archived_at is null;

create index contacts_user_created_idx
  on contacts (user_id, created_at desc)
  where archived_at is null;

-- Reuse the set_updated_at() function defined in 0001_clients.sql
create trigger trg_contacts_updated_at
  before update on contacts
  for each row execute function set_updated_at();


create table followups (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid not null references contacts(id) on delete cascade,
  type            followup_type not null,
  followup_index  smallint,
  scheduled_at    timestamptz not null,
  status          followup_status not null default 'pending',
  done_at         timestamptz,
  cancelled_at    timestamptz,
  note            text,
  created_at      timestamptz not null default now()
);

create index followups_contact_idx on followups (contact_id);
create index followups_pending_idx
  on followups (scheduled_at)
  where status = 'pending';


create table interactions (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references contacts(id) on delete cascade,
  type        interaction_type not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index interactions_contact_idx
  on interactions (contact_id, created_at desc);


create table prospection_settings (
  user_id                      uuid primary key references auth.users(id) on delete cascade,
  weekly_message_goal          int,
  weekly_call_goal             int,
  followup_1_days              int  not null default 3,
  followup_2_days              int  not null default 7,
  conversation_followup_days   int  not null default 2,
  max_followups                int  not null default 3,
  updated_at                   timestamptz not null default now(),

  constraint prospection_settings_positive_delays
    check (followup_1_days > 0 and followup_2_days > 0
           and conversation_followup_days > 0 and max_followups > 0)
);

create trigger trg_prospection_settings_updated_at
  before update on prospection_settings
  for each row execute function set_updated_at();

-- ============= RLS =============
alter table contacts enable row level security;
alter table followups enable row level security;
alter table interactions enable row level security;
alter table prospection_settings enable row level security;

create policy "contacts_select_own" on contacts for select
  using (auth.uid() = user_id);
create policy "contacts_insert_own" on contacts for insert
  with check (auth.uid() = user_id);
create policy "contacts_update_own" on contacts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "contacts_delete_own" on contacts for delete
  using (auth.uid() = user_id);

create policy "followups_select_own" on followups for select
  using (exists (select 1 from contacts c
                 where c.id = followups.contact_id and c.user_id = auth.uid()));
create policy "followups_insert_own" on followups for insert
  with check (exists (select 1 from contacts c
                      where c.id = followups.contact_id and c.user_id = auth.uid()));
create policy "followups_update_own" on followups for update
  using (exists (select 1 from contacts c
                 where c.id = followups.contact_id and c.user_id = auth.uid()))
  with check (exists (select 1 from contacts c
                      where c.id = followups.contact_id and c.user_id = auth.uid()));
create policy "followups_delete_own" on followups for delete
  using (exists (select 1 from contacts c
                 where c.id = followups.contact_id and c.user_id = auth.uid()));

create policy "interactions_select_own" on interactions for select
  using (exists (select 1 from contacts c
                 where c.id = interactions.contact_id and c.user_id = auth.uid()));
create policy "interactions_insert_own" on interactions for insert
  with check (exists (select 1 from contacts c
                      where c.id = interactions.contact_id and c.user_id = auth.uid()));
create policy "interactions_update_note_own" on interactions for update
  using (type = 'note'
         and exists (select 1 from contacts c
                     where c.id = interactions.contact_id and c.user_id = auth.uid()))
  with check (type = 'note'
              and exists (select 1 from contacts c
                          where c.id = interactions.contact_id and c.user_id = auth.uid()));
create policy "interactions_delete_note_own" on interactions for delete
  using (type = 'note'
         and exists (select 1 from contacts c
                     where c.id = interactions.contact_id and c.user_id = auth.uid()));

create policy "prospection_settings_select_own" on prospection_settings for select
  using (auth.uid() = user_id);
create policy "prospection_settings_insert_own" on prospection_settings for insert
  with check (auth.uid() = user_id);
create policy "prospection_settings_update_own" on prospection_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============= RPC: change_contact_stage =============
create or replace function change_contact_stage(
  p_contact_id uuid,
  p_new_stage  contact_stage
) returns contact_stage
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id         uuid;
  v_old_stage       contact_stage;
  v_settings        prospection_settings;
  v_followup_at     timestamptz;
  v_new_followup_id uuid;
  v_cancelled_id    uuid;
begin
  select user_id, stage into v_user_id, v_old_stage
    from contacts where id = p_contact_id;
  if v_user_id is null then
    raise exception 'contact_not_found' using errcode = 'P0002';
  end if;
  if v_user_id <> auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_old_stage = p_new_stage then
    return v_old_stage;
  end if;

  select * into v_settings from prospection_settings where user_id = v_user_id;
  if not found then
    v_settings.followup_1_days := 3;
    v_settings.followup_2_days := 7;
    v_settings.conversation_followup_days := 2;
    v_settings.max_followups := 3;
  end if;

  update contacts
    set stage = p_new_stage, updated_at = now()
    where id = p_contact_id;

  insert into interactions (contact_id, type, payload)
    values (p_contact_id, 'stage_change',
            jsonb_build_object('old_stage', v_old_stage, 'new_stage', p_new_stage));

  for v_cancelled_id in
    update followups
       set status = 'cancelled', cancelled_at = now()
     where contact_id = p_contact_id and status = 'pending'
    returning id
  loop
    insert into interactions (contact_id, type, payload)
      values (p_contact_id, 'followup_cancelled',
              jsonb_build_object('followup_id', v_cancelled_id));
  end loop;

  if p_new_stage = 'message_sent' then
    v_followup_at :=
      ((now() at time zone 'Europe/Paris')::date
       + v_settings.followup_1_days * interval '1 day'
       + interval '9 hours') at time zone 'Europe/Paris';
    insert into followups (contact_id, type, followup_index, scheduled_at)
      values (p_contact_id, 'prospect_followup', 1, v_followup_at)
      returning id into v_new_followup_id;
    insert into interactions (contact_id, type, payload)
      values (p_contact_id, 'followup_created',
              jsonb_build_object('followup_id', v_new_followup_id,
                                 'followup_type', 'prospect_followup',
                                 'followup_index', 1,
                                 'scheduled_at', v_followup_at));

  elsif p_new_stage = 'replied' then
    v_followup_at :=
      ((now() at time zone 'Europe/Paris')::date
       + v_settings.conversation_followup_days * interval '1 day'
       + interval '9 hours') at time zone 'Europe/Paris';
    insert into followups (contact_id, type, scheduled_at)
      values (p_contact_id, 'conversation_followup', v_followup_at)
      returning id into v_new_followup_id;
    insert into interactions (contact_id, type, payload)
      values (p_contact_id, 'followup_created',
              jsonb_build_object('followup_id', v_new_followup_id,
                                 'followup_type', 'conversation_followup',
                                 'scheduled_at', v_followup_at));
  end if;

  return p_new_stage;
end;
$$;

revoke all on function change_contact_stage(uuid, contact_stage) from public;
grant execute on function change_contact_stage(uuid, contact_stage) to authenticated;

-- ============= RPC: complete_followup =============
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

    if v_index >= v_settings.max_followups then
      update contacts set stage = 'closed_lost', updated_at = now() where id = v_contact_id;
      insert into interactions (contact_id, type, payload)
        values (v_contact_id, 'stage_change',
                jsonb_build_object('old_stage', 'message_sent',
                                   'new_stage', 'closed_lost',
                                   'reason', 'auto_closed_lost'));
      insert into interactions (contact_id, type, payload)
        values (v_contact_id, 'auto_closed_lost',
                jsonb_build_object('after_followup_index', v_index));
    else
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
