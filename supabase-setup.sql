-- Voer dit uit in de Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- ⚠️  LET OP: dit script vervangt het oude schema. Als je al data hebt, maak eerst een backup.

-- =============================================================================
-- 1. PROFILES TABEL (automatisch aangemaakt bij registratie)
-- =============================================================================
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text default '',
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Gebruikers kunnen hun eigen profiel lezen
create policy "Users read own profile" on profiles
  for select using (auth.uid() = id);

-- Admins kunnen alle profielen lezen
create policy "Admins read all profiles" on profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================================================
-- 2. TRIGGER: automatisch profiel aanmaken bij nieuwe gebruiker
-- =============================================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- 3. ENTRIES TABEL (met user_id kolom)
-- =============================================================================
create table if not exists entries (
  id uuid default gen_random_uuid() primary key,
  task text not null,
  hours numeric not null,
  note text default '',
  icon text default '📊',
  color text default '#2C8BE8',
  period text not null,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table entries enable row level security;

-- Gebruikers kunnen alleen hun eigen entries lezen
create policy "Users read own entries" on entries
  for select using (auth.uid() = user_id);

-- Admins kunnen alle entries lezen
create policy "Admins read all entries" on entries
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Gebruikers kunnen alleen hun eigen entries toevoegen
create policy "Users insert own entries" on entries
  for insert with check (auth.uid() = user_id);

-- Gebruikers kunnen alleen hun eigen entries bijwerken
create policy "Users update own entries" on entries
  for update using (auth.uid() = user_id);

-- Gebruikers kunnen alleen hun eigen entries verwijderen
create policy "Users delete own entries" on entries
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- 4. MIGRATIE: als je de oude entries tabel al hebt
-- =============================================================================
-- Uncomment deze regels als je de tabel al hebt en wilt migreren:
--
-- ALTER TABLE entries ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
--
-- DROP POLICY IF EXISTS "Allow all reads" ON entries;
-- DROP POLICY IF EXISTS "Allow all inserts" ON entries;
-- DROP POLICY IF EXISTS "Allow all updates" ON entries;
-- DROP POLICY IF EXISTS "Allow all deletes" ON entries;

-- =============================================================================
-- 5. ADMIN INSTELLEN
-- =============================================================================
-- Na registratie van de admin gebruiker, voer dit uit:
-- UPDATE profiles SET is_admin = true WHERE email = 'admin@synergo.com';
