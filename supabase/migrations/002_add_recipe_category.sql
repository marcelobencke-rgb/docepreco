-- Add category column to recipes table
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS category text default 'Sem Categoria';
