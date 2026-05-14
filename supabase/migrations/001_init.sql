-- RedAction Web — initial schema

-- Usage per billing period
create table if not exists usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  period text not null,           -- 'YYYY-MM'
  word_count integer default 0,
  request_count integer default 0,
  updated_at timestamptz default now(),
  unique(user_id, period)
);

alter table usage enable row level security;

create policy "Users see own usage"
  on usage for select
  using (auth.uid() = user_id);

create policy "Users insert own usage"
  on usage for insert
  with check (auth.uid() = user_id);

create policy "Users update own usage"
  on usage for update
  using (auth.uid() = user_id);

-- Translation history
create table if not exists translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  mode text not null check (mode in ('general', 'ocp', 'arabic_rewrite')),
  source_text text not null,
  result_text text not null,
  word_count integer,
  created_at timestamptz default now()
);

alter table translations enable row level security;

create policy "Users see own translations"
  on translations for select
  using (auth.uid() = user_id);

create policy "Users insert own translations"
  on translations for insert
  with check (auth.uid() = user_id);

create policy "Users delete own translations"
  on translations for delete
  using (auth.uid() = user_id);

-- Indexes
create index if not exists translations_user_created on translations(user_id, created_at desc);
create index if not exists usage_user_period on usage(user_id, period);
