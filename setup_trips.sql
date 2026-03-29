-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- Drop the NOT NULL constraint on end_date to support "Ongoing" trips
alter table public.trips alter column end_date drop not null;

-- We also drop it on total_days because an ongoing trip doesn't have a final day count yet.
alter table public.trips alter column total_days drop not null;
