-- User subscriptions table
create table user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  stripe_customer_id text,
  stripe_subscription_id text,
  status text default 'active' check (status in ('active', 'canceled', 'past_due')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Enable RLS
alter table user_subscriptions enable row level security;

-- Policies
create policy "Users can view their own subscription"
  on user_subscriptions
  for select
  using (auth.uid() = user_id);

create policy "Service role can manage subscriptions"
  on user_subscriptions
  for all
  using (auth.role() = 'service_role');

-- Index
create index idx_user_subscriptions_user_id on user_subscriptions(user_id);
create index idx_user_subscriptions_stripe_customer on user_subscriptions(stripe_customer_id);
create index idx_user_subscriptions_stripe_subscription on user_subscriptions(stripe_subscription_id);
