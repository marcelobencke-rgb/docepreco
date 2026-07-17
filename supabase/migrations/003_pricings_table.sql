CREATE TABLE IF NOT EXISTS public.pricings (
  id uuid default uuid_generate_v4() primary key,
  recipe_id uuid references public.recipes on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  packaging_cost numeric(10,2) default 0.00,
  labor_cost numeric(10,2) not null,
  fixed_costs numeric(10,2) not null,
  card_fee_percent numeric(5,2) not null,
  profit_margin_percent numeric(5,2) not null,
  suggested_price numeric(10,2) not null,
  saved_price numeric(10,2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.pricings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pricings" ON public.pricings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pricings" ON public.pricings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pricings" ON public.pricings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pricings" ON public.pricings FOR DELETE USING (auth.uid() = user_id);
