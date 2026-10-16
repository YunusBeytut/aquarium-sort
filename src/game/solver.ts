import { Jars, Move, applyMove, getValidMoves, isJarUniformFull, isSolved } from './rules';

// Kavanoz sırası önemsiz olduğu için sıralı anahtar kullanılır.
function stateKey(jars: Jars): string {
  return jars
    .map((j) => j.join(','))
    .sort()
    .join('|');
}

function candidates(jars: Jars, capacity: number): Move[] {
  const moves = getValidMoves(jars, capacity).filter((m) => {
    const src = jars[m.from];
    const dst = jars[m.to];
    // Tamamlanmış kavanozu bozma
    if (isJarUniformFull(src, capacity)) return false;
    // Tek renkli kavanozu boş kavanoza taşımak anlamsız
    const srcUniform = src.every((f) => f === src[0]);
    if (srcUniform && dst.length === 0) return false;
    return true;
  });
  // Dolu kavanoza istif yapan hamleler önce denenir
  moves.sort((a, b) => {
    const aScore = jars[a.to].length > 0 ? 1 : 0;
    const bScore = jars[b.to].length > 0 ? 1 : 0;
    if (aScore !== bScore) return bScore - aScore;
    return b.count - a.count;
  });
  return moves;
}

// Çözüm hamle listesini döner. Çözüm bulunamazsa (veya limit aşılırsa) null.
export function solve(start: Jars, capacity: number, maxNodes = 200000): Move[] | null {
  if (isSolved(start, capacity)) return [];

  type Frame = { jars: Jars; cands: Move[]; i: number };
  const visited = new Set<string>([stateKey(start)]);
  const stack: Frame[] = [{ jars: start, cands: candidates(start, capacity), i: 0 }];
  const path: Move[] = [];
  let nodes = 0;

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.i >= frame.cands.length) {
      stack.pop();
      path.pop();
      continue;
    }
    const m = frame.cands[frame.i++];
    const result = applyMove(frame.jars, m.from, m.to, capacity);
    if (!result) continue;
    const key = stateKey(result.jars);
    if (visited.has(key)) continue;
    visited.add(key);
    if (++nodes > maxNodes) return null;
    path.push(result.move);
    if (isSolved(result.jars, capacity)) return path.slice();
    stack.push({ jars: result.jars, cands: candidates(result.jars, capacity), i: 0 });
  }
  return null;
}

// İpucu: mevcut durumdan ilk hamle.
export function getHint(jars: Jars, capacity: number): Move | null {
  const solution = solve(jars, capacity);
  if (!solution || solution.length === 0) return null;
  return solution[0];
}