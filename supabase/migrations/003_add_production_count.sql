-- Add production_count column to recipes table
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS production_count integer DEFAULT 0;
