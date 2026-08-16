---
name: nova-migration-supabase
description: Use ao criar ou alterar uma tabela no banco Supabase do Docepreço (nova tabela, nova coluna, nova policy). Garante numeração correta da migration e que RLS/policies sigam o padrão já usado no projeto.
---

# Nova migration Supabase — Docepreço

## Onde e como nomear

- Migrations vivem em `supabase/migrations/`, nomeadas `NNN_descricao_curta.sql` com `NNN` sequencial e zero-padded (`001`, `002`, ...).
- **Antes de criar o arquivo, rode `ls supabase/migrations` e pegue o maior número já usado** — já existem dois arquivos `003_*` no histórico do projeto (`003_add_production_count.sql` e `003_pricings_table.sql`), não repita colisões de número.
- `database.sql` na raiz é só um snapshot histórico "clean slate" — **não edite esse arquivo** para representar mudanças novas; ele não é a fonte de verdade contínua do schema.

## Padrão de tabela nova

Toda tabela de domínio no Docepreço segue este formato (veja `database.sql` para exemplos completos):

```sql
create table public.minha_tabela (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  -- colunas específicas aqui
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.minha_tabela enable row level security;

create policy "Users can view own minha_tabela" on public.minha_tabela for select using (auth.uid() = user_id);
create policy "Users can insert own minha_tabela" on public.minha_tabela for insert with check (auth.uid() = user_id);
create policy "Users can update own minha_tabela" on public.minha_tabela for update using (auth.uid() = user_id);
create policy "Users can delete own minha_tabela" on public.minha_tabela for delete using (auth.uid() = user_id);
```

- Toda tabela precisa das 4 policies (select/insert/update/delete), mesmo que a tela ainda não use todas as operações.
- Se a tabela é "filha" de outra (ex: itens de uma lista), ela **não** tem `user_id` direto — usa `exists (select 1 from tabela_pai where tabela_pai.id = minha_tabela.pai_id and tabela_pai.user_id = auth.uid())` nas 4 policies, como em `recipe_ingredients` e `shopping_list_items`.
- Campos monetários: `numeric(10,2)`. Percentuais: `numeric(5,2)`. Quantidades de estoque: `numeric(10,2)`. Custos unitários de maior precisão: `numeric(10,4)` (ver `base_unit_cost`).
- Soft delete (`deleted_at timestamp with time zone`) só é usado em `ingredients` hoje — só adicione a outra tabela se for pedido explicitamente, e lembre de excluir os registros com `deleted_at is not null` das queries client-side (`.is('deleted_at', null)`).

## Alterar tabela existente

Migration só de `alter table` — não edite migrations antigas já aplicadas. Exemplo mínimo:

```sql
alter table public.ingredients add column min_stock_limit numeric(10,2);
```

## Depois de criar a migration

1. Rode/aplique a migration no Supabase (o usuário decide quando aplicar em produção — não assuma que já foi aplicado).
2. Atualize o `type` TypeScript da entidade na página/componente correspondente.
3. Se adicionou uma tabela nova destinada a virar uma tela, considere o skill `nova-tela-crud` em seguida.
