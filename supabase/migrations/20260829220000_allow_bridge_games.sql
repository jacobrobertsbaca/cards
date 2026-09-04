alter table public.games
  drop constraint if exists games_kind_known;

alter table public.games
  add constraint games_kind_known check (kind in ('oh-hell', 'bridge'));
