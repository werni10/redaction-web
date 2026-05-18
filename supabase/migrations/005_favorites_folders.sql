-- Add favorite + folder to translations
alter table translations
  add column if not exists is_favorite boolean default false,
  add column if not exists folder_id uuid;

-- Folders table
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#ef4444',
  created_at timestamptz default now(),
  unique(user_id, name)
);

alter table folders enable row level security;

create policy "Users see own folders" on folders for select using (auth.uid() = user_id);
create policy "Users insert own folders" on folders for insert with check (auth.uid() = user_id);
create policy "Users update own folders" on folders for update using (auth.uid() = user_id);
create policy "Users delete own folders" on folders for delete using (auth.uid() = user_id);

-- Add FK after table created
alter table translations add constraint fk_folder foreign key (folder_id) references folders(id) on delete set null;

create index if not exists idx_translations_favorite on translations(user_id, is_favorite);
create index if not exists idx_translations_folder on translations(folder_id);
create index if not exists idx_folders_user on folders(user_id);
