-- Run this in your Supabase Dashboard -> SQL Editor

-- 1. Enable Realtime for the 'glows' table (so new messages appear instantly)
alter publication supabase_realtime add table glows;

-- 2. Enable Realtime for the 'profiles' table (so vibes update instantly)
alter publication supabase_realtime add table profiles;

-- 3. Verify it worked (Optional)
select * from pg_publication_tables where pubname = 'supabase_realtime';
