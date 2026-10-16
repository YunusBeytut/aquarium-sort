import { applyMove, isSolved } from '../src/game/rules';
import { solve } from '../src/game/solver';

describe('solver', () => {
  test('basit durumu çözer ve hamleler geçerlidir', () => {
    const cap = 4;
    let jars = [[1, 2, 1, 2], [2, 1, 2, 1], [], []];
    const solution = solve(jars, cap);
    expect(solution).not.toBeNull();
    for (const m of solution!) {
      const r = applyMove(jars, m.from, m.to, cap);
      expect(r).not.toBeNull();
      jars = r!.jars;
    }
    expect(isSolved(jars, cap)).toBe(true);
  });

  test('çözümsüz durumda null döner', () => {
    expect(solve([[1, 2], [2, 1]], 2)).toBeNull();
  });
});