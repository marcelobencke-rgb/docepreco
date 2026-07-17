-- Add supplier_id to shopping_list_items
ALTER TABLE public.shopping_list_items ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
