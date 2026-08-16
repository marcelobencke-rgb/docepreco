---
name: nova-tela-crud
description: Use ao criar uma nova página de listagem/CRUD no Docepreço (ex: nova entidade de domínio como "categorias", "clientes", etc.), ou ao adicionar uma nova aba/listagem a uma página existente. Garante que a tela siga o padrão visual e de dados já estabelecido no projeto (filtros, cards de listagem, dialog de formulário, fetch Supabase).
---

# Nova tela CRUD — Docepreço

Este skill descreve o padrão a seguir ao criar uma página de listagem com criar/editar/excluir, replicando a estrutura já usada em [src/pages/Suppliers.tsx](../../../src/pages/Suppliers.tsx) (referência mais simples e completa) e páginas maiores como `Inventory.tsx` e `Recipes.tsx`.

Antes de codar, leia `CLAUDE.md` na raiz (seção "Padrão atual de página CRUD" e "Sistema de Design") e o arquivo de referência acima.

## Passo a passo

1. **Modelo de dados**: confirme se a tabela já existe em `supabase/migrations/`. Se não existir, use antes o skill `nova-migration-supabase`.
2. **Tipo TypeScript**: declare um `type` local no topo do arquivo da página espelhando as colunas da tabela (não crie um arquivo de tipos compartilhado a menos que o tipo já seja usado em 2+ lugares).
3. **Estado da página**: siga o padrão de `Suppliers.tsx` —
   - lista da entidade + `loading`
   - `isDialogOpen` + `editingX` (entidade em edição ou `null` para criação)
   - um `useState` por campo de formulário
   - estado de filtros (busca em texto, e opcionalmente `Select` de ordenação/categoria)
4. **Fetch**: função `fetchX` async que faz `supabase.from('tabela').select('*').eq('user_id', user.id).order(...)`, chamada num `useEffect` com `[user]` como dependência. Sempre filtrar por `user_id` mesmo que a RLS já proteja — evita depender só da policy.
5. **Salvar**: um único `handleSave` que decide `insert` vs `update` a partir de `editingX`, fecha o dialog e re-chama `fetchX()`.
6. **Excluir**: confirme com `confirm(...)` antes. Verifique na migration se a tabela usa soft delete (`deleted_at`) — só `ingredients` usa isso hoje; as demais fazem `delete()` físico.
7. **Filtros/busca**: aplicados client-side sobre a lista já carregada (`.filter().sort()`), **não** via nova query ao Supabase a cada tecla.
8. **Layout obrigatório**:
   - Header da página: título `font-display-lg text-[22px] text-primary` + subtítulo `font-label-md text-[12px] text-[#87655F]`, com botão de ação principal (`bg-primary text-white ... rounded-[1.25rem]`) alinhado à direita.
   - **Linha de filtros**: copie exatamente a estrutura de `.agents/AGENTS.md` (classe `flex flex-col md:flex-row gap-4 mb-6 items-center`, input com ícone `search` e `rounded-2xl h-12`, `Select` com `!h-12 w-full` e `md:w-48`). Não invente uma variação.
   - Cards de listagem: `bg-surface-container-lowest rounded-2xl p-4 ... shadow-sticker border-2 border-surface-container`, ícone circular à esquerda, ações (editar/excluir) como botões circulares `w-10 h-10 rounded-full` à direita.
   - Estado vazio: card tracejado (`border-2 border-dashed`) com ícone grande em opacidade reduzida e mensagem contextual (diferente para "sem itens" vs "nenhum resultado do filtro").
   - Dialog de formulário: `DialogContent` com `rounded-3xl border-2 border-primary-container`, campos com `Label` (`font-label-md text-on-surface-variant`) + `Input`/`Select` (`bg-surface border-2 border-outline-variant rounded-xl h-10`), botão de salvar full-width no rodapé.
9. **Rota**: registre a página em [src/App.tsx](../../../src/App.tsx) dentro do `<Route>` protegido, e adicione o item de navegação em [src/components/Layout.tsx](../../../src/components/Layout.tsx) (`navItems`) se for uma seção de primeiro nível.

## Checklist final

- [ ] Query sempre filtrada por `user_id`
- [ ] Filtros seguem exatamente o padrão de `.agents/AGENTS.md`
- [ ] Cores/tipografia usam os tokens do tema (`bg-primary`, `text-on-surface-variant`, `font-body-md`, ...), nunca cores Tailwind cruas
- [ ] Estado vazio tratado
- [ ] Rota + item de menu adicionados
- [ ] Se a página cresce além de ~250-300 linhas, considere extrair o dialog de formulário para `src/components/<Entidade>Dialog.tsx` (padrão já usado em `IngredientDialog.tsx`, `CashCategoryDialog.tsx`)
