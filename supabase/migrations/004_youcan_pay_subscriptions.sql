-- Add YouCanPay columns to subscriptions
alter table user_subscriptions
  add column youcan_pay_transaction_id text,
  add column youcan_pay_customer_email text,
  add column renewal_status text default 'active' check (renewal_status in ('active', 'expired', 'pending_renewal')),
  add column auto_renew boolean default false;

-- Update indexes
create index idx_user_subscriptions_youcan_pay_transaction on user_subscriptions(youcan_pay_transaction_id);
create index idx_user_subscriptions_renewal_status on user_subscriptions(renewal_status);
