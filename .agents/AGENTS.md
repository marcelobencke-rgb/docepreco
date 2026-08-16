# Regras de Design e Padronização do DocePreço

## Filtros de Busca e Seleção
Sempre que uma nova tela for criada ou um filtro for adicionado a uma listagem (como nas telas de Inventário, Receitas ou Precificação), deve-se adotar **obrigatoriamente** o seguinte padrão visual para os campos de busca e filtros, garantindo uniformidade em todo o sistema:

### Estrutura do Layout (Filters Row)
```tsx
<div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
  {/* Campo de Busca */}
  <div className="relative flex-1 w-full">
    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] z-10">search</span>
    <Input 
      type="text" 
      placeholder="Buscar..." 
      className="w-full pl-12 pr-4 bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12"
    />
  </div>
  
  {/* Filtro Select */}
  <div className="flex gap-4 w-full md:w-auto">
    <div className="w-full md:w-48">
      <Select>
        <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
          <SelectValue placeholder="Todas as opções" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as opções</SelectItem>
          {/* Outras opções */}
        </SelectContent>
      </Select>
    </div>
  </div>
</div>
```

### Características Obrigatórias:
- A linha de filtros deve ter a classe `flex flex-col md:flex-row gap-4 mb-6 items-center`.
- O input de texto (Busca) precisa utilizar `bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12`.
- O SelectTrigger (Filtros Categoria/Status) precisa utilizar `bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full`.
- A largura da caixa de Select (`w-48` no desktop) não deve se esticar desnecessariamente e deve se adaptar no mobile (`w-full`).
