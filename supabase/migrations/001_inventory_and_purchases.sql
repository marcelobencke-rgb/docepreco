-- 1. Add columns to ingredients
ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS category text default 'Ingrediente',
ADD COLUMN IF NOT EXISTS current_stock numeric(10,2) default 0.00;

-- 2. Create stock_movements
CREATE TABLE public.stock_movements (
  id uuid default uuid_generate_v4() primary key,
  ingredient_id uuid references public.ingredients on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('in', 'out')),
  quantity numeric(10,2) not null,
  reason text not null check (reason in ('manual', 'recipe_production', 'purchase')),
  reference_id uuid, -- links to recipe_id or shopping_list_id
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create shopping_lists
CREATE TABLE public.shopping_lists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  status text not null check (status in ('pending', 'completed')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- 4. Create shopping_list_items
CREATE TABLE public.shopping_list_items (
  id uuid default uuid_generate_v4() primary key,
  list_id uuid references public.shopping_lists on delete cascade not null,
  ingredient_id uuid references public.ingredients on delete cascade not null,
  quantity numeric(10,2) not null,
  price numeric(10,2) default 0.00,
  purchased boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Enable RLS
alter table public.stock_movements enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;

-- 6. Create Policies
create policy "Users can view own stock_movements" on public.stock_movements for select using (auth.uid() = user_id);
create policy "Users can insert own stock_movements" on public.stock_movements for insert with check (auth.uid() = user_id);
create policy "Users can update own stock_movements" on public.stock_movements for update using (auth.uid() = user_id);
create policy "Users can delete own stock_movements" on public.stock_movements for delete using (auth.uid() = user_id);

create policy "Users can view own shopping_lists" on public.shopping_lists for select using (auth.uid() = user_id);
create policy "Users can insert own shopping_lists" on public.shopping_lists for insert with check (auth.uid() = user_id);
create policy "Users can update own shopping_lists" on public.shopping_lists for update using (auth.uid() = user_id);
create policy "Users can delete own shopping_lists" on public.shopping_lists for delete using (auth.uid() = user_id);

create policy "Users can view own shopping_list_items" on public.shopping_list_items for select using (
  exists (select 1 from public.shopping_lists where shopping_lists.id = shopping_list_items.list_id and shopping_lists.user_id = auth.uid())
);
create policy "Users can insert own shopping_list_items" on public.shopping_list_items for insert with check (
  exists (select 1 from public.shopping_lists where shopping_lists.id = shopping_list_items.list_id and shopping_lists.user_id = auth.uid())
);
create policy "Users can update own shopping_list_items" on public.shopping_list_items for update using (
  exists (select 1 from public.shopping_lists where shopping_lists.id = shopping_list_items.list_id and shopping_lists.user_id = auth.uid())
);
create policy "Users can delete own shopping_list_items" on public.shopping_list_items for delete using (
  exists (select 1 from public.shopping_lists where shopping_lists.id = shopping_list_items.list_id and shopping_lists.user_id = auth.uid())
);
