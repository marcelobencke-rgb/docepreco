ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS min_stock_limit numeric(10,2) default 0.00;
