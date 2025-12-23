-- Function to safely reset a check-in week by deleting responses and the check-in itself.
-- Runs with SECURITY DEFINER to bypass RLS restrictions (needed to delete partner's responses).

create or replace function reset_checkin_week(target_checkin_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- 1. Delete all responses for this check-in
  delete from checkin_responses
  where checkin_id = target_checkin_id;

  -- 2. Delete the check-in itself
  delete from checkins
  where id = target_checkin_id;
end;
$$;
