import { calcReward, sumBonus, bonusPercent } from '../src/game/rewards';
import { FishDef } from '../src/game/types';

function fish(id: number, rarity: FishDef['rarity'], bonusPct: number): FishDef {
  return {
    id,
    name: `fish${id}`,
    rarity,
    biome: 'reef',
    bonusPct,
    template: 'round',
    palette: { body: '#000', accent: '#fff' },
  };
}

const defs: FishDef[] = [fish(0, 'common', 1), fish(1, 'rare', 3), fish(2, 'epic', 5)];

describe('rewards', () => {
  test('bonus yalnızca sahip olunan balıklardan hesaplanır', () => {
    expect(sumBonus({}, defs)).toBe(0);
    expect(sumBonus({ 0: 1, 2: 1 }, defs)).toBe(6);
    expect(sumBonus({ 1: 0 }, defs)).toBe(0);
  });

  test('bonus %100 ile sınırlanır', () => {
    const many = Array.from({ length: 30 }, (_, i) => fish(i, 'epic', 5));
    const owned: Record<number, number> = {};
    many.forEach((f) => (owned[f.id] = 1));
    expect(bonusPercent(owned, many)).toBe(100);
  });

  test('level 1 ödülü', () => {
    const r = calcReward(1, {}, defs);
    expect(r.pearls).toBe(30);
    expect(r.egg).toBeNull();
    expect(r.boss).toBe(false);
  });

  test('her 3. level normal yumurta verir', () => {
    expect(calcReward(3, {}, defs).egg).toBe('normal');
    expect(calcReward(6, {}, defs).egg).toBe('normal');
    expect(calcReward(4, {}, defs).egg).toBeNull();
  });

  test('boss level: nadir yumurta ve 3 kat inci', () => {
    const normal = calcReward(9, {}, defs);
    const boss = calcReward(10, {}, defs);
    expect(boss.boss).toBe(true);
    expect(boss.egg).toBe('rare');
    expect(boss.pearls).toBe(Math.round((30 + 10 * 0.2) * 3));
    expect(boss.pearls).toBeGreaterThan(normal.pearls * 2);
  });

  test('bonus inciyi artırır', () => {
    const base = calcReward(5, {}, defs).pearls;
    const boosted = calcReward(5, { 2: 1 }, defs).pearls;
    expect(boosted).toBeGreaterThan(base);
    expect(boosted).toBe(Math.round((30 + 5 * 0.2) * 1.05));
  });

  test('level 200 sonrası taban artmaz', () => {
    expect(calcReward(301, {}, defs).pearls).toBe(calcReward(300, {}, defs).pearls / 3);
  });
});