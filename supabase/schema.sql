-- Esquema de Biblioteca. Se aplica con scripts/supabase_sql.sh supabase/schema.sql
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key         text not null,                 -- tmdb:movie:123 · tmdb:tv:456 · igdb:789 · local:...
  type        text not null check (type in ('game','movie','series','book')),
  title       text not null,
  original_title text,
  cover       text,                          -- URL completa de la portada
  release_year int,
  status      text not null check (status in
                ('visto','pendiente','en_curso','en_emision','no_visto','no_recuerdo')),
  rating      numeric(3,1) check (rating is null or (rating between 0 and 10 and rating * 2 = floor(rating * 2))),
  years       int[] not null default '{}',   -- años en que lo viste/jugaste (2021+)
  pre2021     boolean not null default false, -- visto antes de 2021
  history     jsonb not null default '[]',   -- [{year, rating, note}] p. ej. temporadas de series
  anime       boolean not null default false,
  dlc_of      text,
  hackrom     boolean not null default false,
  hours       numeric,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists items_user_type on public.items (user_id, type);

alter table public.items enable row level security;

drop policy if exists "dueño lee" on public.items;
drop policy if exists "dueño inserta" on public.items;
drop policy if exists "dueño modifica" on public.items;
drop policy if exists "dueño borra" on public.items;
create policy "dueño lee"      on public.items for select using (user_id = auth.uid());
create policy "dueño inserta"  on public.items for insert with check (user_id = auth.uid());
create policy "dueño modifica" on public.items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dueño borra"    on public.items for delete using (user_id = auth.uid());

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists items_touch on public.items;
create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.items to authenticated;
revoke all on public.items from anon;
