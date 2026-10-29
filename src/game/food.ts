// src/game/food.ts: balık yemi sabitleri. Saf mantık, React'e bağlı değil.

// Yeni oyuncunun ilk yem stoğu: yemi denesin, bitince mağazadan alsın.
export const FOOD_START = 10;

// Mağazadaki yem paketi (inciyle). Fiyat yumurta fiyatlarına bakılarak dengelenecek.
export const FOOD_PACK = { amount: 20, price: 30 };
