-- =====================================================================
--  Mojito Windsurf Club — schéma Supabase (fonctions communautaires)
--  À exécuter dans Supabase : SQL Editor → New query → Run.
--  Le script peut être relancé sans erreur (il remplace les règles existantes).
-- =====================================================================

-- Retours de session des membres
create table if not exists public.session_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  spot_id text not null check (char_length(spot_id) <= 40),
  author text not null check (char_length(author) between 1 and 40),
  discipline text not null check (discipline in ('windsurf', 'wingfoil')),
  on_water boolean not null default false,
  feel text not null check (feel in ('trop faible', 'bon', 'fort', 'trop fort')),
  rating smallint not null check (rating between 1 and 5),
  sail numeric check (sail is null or (sail > 0 and sail < 15)),
  board integer check (board is null or (board > 0 and board < 400)),
  wind_kn integer check (wind_kn is null or (wind_kn >= 0 and wind_kn < 100)),
  comment text not null default '' check (char_length(comment) <= 500)
);

-- Colonnes ajoutées ensuite (matériel, distance, durée, vitesse) : sans risque si déjà présentes
alter table public.session_reports add column if not exists sail_brand text not null default '' check (char_length(sail_brand) <= 60);
alter table public.session_reports add column if not exists board_brand text not null default '' check (char_length(board_brand) <= 60);
alter table public.session_reports add column if not exists distance_km numeric check (distance_km is null or (distance_km > 0 and distance_km <= 250));
alter table public.session_reports add column if not exists duration_min integer check (duration_min is null or (duration_min > 0 and duration_min <= 720));
alter table public.session_reports add column if not exists max_speed_kn numeric check (max_speed_kn is null or (max_speed_kn > 0 and max_speed_kn <= 55));

-- Tracé GPS simplifié (import GPX) : liste de [lat, lon], 400 points max
alter table public.session_reports add column if not exists track jsonb check (track is null or (jsonb_typeof(track) = 'array' and jsonb_array_length(track) <= 400));
alter table public.session_reports add column if not exists has_track boolean generated always as (track is not null) stored;

alter table public.session_reports enable row level security;

-- Tout le monde peut lire et publier un retour ; seuls les admins connectés suppriment.
drop policy if exists "lecture publique" on public.session_reports;
create policy "lecture publique" on public.session_reports for select using (true);
drop policy if exists "publication publique" on public.session_reports;
create policy "publication publique" on public.session_reports for insert with check (true);
drop policy if exists "suppression admin" on public.session_reports;
create policy "suppression admin" on public.session_reports for delete to authenticated using (true);

-- Micro-compétitions (créées par les admins)
create table if not exists public.competitions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 80),
  metric text not null check (metric in ('distance', 'duration', 'sessions', 'avg_speed', 'max_speed')),
  spot_id text,
  discipline text check (discipline is null or discipline in ('windsurf', 'wingfoil')),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  description text not null default '' check (char_length(description) <= 200)
);

alter table public.competitions enable row level security;

drop policy if exists "lecture publique des défis" on public.competitions;
create policy "lecture publique des défis" on public.competitions for select using (true);
drop policy if exists "création admin des défis" on public.competitions;
create policy "création admin des défis" on public.competitions for insert to authenticated with check (true);
drop policy if exists "suppression admin des défis" on public.competitions;
create policy "suppression admin des défis" on public.competitions for delete to authenticated using (true);

-- =====================================================================
--  « Qui y va ? » : sorties prévues par les membres (+ covoiturage)
--  owner_token = code secret gardé sur le téléphone de l'auteur : lui seul
--  peut annuler sa sortie (fonction cancel_trip). Il n'est jamais lisible.
-- =====================================================================
create table if not exists public.trips (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  author text not null check (char_length(author) between 1 and 40),
  spot_id text not null check (char_length(spot_id) <= 40),
  day date not null,
  from_hour smallint not null check (from_hour between 0 and 23),
  to_hour smallint not null check (to_hour between 1 and 24 and to_hour > from_hour),
  discipline text not null default 'windsurf' check (discipline in ('windsurf', 'wingfoil', 'les deux')),
  carpool text not null default '' check (carpool in ('', 'propose', 'cherche')),
  seats smallint check (seats is null or seats between 1 and 8),
  departure text not null default '' check (char_length(departure) <= 40),
  comment text not null default '' check (char_length(comment) <= 200),
  owner_token uuid not null
);

alter table public.trips enable row level security;
drop policy if exists "lecture publique des sorties" on public.trips;
create policy "lecture publique des sorties" on public.trips for select using (true);
drop policy if exists "publication publique des sorties" on public.trips;
create policy "publication publique des sorties" on public.trips for insert with check (day >= current_date - 1 and day <= current_date + 60);
drop policy if exists "suppression admin des sorties" on public.trips;
create policy "suppression admin des sorties" on public.trips for delete to authenticated using (true);
-- Le code secret n'est pas lisible par les visiteurs
revoke select on public.trips from anon;
grant select (id, created_at, author, spot_id, day, from_hour, to_hour, discipline, carpool, seats, departure, comment) on public.trips to anon;

create or replace function public.cancel_trip(trip_id bigint, token uuid) returns boolean
language sql security definer set search_path = public as $$
  with d as (delete from public.trips where id = trip_id and owner_token = token returning 1) select exists(select 1 from d);
$$;
grant execute on function public.cancel_trip(bigint, uuid) to anon;

-- =====================================================================
--  Calendrier du club : événements (créés par les admins) et inscriptions
-- =====================================================================
create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 100),
  kind text not null default 'sortie' check (kind in ('sortie', 'compétition', 'formation', 'soirée', 'autre')),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  location text not null default '' check (char_length(location) <= 80),
  spot_id text,
  description text not null default '' check (char_length(description) <= 1000)
);

alter table public.events enable row level security;
drop policy if exists "lecture publique des événements" on public.events;
create policy "lecture publique des événements" on public.events for select using (true);
drop policy if exists "création admin des événements" on public.events;
create policy "création admin des événements" on public.events for insert to authenticated with check (true);
drop policy if exists "modification admin des événements" on public.events;
create policy "modification admin des événements" on public.events for update to authenticated using (true) with check (true);
drop policy if exists "suppression admin des événements" on public.events;
create policy "suppression admin des événements" on public.events for delete to authenticated using (true);

create table if not exists public.event_signups (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_id bigint not null references public.events (id) on delete cascade,
  author text not null check (char_length(author) between 1 and 40),
  comment text not null default '' check (char_length(comment) <= 200),
  owner_token uuid not null
);

alter table public.event_signups enable row level security;
drop policy if exists "lecture publique des inscriptions" on public.event_signups;
create policy "lecture publique des inscriptions" on public.event_signups for select using (true);
drop policy if exists "inscription publique" on public.event_signups;
create policy "inscription publique" on public.event_signups for insert with check (true);
drop policy if exists "suppression admin des inscriptions" on public.event_signups;
create policy "suppression admin des inscriptions" on public.event_signups for delete to authenticated using (true);
revoke select on public.event_signups from anon;
grant select (id, created_at, event_id, author, comment) on public.event_signups to anon;

create or replace function public.cancel_signup(signup_id bigint, token uuid) returns boolean
language sql security definer set search_path = public as $$
  with d as (delete from public.event_signups where id = signup_id and owner_token = token returning 1) select exists(select 1 from d);
$$;
grant execute on function public.cancel_signup(bigint, uuid) to anon;

-- Premier événement du club (ajouté une seule fois)
insert into public.events (title, kind, starts_on, ends_on, location, spot_id, description)
select 'Les Mojito débarquent à Leucate !!!', 'sortie', date '2027-10-17', date '2027-10-24', 'Leucate (11)', 'la-mine',
       'Une semaine de navigation du club à Leucate : windsurf, wing foil et mojitos. Inscrivez-vous pour organiser le logement et le covoiturage.'
where not exists (select 1 from public.events where title = 'Les Mojito débarquent à Leucate !!!');

-- Réglages partagés du club (une seule ligne, id = 1)
create table if not exists public.club_settings (
  id smallint primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.club_settings enable row level security;

drop policy if exists "lecture publique des réglages" on public.club_settings;
create policy "lecture publique des réglages" on public.club_settings for select using (true);
drop policy if exists "écriture admin" on public.club_settings;
create policy "écriture admin" on public.club_settings for insert to authenticated with check (true);
drop policy if exists "mise à jour admin" on public.club_settings;
create policy "mise à jour admin" on public.club_settings for update to authenticated using (true) with check (true);

-- Les admins sont les seuls utilisateurs « authenticated » : invitez-les dans
-- Authentication → Users → Invite user, et laissez l'inscription publique désactivée
-- (Authentication → Sign In / Providers → Email : « Allow new users to sign up » = OFF).
