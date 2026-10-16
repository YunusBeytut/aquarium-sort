import { generateLevel, getConfig } from '../src/game/levelGenerator';
import { applyMove, isJarUniformFull, isSolved } from '../src/game/rules';
import { solve } from '../src/game/solver';

jest.setTimeout(300000);

describe('levelGenerator', () => {
  test('aynı level aynı sonucu verir (deterministik)', () => {
    expect(generateLevel(42).jars).toEqual(generateLevel(42).jars);
  });

  test('başlangıçta tam olarak yapılandırmadaki kadar boş kavanoz vardır', () => {
    for (let level = 1; level <= 500; level++) {
      const cfg = getConfig(level);
      const lv = generateLevel(level);
      const empties = lv.jars.filter((j) => j.length === 0).length;
      expect(empties).toBe(cfg.emptyJars);
      expect(lv.jars.length).toBe(cfg.types + cfg.emptyJars);
    }
  });

  test('her türden tam kapasite kadar balık vardır', () => {
    for (let level = 1; level <= 500; level += 7) {
      const lv = generateLevel(level);
      const counts = new Map<number, number>();
      for (const jar of lv.jars) {
        for (const f of jar) counts.set(f, (counts.get(f) ?? 0) + 1);
      }
      expect(counts.size).toBe(lv.fishIds.length);
      for (const n of counts.values()) expect(n).toBe(lv.capacity);
    }
  });

  test('level 1-500 üretilir, hazır kavanoz yoktur ve çözülebilir', () => {
    for (let level = 1; level <= 500; level++) {
      const lv = generateLevel(level);
      expect(lv.jars.some((j) => isJarUniformFull(j, lv.capacity))).toBe(false);

      let jars = lv.jars;
      const solution = solve(jars, lv.capacity);
      expect(solution).not.toBeNull();
      for (const m of solution!) {
        jars = applyMove(jars, m.from, m.to, lv.capacity)!.jars;
      }
      expect(isSolved(jars, lv.capacity)).toBe(true);
    }
  });
});