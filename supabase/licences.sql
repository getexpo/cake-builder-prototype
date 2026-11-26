-- Driver's licence expiry: reminders at 90/30/15/7/3/1 days (texts from the notify function),
-- automatic pause the day after expiry, and self-service renewal that reactivates the driver.

alter table public.driver_applications add column if not exists licence_renewed_at timestamptz;
alter table public.driver_applications add column if not exists licence_suspended boolean not null default false;

-- Never hand a job to a driver whose licence has expired, even before the nightly check runs.
create or replace function public.driver_accept_job(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text; v_expiry date;
begin
  if not public.is_approved_driver() then raise exception 'Only approved drivers can accept jobs'; end if;
  select full_name, licence_expiry into v_name, v_expiry from public.driver_applications where user_id = auth.uid();
  if v_expiry is not null and v_expiry < (now() at time zone 'America/Vancouver')::date then
    raise exception 'Your driver''s licence has expired. Upload your renewed licence in My profile.';
  end if;
  if exists (select 1 from public.orders where driver_id = auth.uid() and status not in ('delivered', 'cancelled')) then
    raise exception 'Finish your current delivery first';
  end if;
  update public.orders set driver_id = auth.uid(), driver_name = v_name, accepted_at = now()
    where id = p_order and driver_id is null and fulfillment = 'delivery' and status in ('confirmed', 'baking', 'ready');
  if not found then raise exception 'This job is no longer available'; end if;
end; $$;

create or replace function public.expire_driver_licences() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.driver_applications
     set status = 'suspended', licence_suspended = true, reviewed_at = now(),
         review_note = 'Your driver''s licence expired on ' || to_char(licence_expiry, 'Mon FMDD, YYYY')
           || '. Upload your renewed licence in the driver app to take jobs again.'
   where status = 'approved' and licence_expiry < (now() at time zone 'America/Vancouver')::date;
  get diagnostics n = row_count;
  return n;
end; $$;
revoke all on function public.expire_driver_licences() from public, anon, authenticated;

-- p_front / p_back: { path, name, size, uploadedAt } from the upload.
create or replace function public.driver_renew_licence(p_number text, p_expiry date, p_front jsonb, p_back jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare app public.driver_applications;
begin
  select * into app from public.driver_applications where user_id = auth.uid();
  if app.id is null then raise exception 'No driver application found.'; end if;
  if app.status not in ('approved', 'suspended') then raise exception 'You can renew your licence once you’re approved.'; end if;
  if regexp_replace(coalesce(p_number, ''), '[\s-]', '', 'g') !~ '^[0-9]{7}$' then raise exception 'BC licence numbers are 7 digits.'; end if;
  if p_expiry is null or p_expiry <= (now() at time zone 'America/Vancouver')::date then raise exception 'Enter the new expiry date. It must be in the future.'; end if;
  if p_front is null or p_back is null or p_front->>'path' is null or p_back->>'path' is null then raise exception 'Upload the front and back of your renewed licence.'; end if;
  if split_part(p_front->>'path', '/', 1) <> auth.uid()::text or split_part(p_back->>'path', '/', 1) <> auth.uid()::text then raise exception 'Upload problem. Please try again.'; end if;
  update public.driver_applications
     set licence_number = regexp_replace(p_number, '[\s-]', '', 'g'),
         licence_expiry = p_expiry,
         documents = coalesce(documents, '{}'::jsonb) || jsonb_build_object('licence_front', p_front, 'licence_back', p_back),
         licence_renewed_at = now(),
         status = case when licence_suspended then 'approved' else status end,
         review_note = case when licence_suspended then null else review_note end,
         reviewed_at = case when licence_suspended then now() else reviewed_at end,
         licence_suspended = false
   where id = app.id;
end; $$;
revoke all on function public.driver_renew_licence(text, date, jsonb, jsonb) from public, anon;
grant execute on function public.driver_renew_licence(text, date, jsonb, jsonb) to authenticated;

-- 9 AM Vancouver every day: pause expired licences, then text upcoming-expiry reminders.
select cron.unschedule('licence-check') where exists (select 1 from cron.job where jobname = 'licence-check');
select cron.schedule('licence-check', '0 16 * * *', $cron$
  select public.expire_driver_licences();
  select net.http_post(
    url := 'https://oyzcaynsuzitmlrmichx.supabase.co/functions/v1/notify',
    body := '{"table":"licences"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
$cron$);
