-- Add price and supplier to stock_movements
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS price numeric(10,2);
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
