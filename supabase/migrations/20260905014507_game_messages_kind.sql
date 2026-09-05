alter table public.game_messages
add column kind text not null default 'chat';

alter table public.game_messages
add constraint game_messages_kind_check
check (kind in ('chat', 'state'));
