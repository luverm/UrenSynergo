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
-- 5. PROFILE CUSTOMIZATION
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT '';

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- 6. PROJECT GROUPS
-- =============================================================================
CREATE TABLE IF NOT EXISTS groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS group_members (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 7. POSTS & FILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS post_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE post_files ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 8. RLS POLICIES voor groups/posts
-- =============================================================================

-- Groups
CREATE POLICY "Authenticated users create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Members read groups" ON groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid())
  );
CREATE POLICY "Owner manages group" ON groups
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner deletes group" ON groups
  FOR DELETE USING (auth.uid() = owner_id);

-- Group members
CREATE POLICY "Members read members" ON group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
  );
CREATE POLICY "Owner manages members" ON group_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM groups WHERE id = group_id AND owner_id = auth.uid())
  );
CREATE POLICY "Owner removes members" ON group_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM groups WHERE id = group_id AND owner_id = auth.uid())
  );

-- Posts
CREATE POLICY "Members read posts" ON posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = posts.group_id AND user_id = auth.uid())
  );
CREATE POLICY "Members create posts" ON posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM group_members WHERE group_id = posts.group_id AND user_id = auth.uid())
  );
CREATE POLICY "Author deletes posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Post files
CREATE POLICY "Members read files" ON post_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN group_members gm ON gm.group_id = p.group_id
      WHERE p.id = post_files.post_id AND gm.user_id = auth.uid()
    )
  );
CREATE POLICY "Members create files" ON post_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN group_members gm ON gm.group_id = p.group_id
      WHERE p.id = post_files.post_id AND gm.user_id = auth.uid()
    )
  );

-- Admin overrides
CREATE POLICY "Admins read all groups" ON groups FOR SELECT USING (is_admin());
CREATE POLICY "Admins read all members" ON group_members FOR SELECT USING (is_admin());
CREATE POLICY "Admins read all posts" ON posts FOR SELECT USING (is_admin());
CREATE POLICY "Admins read all files" ON post_files FOR SELECT USING (is_admin());

-- =============================================================================
-- 9. ADMIN INSTELLEN
-- =============================================================================
-- Na registratie van de admin gebruiker, voer dit uit:
-- UPDATE profiles SET is_admin = true WHERE email = 'admin@gmail.com';
