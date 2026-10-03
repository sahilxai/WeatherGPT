-- ==============================================================================
-- WeatherGPT Supabase Database & Storage Setup Schema
-- Run this script in your Supabase Project -> SQL Editor -> Run
-- ==============================================================================

-- 1. Create Storage Bucket for WeatherGPT (Disaster Documents, PDFs, Reports)
insert into storage.buckets (id, name, public)
values ('weathergpt-storage', 'weathergpt-storage', true)
on conflict (id) do nothing;

-- Set up storage policy: allow public reading of disaster files
create policy "Allow Public Read on WeatherGPT Storage"
  on storage.objects for select
  using ( bucket_id = 'weathergpt-storage' );

-- Set up storage policy: allow inserts/uploads
create policy "Allow Uploads to WeatherGPT Storage"
  on storage.objects for insert
  with check ( bucket_id = 'weathergpt-storage' );

-- Set up storage policy: allow updates
create policy "Allow Updates on WeatherGPT Storage"
  on storage.objects for update
  using ( bucket_id = 'weathergpt-storage' );

-- Set up storage policy: allow deletes
create policy "Allow Deletes on WeatherGPT Storage"
  on storage.objects for delete
  using ( bucket_id = 'weathergpt-storage' );


-- 2. Chat Logs Table (Stores user & AI conversations)
create table if not exists public.chat_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    session_id text default 'default_session',
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    tools_used text[] default '{}',
    location_data jsonb default '{}'::jsonb
);

-- Enable RLS and add basic policies
alter table public.chat_logs enable row level security;
create policy "Enable full access for anon and authenticated users on chat_logs"
    on public.chat_logs for all
    using (true)
    with check (true);


-- 3. Weather Searches Table (Stores geocoded lookups & atmospheric metrics)
create table if not exists public.weather_searches (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    city text not null,
    country text,
    lat double precision,
    lon double precision,
    temp text,
    condition text,
    humidity text,
    wind_speed text
);

alter table public.weather_searches enable row level security;
create policy "Enable full access on weather_searches"
    on public.weather_searches for all
    using (true)
    with check (true);


-- 4. Disaster & Meteorological Reports Table (Session briefing saves)
create table if not exists public.disaster_reports (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    session_id text default 'default_session',
    preparedness_score integer default 0,
    total_queries integer default 0,
    disaster_queries integer default 0,
    unique_cities text[] default '{}',
    all_warnings text[] default '{}',
    report_metadata jsonb default '{}'::jsonb
);

alter table public.disaster_reports enable row level security;
create policy "Enable full access on disaster_reports"
    on public.disaster_reports for all
    using (true)
    with check (true);

-- Done! Tables and storage bucket configured for WeatherGPT.
