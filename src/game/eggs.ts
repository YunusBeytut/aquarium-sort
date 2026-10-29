import {
  DUPLICATE_PEARLS,
  DUPLICATE_STREAK_LIMIT,
  EGG_ODDS,
  PITY_LIMIT,
  RARITY_ORDER,
} from './economy';
import { EggKind, FishDef, Rarity } from './types';

export type EggResult = {
  fish: FishDef;
  isNew: boolean;
  // Balık zaten varsa inciye çevrilen miktar
  duplicatePearls: number;
  // Yumurta sonrası yeni pity sayacı
  pity: number;
  // Yumurta sonrası üst üste tekrar balık sayacı
  dupStreak: number;
};

export function rollRarity(kind: EggKind, pity: number, rng: () => number): Rarity {
  const odds = EGG_ODDS[kind];

  // Pity: epic/legendary garantisi (kendi oranlarına göre dağıtılır)
  if (pity >= PITY_LIMIT) {
    const total = odds.epic + odds.legendary;
    return rng() < odds.legendary / total ? 'legendary' : 'epic';
  }

  let r = rng();
  for (const rarity of RARITY_ORDER) {
    if (r < odds[rarity]) return rarity;
    r -= odds[rarity];
  }
  return 'common';
}

// İstenen nadirlikte balık yoksa önce daha düşük, sonra daha yüksek nadirliğe bakılır.
function pickFish(fishDefs: FishDef[], rarity: Rarity, rng: () => number): FishDef | null {
  const start = RARITY_ORDER.indexOf(rarity);
  const order: Rarity[] = [];
  for (let i = start; i >= 0; i--) order.push(RARITY_ORDER[i]);
  for (let i = start + 1; i < RARITY_ORDER.length; i++) order.push(RARITY_ORDER[i]);

  for (const r of order) {
    const candidates = fishDefs.filter((f) => f.rarity === r);
    if (candidates.length > 0) {
      return candidates[Math.floor(rng() * candidates.length)];
    }
  }
  return null;
}

// `fishDefs` yalnızca açık biyomların balıklarını içermelidir.
export function rollEgg(
  kind: EggKind,
  pity: number,
  dupStreak: number,
  owned: Record<number, number>,
  allFish: FishDef[],
  rng: () => number = Math.random
): EggResult | null {
  // Mağazaya özel canlılar yumurta havuzuna girmez.
  const fishDefs = allFish.filter((f) => !f.storeOnly);
  if (fishDefs.length === 0) return null;

  const rarity = rollRarity(kind, pity, rng);

  // Nadir yumurta her zaman, normal yumurta tekrar serisi dolunca yeni balık verir.
  // Sahip olunmayan balık kalmadıysa normal akışa düşer (tekrar balık + inci iadesi).
  const guaranteeNew = kind === 'rare' || dupStreak >= DUPLICATE_STREAK_LIMIT;
  const unowned = guaranteeNew ? fishDefs.filter((f) => !((owned[f.id] ?? 0) > 0)) : [];
  const fish = pickFish(unowned.length > 0 ? unowned : fishDefs, rarity, rng);
  if (!fish) return null;

  const isNew = !((owned[fish.id] ?? 0) > 0);
  const duplicatePearls = isNew ? 0 : DUPLICATE_PEARLS[fish.rarity];
  const highRarity = fish.rarity === 'epic' || fish.rarity === 'legendary';

  return {
    fish,
    isNew,
    duplicatePearls,
    pity: highRarity ? 0 : pity + 1,
    dupStreak: isNew ? 0 : dupStreak + 1,
  };
}