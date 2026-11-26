-- One owner account can run several bakeries. Each bakery is its own application
-- (own permit, licence and approval) and becomes its own shop when approved.
alter table public.bakery_applications drop constraint if exists bakery_applications_user_id_key;
alter table public.bakeries drop constraint if exists bakeries_owner_id_key;
create index if not exists bakery_applications_user_idx on public.bakery_applications (user_id);
create index if not exists bakeries_owner_idx on public.bakeries (owner_id);
create unique index if not exists bakeries_application_uidx on public.bakeries (application_id) where application_id is not null;

-- Older shops created before this change: link them to their application.
update public.bakeries b set application_id = a.id
  from public.bakery_applications a
 where b.application_id is null and a.user_id = b.owner_id;

-- An owner can edit a shop only while that shop's own application is approved.
drop policy if exists bakeries_update on public.bakeries;
create policy bakeries_update on public.bakeries for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (owner_id = auth.uid() and exists (select 1 from public.bakery_applications a where a.id = bakeries.application_id and a.user_id = auth.uid() and a.status = 'approved'))
  );

create or replace function public.admin_review_bakery(p_id uuid, p_decision text, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare app public.bakery_applications; v_id text;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_decision not in ('approved', 'rejected', 'suspended', 'pending') then raise exception 'Bad decision'; end if;
  update public.bakery_applications set status = p_decision, review_note = p_note, reviewed_at = now()
    where id = p_id returning * into app;
  if app.id is null then raise exception 'Application not found'; end if;
  if p_decision = 'approved' then
    select id into v_id from public.bakeries where application_id = app.id;
    if v_id is null then
      v_id := 'bk-' || substr(replace(app.id::text, '-', ''), 1, 10);
      insert into public.bakeries (id, owner_id, application_id, name, area, address, phone, category, tagline, active, locations)
      values (v_id, app.user_id, app.id, app.business_name, app.city, app.address, app.phone, app.category, coalesce(app.description, ''), false, coalesce(app.locations, '[]'::jsonb));
    end if;
    return v_id;
  elsif p_decision in ('rejected', 'suspended') then
    update public.bakeries set active = false where application_id = app.id;
  end if;
  return null;
end; $$;
