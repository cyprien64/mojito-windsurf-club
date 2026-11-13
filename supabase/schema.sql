-- =====================================================================
--  Mojito Windsurf Club — schéma Supabase (fonctions communautaires)
--  À exécuter une fois dans Supabase : SQL Editor → New query → Run.
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

alter table public.session_reports enable row level security;

-- Tout le monde peut lire et publier un retour ; seuls les admins connectés suppriment.
create policy "lecture publique" on public.session_reports for select using (true);
create policy "publication publique" on public.session_reports for insert with check (true);
create policy "suppression admin" on public.session_reports for delete to authenticated using (true);

-- Réglages partagés du club (une seule ligne, id = 1)
create table if not exists public.club_settings (
  id smallint primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.club_settings enable row level security;

create policy "lecture publique des réglages" on public.club_settings for select using (true);
create policy "écriture admin" on public.club_settings for insert to authenticated with check (true);
create policy "mise à jour admin" on public.club_settings for update to authenticated using (true) with check (true);

-- Les admins sont les seuls utilisateurs « authenticated » : invitez-les dans
-- Authentication → Users → Invite user, et laissez l'inscription publique désactivée
-- (Authentication → Sign In / Providers → Email : « Allow new users to sign up » = OFF).
