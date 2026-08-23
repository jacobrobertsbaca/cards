create table public.games (
  id bigint generated always as identity primary key,
  code text not null unique,
  kind text not null default 'oh-hell',
  state jsonb not null,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_code_format check (code ~ '^[a-z0-9]{6,12}$'),
  constraint games_kind_known check (kind = 'oh-hell')
);

create index games_updated_at_idx on public.games (updated_at desc);

alter table public.games enable row level security;

create policy games_select_public
on public.games
for select
to anon, authenticated
using (true);

create policy games_insert_public
on public.games
for insert
to anon, authenticated
with check (true);

create policy games_update_public
on public.games
for update
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on table public.games to anon, authenticated;

create or replace function public.set_games_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger games_set_updated_at
before update on public.games
for each row
execute function public.set_games_updated_at();

alter table public.games replica identity full;

alter publication supabase_realtime add table public.games;
