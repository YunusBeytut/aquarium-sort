import type { DecorDef } from './types';

// src/game/decor.ts: saf mantık, React'e bağlı değil.

export const DEFAULT_BACKGROUND_ID = 'default';
// Akvaryum ekranının kendi arka planı: diğer ekran arka planlarından bağımsız seçilir.
export const DEFAULT_AQUARIUM_BACKGROUND_ID = 'aq-default';

// Dekor açık mı: ya inciyle alınmış ya da oyuncu açılış levelüne gelmiş.
export function isDecorUnlocked(
  def: DecorDef,
  ownedDecor: string[],
  currentLevel: number
): boolean {
  if (ownedDecor.includes(def.id)) return true;
  return def.unlockLevel !== null && currentLevel >= def.unlockLevel;
}

// Seçili arka plan geçersizse (silinmiş ya da henüz açık değil) varsayılana döner.
export function resolveBackgroundId(
  selected: string,
  decor: DecorDef[],
  ownedDecor: string[],
  currentLevel: number
): string {
  if (selected === DEFAULT_BACKGROUND_ID) return DEFAULT_BACKGROUND_ID;
  const def = decor.find((d) => d.id === selected && d.kind === 'background');
  return def && isDecorUnlocked(def, ownedDecor, currentLevel) ? def.id : DEFAULT_BACKGROUND_ID;
}

// Seçili akvaryum arka planı geçersizse (silinmiş ya da alınmamış) varsayılana döner.
// Akvaryum arka planları yalnızca inciyle alınır (unlockLevel null).
export function resolveAquariumBackgroundId(
  selected: string | undefined,
  decor: DecorDef[],
  ownedDecor: string[]
): string {
  if (!selected || selected === DEFAULT_AQUARIUM_BACKGROUND_ID) return DEFAULT_AQUARIUM_BACKGROUND_ID;
  const def = decor.find((d) => d.id === selected && d.kind === 'aquariumBackground');
  return def && ownedDecor.includes(def.id) ? def.id : DEFAULT_AQUARIUM_BACKGROUND_ID;
}