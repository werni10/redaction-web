create or replace function increment_usage(
  p_user_id uuid,
  p_period text,
  p_words integer
)
returns void
language plpgsql
security definer
as $$
begin
  insert into usage (user_id, period, word_count, request_count, updated_at)
  values (p_user_id, p_period, p_words, 1, now())
  on conflict (user_id, period)
  do update set
    word_count = usage.word_count + excluded.word_count,
    request_count = usage.request_count + 1,
    updated_at = now();
end;
$$;
