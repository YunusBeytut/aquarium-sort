import type { BiomeDef, FishDef } from '@/game/types';

import biomesJson from './biomes.json';
import fishJson from './fish.json';

export const FISH = fishJson as unknown as FishDef[];
export const BIOMES = biomesJson as unknown as BiomeDef[];

// Oyuncunun level'ına göre açık biyomların balıkları
export function getUnlockedFish(currentLevel: number): FishDef[] {
    const open = new Set(BIOMES.filter((b) => b.unlockLevel <= currentLevel).map((b) => b.id));
    return FISH.filter((f) => open.has(f.biome));
}