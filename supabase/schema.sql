-- Places
create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  google_place_id text unique,
  lat float,
  lng float,
  haiku_count int default 0,
  created_at timestamptz default now()
);

-- Haikus
create table if not exists haikus (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id),
  author text,
  line_1 text not null,
  line_2 text not null,
  line_3 text not null,
  photo_url text,
  held_count int default 0,
  created_at timestamptz default now()
);

-- Holds
create table if not exists holds (
  id uuid primary key default gen_random_uuid(),
  haiku_id uuid references haikus(id),
  session_id text,
  created_at timestamptz default now(),
  unique(haiku_id, session_id)
);

-- RLS
alter table places enable row level security;
alter table haikus enable row level security;
alter table holds enable row level security;

create policy "places_public_read" on places for select using (true);
create policy "places_insert_auth" on places for insert with check (true);

create policy "haikus_public_read" on haikus for select using (true);
create policy "haikus_insert_auth" on haikus for insert with check (true);

create policy "holds_insert" on holds for insert with check (true);
create policy "holds_select" on holds for select using (true);

-- Function to increment held_count
create or replace function increment_held(haiku_id uuid)
returns void as $$
  update haikus set held_count = held_count + 1 where id = haiku_id;
$$ language sql;

-- Function to increment haiku_count on places
create or replace function increment_haiku_count(place_id uuid)
returns void as $$
  update places set haiku_count = haiku_count + 1 where id = place_id;
$$ language sql;
