-- Add deleted_at to ingredients for soft delete
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
