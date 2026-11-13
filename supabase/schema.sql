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
