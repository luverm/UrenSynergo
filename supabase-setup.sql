-- Voer dit uit in de Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Tabel aanmaken
create table entries (
  id uuid default gen_random_uuid() primary key,
  task text not null,
  hours numeric not null,
  note text default '',
  icon text default '📊',
  color text default '#2C8BE8',
  period text not null,
  created_at timestamp with time zone default now()
);

-- 2. Row Level Security aanzetten (maar open voor iedereen, want geen auth)
alter table entries enable row level security;

-- 3. Policies: iedereen mag lezen, schrijven, updaten, verwijderen
create policy "Allow all reads" on entries for select using (true);
create policy "Allow all inserts" on entries for insert with check (true);
create policy "Allow all updates" on entries for update using (true);
create policy "Allow all deletes" on entries for delete using (true);
