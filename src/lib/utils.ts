import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrencyInput = (value: string | number) => {
  if (value === null || value === undefined) return '';
  
  // Se já for um número (ex: vindo do banco), converte para string com 2 casas decimais
  let stringValue = typeof value === 'number' ? value.toFixed(2) : value;
  
  // Remove tudo que não for dígito
  let digits = stringValue.replace(/\D/g, '');
  if (digits === '') return '';
  
  // Converte para número e divide por 100 para pegar as casas decimais
  const numberValue = parseInt(digits, 10) / 100;
  
  // Formata para o locale pt-BR sem o símbolo 'R$' (pois já tem no label ou podemos colocar)
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const parseCurrencyInput = (value: string) => {
  if (!value) return 0;
  // Remove pontos (milhar) e troca vírgula por ponto
  const cleanValue = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanValue) || 0;
};
