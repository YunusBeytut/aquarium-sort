import { FISH } from '@/data';

// Sahip olunan özel (storeOnly) canlılardan biri, leveldeki balık türlerinden birinin
// yerine yalnızca GÖRÜNÜM olarak çizilir. Level, çözücü ve seed'e dokunmaz.
// Aynı level + aynı sahiplik = hep aynı sonuç. Level başına en fazla bir özel canlı.
export function pickSkin(
  level: number,
  levelFishIds: number[],
  ownedFish: Record<number, number>
): Record<number, number> | undefined {
  const specials = FISH.filter((f) => f.storeOnly && (ownedFish[f.id] ?? 0) > 0).map((f) => f.id);
  if (specials.length === 0 || levelFishIds.length === 0) return undefined;
  const ids = [...levelFishIds].sort((a, b) => a - b);
  const special = specials[(level * 31) % specials.length];
  const target = ids[(level * 17 + 3) % ids.length];
  return { [target]: special };
}
