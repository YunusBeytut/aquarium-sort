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

// Ödüle uygulanan bonus yüzdesi (üst sınırlı).
export function bonusPercent(owned: Record<number, number>, fishDefs: FishDef[]): number {
  return Math.min(sumBonus(owned, fishDefs), REWARD.maxBonusPct);
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

  let egg: EggKind | null = null;
  if (boss) egg = 'rare';
  else if (level % REWARD.normalEggEvery === 0) egg = 'normal';

  return { pearls, egg, boss, bonusPct, hiddenBonusPct };
}