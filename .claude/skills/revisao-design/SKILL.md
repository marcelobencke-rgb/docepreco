---
name: revisao-design
description: Use antes de considerar uma mudança de UI/layout do Docepreço "pronta" — ao terminar de criar ou editar uma tela, componente ou dialog. Confere a mudança contra o design system "Sugar & Spice" (references/DESIGN.md) e o padrão de filtros (.agents/AGENTS.md), pegando desvios comuns antes do usuário ver a tela.
---

# Revisão de design — Docepreço

Checklist para validar visualmente qualquer mudança de UI antes de entregar. Compare sempre com [references/DESIGN.md](../../../references/DESIGN.md) e, se a tela tiver equivalente, com os screenshots/HTML em `references/*/screen.png` e `code.html`.

## Checklist

**Cores**
- [ ] Nenhuma cor Tailwind padrão "crua" (`bg-blue-500`, `text-gray-700`, `border-red-400`, etc.) — só tokens do tema (`bg-primary`, `bg-surface-container-lowest`, `text-on-surface-variant`, `border-outline-variant`, `bg-error-container`, ...).
- [ ] Fundo de página usa o creme (`#FAF0ED` / `bg-surface`), nunca branco puro como cor de fundo principal.
- [ ] Amarelo (tertiary) e mint usados com moderação, só para destaque/sucesso — não como cor dominante.

**Tipografia**
- [ ] Fonte é sempre Comfortaa (herdada via `font-sans`/`font-body-md`/etc. — não sobrescrever com outra família).
- [ ] Hierarquia usa as classes de tipo do tema (`font-display-lg`, `font-headline-sm`, `font-body-md`, `font-label-md`) e não tamanhos arbitrários soltos, a menos que a tela de referência já use um valor customizado (ex: `text-[13px]` aparece em várias telas existentes — aceitável se consistente com o resto da tela).
- [ ] Escala reduzida respeitada: nada de textos/espaçamentos "grandes demais" tipo template genérico — comparar com a densidade das telas em `references/`.

**Formas e profundidade**
- [ ] Cantos sempre arredondados — nada de `rounded-none`/`rounded-sm` isolado em botão, card ou input. Botões/pills usam `rounded-[1.25rem]`+ ou `rounded-full`; cards usam `rounded-2xl`/`rounded-3xl`.
- [ ] Sombras usam os tons quentes já definidos (`shadow-sticker`, `shadow-soft`, ou `shadow-[...rgba(232,122,140,...)]`), não `shadow-lg` genérico do Tailwind.
- [ ] Inputs com borda dupla (`border-2 border-outline-variant`), não borda fina padrão.

**Padrões estruturais**
- [ ] Se a tela tem busca/filtro, segue **exatamente** a estrutura de `.agents/AGENTS.md` (ver skill `nova-tela-crud` para o snippet).
- [ ] Botões com animação de "press" (`active:scale-95`) e transições suaves (`transition-all`).
- [ ] Estado vazio (lista sem itens) tem tratamento visual próprio, não só "nada aparece".
- [ ] Responsivo: layout de duas colunas/filtros vira coluna única em mobile (`flex-col md:flex-row`), navegação inferior mobile continua funcionando se a tela for nova rota de primeiro nível.

## Se algo destoar

Não "invente" um novo padrão visual para resolver um caso não coberto — primeiro procure uma tela existente com problema parecido (ex: outra listagem, outro dialog) e replique a solução usada lá. Só proponha uma variação nova ao usuário se genuinamente não houver precedente no app.
