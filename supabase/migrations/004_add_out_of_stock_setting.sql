-- Add allow_out_of_stock_production column to user_settings table
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS allow_out_of_stock_production text DEFAULT 'confirm';
