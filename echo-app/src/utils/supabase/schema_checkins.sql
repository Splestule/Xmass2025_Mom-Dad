-- Check-in Configuration
create table if not exists checkin_config (
  family_id uuid references families(id) not null primary key,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = Sunday
  time_utc time not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table checkin_config enable row level security;

create policy "Users can view checkin config for their family"
  on checkin_config for select
  using ( family_id in (select family_id from profiles where id = auth.uid()) );

create policy "Users can update checkin config for their family"
  on checkin_config for update
  using ( family_id in (select family_id from profiles where id = auth.uid()) );

create policy "Users can insert checkin config for their family"
  on checkin_config for insert
  with check ( family_id in (select family_id from profiles where id = auth.uid()) );

-- Check-ins (The weekly instances)
create table if not exists checkins (
  id uuid default gen_random_uuid() primary key,
  family_id uuid references families(id) not null,
  week_start_date date not null, -- The Monday (or Sunday) of the week this check-in belongs to
  status text check (status in ('pending', 'completed')) default 'pending',
  ai_topic jsonb, -- { "title": "...", "description": "..." }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(family_id, week_start_date)
);

alter table checkins enable row level security;

create policy "Users can view checkins for their family"
  on checkins for select
  using ( family_id in (select family_id from profiles where id = auth.uid()) );

create policy "Service role can manage checkins"
  on checkins
  using ( true );

create policy "Users can insert checkins for their family"
  on checkins for insert
  with check ( family_id in (select family_id from profiles where id = auth.uid()) );

create policy "Users can update checkins for their family"
  on checkins for update
  using ( family_id in (select family_id from profiles where id = auth.uid()) );


-- Check-in Responses
create table if not exists checkin_responses (
  id uuid default gen_random_uuid() primary key,
  checkin_id uuid references checkins(id) not null,
  user_id uuid references auth.users(id) not null,
  temperature int not null check (temperature between 1 and 10),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(checkin_id, user_id)
);

alter table checkin_responses enable row level security;

create policy "Users can view responses for their family"
  on checkin_responses for select
  using (
    exists (
      select 1 from checkins
      where checkins.id = checkin_responses.checkin_id
      and checkins.family_id in (select family_id from profiles where id = auth.uid())
    )
  );

create policy "Users can insert their own response"
  on checkin_responses for insert
  with check ( user_id = auth.uid() );

create policy "Users can update their own response"
  on checkin_responses for update
  using ( user_id = auth.uid() );
