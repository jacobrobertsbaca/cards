create table public.game_messages (
  id uuid primary key default gen_random_uuid(),
  game_code text not null references public.games (code) on delete cascade,
  player_id text not null,
  player_name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint game_messages_player_id_len check (
    char_length(player_id) > 0 and char_length(player_id) <= 64
  ),
  constraint game_messages_player_name_len check (
    char_length(player_name) >= 0 and char_length(player_name) <= 24
  ),
  constraint game_messages_body_len check (
    char_length(body) > 0 and char_length(body) <= 280
  )
);

create index game_messages_game_code_created_at_idx
on public.game_messages (game_code, created_at);

alter table public.game_messages enable row level security;

create policy game_messages_select_public
on public.game_messages
for select
to anon, authenticated
using (true);

create policy game_messages_insert_public
on public.game_messages
for insert
to anon, authenticated
with check (true);

grant select, insert on table public.game_messages to anon, authenticated;

alter table public.game_messages replica identity full;

alter publication supabase_realtime add table public.game_messages;
