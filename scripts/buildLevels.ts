// Kullanım: npx tsx scripts/buildLevels.ts [sonLevel]
// Levelleri önceden üretip src/game/levels.json dosyasına yazar.
import { writeFileSync } from 'fs';
import { join } from 'path';

import { generateLevel } from '../src/game/levelGenerator';

const last = Number(process.argv[2]) || 500;
const out: ReturnType<typeof generateLevel>[] = [];
const t0 = Date.now();

for (let level = 1; level <= last; level++) {
  out.push(generateLevel(level));
}

writeFileSync(join(__dirname, '../src/game/levels.json'), JSON.stringify(out));
console.log(`${out.length} level yazıldı, ${((Date.now() - t0) / 1000).toFixed(1)} sn`);