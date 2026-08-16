# Docepreço

Sistema web (PWA) para confeiteiras/confeitarias controlarem **ingredientes/estoque**, **fichas técnicas (receitas)**, **precificação**, **lista de compras**, **fornecedores** e **fluxo de caixa**. Multi-tenant via Supabase Auth — cada usuário só enxerga seus próprios dados (RLS por `user_id`).

## Stack

- **React 19 + TypeScript + Vite**, roteamento com `react-router-dom` v7.
- **Tailwind CSS** com tema customizado (ver `tailwind.config.js`) + componentes estilo shadcn em `src/components/ui`.
- **Supabase**: Postgres + Auth + Storage. Cliente único em [src/lib/supabase.ts](src/lib/supabase.ts).
- **react-hook-form + zod** estão nas dependências mas **ainda não são usados** nas telas — os formulários atuais usam `useState` manual por campo (ver "Débitos técnicos conhecidos" abaixo).
- Ícones: mistura de `material-symbols-outlined` (fonte carregada via `@import` em `src/index.css`) e `lucide-react`. Prefira `material-symbols-outlined` para consistência com as telas existentes, a menos que o refactor de ícones (ver débitos técnicos) já tenha sido feito.
- PWA via `vite-plugin-pwa` ([vite.config.ts](vite.config.ts)).

## Comandos

```bash
npm run dev       # servidor de desenvolvimento
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run preview
```

Não há suíte de testes configurada ainda.

## Estrutura

```
src/
  pages/          # uma página por rota, registradas em src/App.tsx
  components/      # componentes compartilhados (dialogs, Layout, ProtectedRoute)
  components/ui/   # primitivos estilo shadcn (button, dialog, select, table, ...)
  contexts/         # AuthContext (sessão Supabase)
  lib/             # supabase client, utils (cn, formatCurrencyInput, parseCurrencyInput)
supabase/migrations/  # migrations numeradas sequencialmente (001_, 002_, ...)
database.sql           # snapshot "clean slate" do schema completo (não é fonte de verdade contínua — as migrations são)
references/            # DESIGN.md + telas de referência (screenshots + HTML) do design system
.agents/AGENTS.md      # regra obrigatória de layout para filtros/busca (duplicada abaixo)
```

Rotas ficam centralizadas em [src/App.tsx](src/App.tsx) — todas as páginas são importadas de forma eager (sem `React.lazy`).

## Sistema de Design — regra crítica

**Antes de mexer em layout, estilo ou componentes visuais, sempre consulte [references/DESIGN.md](references/DESIGN.md)** e as telas de referência em `references/*/screen.png` + `code.html`. O sistema se chama **"Sugar & Spice"** (linguagem "Artisanal Confectionery"): tons quentes de rosa/marrom, tipografia **Comfortaa**, formas extremamente arredondadas (pill shapes, `rounded-3xl`+), sombras "sticker-style". Não use cores/tamanhos padrão do Tailwind sem checar contra `DESIGN.md` — as cores do tema já estão mapeadas em `tailwind.config.js` (`bg-primary`, `text-on-surface-variant`, `bg-surface-container-lowest`, etc.).

A escala global da UI foi reduzida intencionalmente (fontes e espaçamentos menores que o "normal") para não parecer grande demais em desktop — respeite essas proporções reduzidas em telas novas.

### Padrão obrigatório de filtros/busca

Toda tela de listagem (Inventário, Receitas, Precificação, etc.) deve seguir o padrão de filtros documentado em [.agents/AGENTS.md](.agents/AGENTS.md): linha `flex flex-col md:flex-row gap-4 mb-6 items-center`, input de busca com ícone `search` e classes `bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12`, `Select` de filtro com `!h-12 w-full` e largura `md:w-48`. Veja exemplo funcional em [src/pages/Suppliers.tsx](src/pages/Suppliers.tsx).

## Padrão atual de página CRUD

A maioria das páginas (`Suppliers.tsx`, `Inventory.tsx`, `Recipes.tsx`, ...) segue o mesmo formato:

1. `useState` para a lista, `loading`, dialog aberto/fechando, entidade em edição, campos de formulário (um `useState` por campo) e filtros (busca/ordenação, aplicados client-side sobre a lista já carregada).
2. `fetchX()` async que consulta `supabase.from(...).select(...).eq('user_id', user.id)` e chama `setState`; disparado num `useEffect([user])`.
3. `handleSave` faz `insert` ou `update` dependendo se há entidade em edição, fecha o dialog e re-chama `fetchX()`.
4. Exclusão geralmente é soft delete (`deleted_at`) para `ingredients`; para as demais tabelas é `delete` físico — confira a migration da tabela antes de assumir.

Ao criar uma tela nova, use a skill `nova-tela-crud` (`/nova-tela-crud`) em vez de reimplementar esse padrão do zero.

## Supabase / banco de dados

- Toda tabela de domínio tem `user_id uuid references auth.users` e RLS habilitado com policies `select/insert/update/delete using/with check (auth.uid() = user_id)` — tabelas filhas (ex: `recipe_ingredients`, `shopping_list_items`) usam `exists (select 1 from <tabela pai> where ... and user_id = auth.uid())`.
- Migrations em `supabase/migrations/NNN_descricao.sql`, numeração sequencial (cuidado: já existem dois arquivos `003_*`, não repita esse erro). Toda migration que cria tabela nova precisa habilitar RLS e criar as 4 policies.
- `database.sql` é um snapshot inicial "drop & recreate" — não é atualizado a cada migration. Não usar como fonte de verdade do estado atual do schema; usar o diretório `migrations/`.
- Ao criar uma migration, use a skill `nova-migration-supabase`.

## Débitos técnicos conhecidos (direção do refactor)

Isso ainda **não foi implementado** — não assuma que já existe, mas ao tocar em código relacionado, ajude a mover a base nessa direção em vez de reforçar o padrão antigo:

- **Sem camada de dados/cache**: cada página refaz suas próprias queries Supabase em `useEffect`, sem dedupe/cache entre telas (ex: navegar entre Inventário e Receitas rebusca ingredientes do zero). Direção acordada: introduzir **TanStack Query (React Query)** com hooks por entidade (`useIngredients`, `useRecipes`, `useSuppliers`, ...) centralizados, provavelmente em `src/hooks/` ou `src/queries/`.
- **Quase zero `useMemo`/`useCallback`/`React.memo`** — filtros e cálculos derivados (ex: filtragem de listas, custo de receita) são recalculados a cada render.
- **Formulários com `useState` manual por campo**, apesar de `react-hook-form` + `zod` já estarem instalados e não usados.
- **Sem code-splitting de rotas** — todas as páginas são importadas eager em `App.tsx`.
- **Fontes carregadas via `@import` em CSS** (`src/index.css`), o que é render-blocking; preferível usar `<link rel="preconnect">`/`<link rel="stylesheet">` no `index.html`.
- **Páginas grandes demais**, misturando fetch + regras de negócio + UI no mesmo arquivo (`Shopping.tsx` ~800 linhas, `RecipeForm.tsx` ~700, `Inventory.tsx` ~700).
- **Dois sistemas de ícones** (`material-symbols-outlined` + `lucide-react`) coexistindo.

Essas mudanças devem ser feitas em fases combinadas com o usuário — não faça um refactor amplo sem alinhar o escopo antes.

## Fluxo de trabalho neste projeto

O usuário prefere trabalhar por **plano em etapas**: para mudanças maiores que uma correção pontual (refactors, novas features, mudanças de arquitetura), proponha um plano dividido em fases e espere aprovação antes de implementar cada fase. Mudanças pequenas e localizadas (bugfix, ajuste de estilo pontual seguindo o design system já documentado) podem ser feitas diretamente.
