-- Drop existing tables to ensure a clean slate (Safe to run since there's no data)
drop table if exists public.pricings cascade;
drop table if exists public.recipe_ingredients cascade;
drop table if exists public.recipes cascade;
drop table if exists public.ingredients cascade;
drop table if exists public.user_settings cascade;
drop table if exists public.suppliers cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create user_settings table
create table public.user_settings (
  id uuid references auth.users on delete cascade not null primary key,
  labor_hour_value numeric(10,2) default 15.00,
  fixed_costs_monthly numeric(10,2) default 0.00,
  estimated_monthly_production integer default 1,
  default_card_fee_percent numeric(5,2) default 3.00,
  default_profit_margin_percent numeric(5,2) default 40.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create suppliers table
create table public.suppliers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  contact_info text,
  email text,
  cnpj text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create ingredients table
create table public.ingredients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  purchase_unit text not null, -- kg, g, litro, ml, unidade, duzia
  purchase_quantity numeric(10,2) not null,
  purchase_price numeric(10,2) not null,
  base_unit_cost numeric(10,4) not null,
  supplier_id uuid references public.suppliers on delete set null,
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create recipes table (Fichas Técnicas)
create table public.recipes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  yield numeric(10,2) not null,
  prep_time_minutes integer not null,
  instructions text,
  notes text,
  image_url text,
  production_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create recipe_ingredients table
create table public.recipe_ingredients (
  id uuid default uuid_generate_v4() primary key,
  recipe_id uuid references public.recipes on delete cascade not null,
  ingredient_id uuid references public.ingredients on delete cascade not null,
  quantity_used numeric(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create pricings table
create table public.pricings (
  id uuid default uuid_generate_v4() primary key,
  recipe_id uuid references public.recipes on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  packaging_cost numeric(10,2) default 0.00,
  labor_cost numeric(10,2) not null,
  fixed_costs numeric(10,2) not null,
  card_fee_percent numeric(5,2) not null,
  profit_margin_percent numeric(5,2) not null,
  suggested_price numeric(10,2) not null,
  saved_price numeric(10,2), -- if the user wants to manually override and save a final price
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.user_settings enable row level security;
alter table public.suppliers enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.pricings enable row level security;

-- Create Policies
-- user_settings
create policy "Users can view own settings" on public.user_settings for select using (auth.uid() = id);
create policy "Users can insert own settings" on public.user_settings for insert with check (auth.uid() = id);
create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = id);

-- suppliers
create policy "Users can view own suppliers" on public.suppliers for select using (auth.uid() = user_id);
create policy "Users can insert own suppliers" on public.suppliers for insert with check (auth.uid() = user_id);
create policy "Users can update own suppliers" on public.suppliers for update using (auth.uid() = user_id);
create policy "Users can delete own suppliers" on public.suppliers for delete using (auth.uid() = user_id);

-- ingredients
create policy "Users can view own ingredients" on public.ingredients for select using (auth.uid() = user_id);
create policy "Users can insert own ingredients" on public.ingredients for insert with check (auth.uid() = user_id);
create policy "Users can update own ingredients" on public.ingredients for update using (auth.uid() = user_id);
create policy "Users can delete own ingredients" on public.ingredients for delete using (auth.uid() = user_id);

-- recipes
create policy "Users can view own recipes" on public.recipes for select using (auth.uid() = user_id);
create policy "Users can insert own recipes" on public.recipes for insert with check (auth.uid() = user_id);
create policy "Users can update own recipes" on public.recipes for update using (auth.uid() = user_id);
create policy "Users can delete own recipes" on public.recipes for delete using (auth.uid() = user_id);

-- recipe_ingredients
create policy "Users can view own recipe_ingredients" on public.recipe_ingredients for select using (
  exists (select 1 from public.recipes where recipes.id = recipe_ingredients.recipe_id and recipes.user_id = auth.uid())
);
create policy "Users can insert own recipe_ingredients" on public.recipe_ingredients for insert with check (
  exists (select 1 from public.recipes where recipes.id = recipe_ingredients.recipe_id and recipes.user_id = auth.uid())
);
create policy "Users can update own recipe_ingredients" on public.recipe_ingredients for update using (
  exists (select 1 from public.recipes where recipes.id = recipe_ingredients.recipe_id and recipes.user_id = auth.uid())
);
create policy "Users can delete own recipe_ingredients" on public.recipe_ingredients for delete using (
  exists (select 1 from public.recipes where recipes.id = recipe_ingredients.recipe_id and recipes.user_id = auth.uid())
);

-- pricings
create policy "Users can view own pricings" on public.pricings for select using (auth.uid() = user_id);
create policy "Users can insert own pricings" on public.pricings for insert with check (auth.uid() = user_id);
create policy "Users can update own pricings" on public.pricings for update using (auth.uid() = user_id);
create policy "Users can delete own pricings" on public.pricings for delete using (auth.uid() = user_id);

-- Create trigger to automatically create user_settings on user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.user_settings (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to allow safe re-run
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Setup Storage for Recipe Images
insert into storage.buckets (id, name, public) 
values ('recipe-images', 'recipe-images', true) 
on conflict (id) do nothing;

-- Storage Policies
create policy "Images are publicly accessible" on storage.objects for select using (bucket_id = 'recipe-images');
create policy "Users can upload images" on storage.objects for insert with check (bucket_id = 'recipe-images' and auth.uid() = owner);
create policy "Users can update own images" on storage.objects for update using (bucket_id = 'recipe-images' and auth.uid() = owner);
create policy "Users can delete own images" on storage.objects for delete using (bucket_id = 'recipe-images' and auth.uid() = owner);
