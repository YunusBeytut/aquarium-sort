import type { BiomeDef, DecorDef, FishDef } from '@/game/types';

import biomesJson from './biomes.json';
import decorJson from './decor.json';
import fishJson from './fish.json';

export const FISH = fishJson as unknown as FishDef[];
export const BIOMES = biomesJson as unknown as BiomeDef[];
export const DECOR = decorJson as unknown as DecorDef[];

// Oyuncunun level'ına göre açık biyomların balıkları
export function getUnlockedFish(currentLevel: number): FishDef[] {
    const open = new Set(BIOMES.filter((b) => b.unlockLevel <= currentLevel).map((b) => b.id));
    return FISH.filter((f) => open.has(f.biome));
}