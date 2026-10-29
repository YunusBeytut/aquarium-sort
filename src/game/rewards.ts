import { REWARD } from './economy';
import { EggKind, FishDef } from './types';

export type RewardResult = {
  pearls: number;
  egg: EggKind | null;
  boss: boolean;
  bonusPct: number;
  hiddenBonusPct: number;
};

// Sahip olunan balıkların toplam bonusu (üst sınırsız ham değer).
export function sumBonus(owned: Record<number, number>, fishDefs: FishDef[]): number {
  let total = 0;
  for (const def of fishDefs) {
    if ((owned[def.id] ?? 0) > 0) total += def.bonusPct;
  }
  return total;
}

// Ödüle uygulanan bonus yüzdesi: koleksiyon doluluğuna bağlı, tek genel bonus.
// Mağazaya özel (storeOnly) canlılar sayıya dahil değil. Balık sayısı artsa da tavan sabit kalır.
export function bonusPercent(owned: Record<number, number>, fishDefs: FishDef[]): number {
  const pool = fishDefs.filter((f) => !f.storeOnly);
  if (pool.length === 0) return 0;
  const have = pool.filter((f) => (owned[f.id] ?? 0) > 0).length;
  return Math.round((have / pool.length) * REWARD.collectionBonusMaxPct);
}

export function isBossLevel(level: number): boolean {
  return level % REWARD.bossEvery === 0;
}

export function calcReward(
  level: number,
  owned: Record<number, number>,
  fishDefs: FishDef[],
  hiddenLevel = false
): RewardResult {
  const base = REWARD.basePearls + Math.min(level, REWARD.levelCap) * REWARD.perLevel;
  const bonusPct = bonusPercent(owned, fishDefs);
  const hiddenBonusPct = hiddenLevel ? REWARD.hiddenBonusPct : 0;
  const boss = isBossLevel(level);
  const multiplier = boss ? REWARD.bossMultiplier : 1;
  const pearls = Math.round(
    base * (1 + bonusPct / 100) * (1 + hiddenBonusPct / 100) * multiplier
  );

  // Her 25 levelde bir bedava yumurta, sırayla normal ve nadir: 25 normal, 50 nadir, 75 normal...
  let egg: EggKind | null = null;
  if (level % REWARD.freeEggEvery === 0) {
    egg = (level / REWARD.freeEggEvery) % 2 === 1 ? 'normal' : 'rare';
  }

  return { pearls, egg, boss, bonusPct, hiddenBonusPct };
}