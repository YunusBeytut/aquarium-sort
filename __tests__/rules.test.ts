import { applyMove, canMove, isSolved, undoMove } from '../src/game/rules';

describe('rules', () => {
  const cap = 4;

  test('boş kavanoza taşıma geçerli', () => {
    expect(canMove([[1, 2], []], 0, 1, cap)).toBe(true);
  });

  test('farklı türün üstüne taşıma geçersiz', () => {
    expect(canMove([[1, 2], [3]], 0, 1, cap)).toBe(false);
  });

  test('dolu kavanoza taşıma geçersiz', () => {
    expect(canMove([[1], [1, 1, 1, 1]], 0, 1, cap)).toBe(false);
  });

  test('grup, hedefte sığan kadar taşınır', () => {
    const r = applyMove([[2, 1, 1, 1], [1, 1, 1]], 0, 1, cap);
    expect(r).not.toBeNull();
    expect(r!.move.count).toBe(1);
    expect(r!.jars[0]).toEqual([2, 1, 1]);
    expect(r!.jars[1]).toEqual([1, 1, 1, 1]);
  });

  test('geri al hamleyi tersine çevirir', () => {
    const start = [[2, 1, 1], [1], []];
    const r = applyMove(start, 0, 1, cap)!;
    expect(undoMove(r.jars, r.move)).toEqual(start);
  });

  test('isSolved', () => {
    expect(isSolved([[1, 1, 1, 1], [2, 2, 2, 2], []], cap)).toBe(true);
    expect(isSolved([[1, 1, 1], [1, 2, 2, 2, 2], []], 5)).toBe(false);
    expect(isSolved([[1, 1, 1], [], []], cap)).toBe(false);
  });
});