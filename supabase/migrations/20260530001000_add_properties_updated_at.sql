alter table public.properties
add column if not exists updated_at timestamptz default now();

update public.properties
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

create or replace function public.renew_property_listing(property_id text)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.properties
  set updated_at = now()
  where id::text = property_id;
$$;

grant execute on function public.renew_property_listing(text) to authenticated;
