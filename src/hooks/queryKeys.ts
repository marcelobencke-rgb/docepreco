export const queryKeys = {
  suppliers: (userId: string) => ['suppliers', userId] as const,
  ingredients: (userId: string) => ['ingredients', userId] as const,
  stockMovements: (userId: string) => ['stockMovements', userId] as const,
  ingredientPriceHistory: (ingredientId: string) => ['ingredientPriceHistory', ingredientId] as const,
  recipes: (userId: string) => ['recipes', userId] as const,
  pricings: (userId: string) => ['pricings', userId] as const,
  settings: (userId: string) => ['settings', userId] as const,
  profile: (userId: string) => ['profile', userId] as const,
  cashCategories: (userId: string) => ['cashCategories', userId] as const,
  cashTransactions: (userId: string, start: string, end: string) =>
    ['cashTransactions', userId, start, end] as const,
  shoppingLists: (userId: string) => ['shoppingLists', userId] as const,
  shoppingListItems: (listId: string) => ['shoppingListItems', listId] as const,
};
