export type Jars = number[][];
export type Move = { from: number; to: number; count: number };

export function topGroupSize(jar: number[]): number {
  if (jar.length === 0) return 0;
  const top = jar[jar.length - 1];
  let n = 0;
  for (let i = jar.length - 1; i >= 0 && jar[i] === top; i--) n++;
  return n;
}

// Taşınacak balık sayısı. Hamle geçersizse 0.
export function moveCount(jars: Jars, from: number, to: number, capacity: number): number {
  if (from === to) return 0;
  const src = jars[from];
  const dst = jars[to];
  if (!src || !dst || src.length === 0) return 0;
  const space = capacity - dst.length;
  if (space <= 0) return 0;
  const top = src[src.length - 1];
  if (dst.length > 0 && dst[dst.length - 1] !== top) return 0;
  return Math.min(topGroupSize(src), space);
}

export function canMove(jars: Jars, from: number, to: number, capacity: number): boolean {
  return moveCount(jars, from, to, capacity) > 0;
}

export function applyMove(
  jars: Jars,
  from: number,
  to: number,
  capacity: number
): { jars: Jars; move: Move } | null {
  const count = moveCount(jars, from, to, capacity);
  if (count === 0) return null;
  const next = jars.map((j) => j.slice());
  const moved = next[from].splice(next[from].length - count, count);
  next[to].push(...moved);
  return { jars: next, move: { from, to, count } };
}

// Geri al: hamleyi tersine çevirir.
export function undoMove(jars: Jars, move: Move): Jars {
  const next = jars.map((j) => j.slice());
  const moved = next[move.to].splice(next[move.to].length - move.count, move.count);
  next[move.from].push(...moved);
  return next;
}

export function isJarUniformFull(jar: number[], capacity: number): boolean {
  return jar.length === capacity && jar.every((f) => f === jar[0]);
}

export function isSolved(jars: Jars, capacity: number): boolean {
  return jars.every((j) => j.length === 0 || isJarUniformFull(j, capacity));
}

export function getValidMoves(jars: Jars, capacity: number): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < jars.length; from++) {
    for (let to = 0; to < jars.length; to++) {
      const count = moveCount(jars, from, to, capacity);
      if (count > 0) moves.push({ from, to, count });
    }
  }
  return moves;
}

// Hamleden sonra `from` kavanozunda açık balık kalmadıysa, üstteki grubu aç.
// `jars` hamleden sonraki durumdur. Gizli balık sayısı `hidden[i]` ile tutulur.
export function revealAfterMove(jars: Jars, hidden: number[], from: number): number[] {
  const jar = jars[from];
  if (hidden[from] === 0 || jar.length - hidden[from] > 0) return hidden;
  const next = hidden.slice();
  next[from] = jar.length - topGroupSize(jar);
  return next;
}