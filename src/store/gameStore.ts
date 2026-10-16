import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { FISH, getUnlockedFish } from '@/data';
import { EGG_PRICE } from '@/game/economy';
import { EggResult, rollEgg } from '@/game/eggs';
import { RewardResult, calcReward } from '@/game/rewards';
import type { EggKind, PlayerState } from '@/game/types';

import { mmkvStorage } from './persist';

// Kayıt şeması değişince artır ve migrate içinde eski kaydı dönüştür.
export const STATE_VERSION = 1;

export const initialPlayer: PlayerState = {
  version: STATE_VERSION,
  currentLevel: 1,
  pearls: 0,
  ownedFish: {},
  ownedDecor: [],
  eggs: { normal: 0, rare: 0 },
  boosters: { undo: 0, extraJar: 0, hint: 0 },
  settings: { sound: true, haptics: true, lang: 'en' },
  noAds: false,
  daily: { lastClaim: '', streak: 0 },
  stats: { levelsPlayed: 0, totalMoves: 0 },
  pity: 0,
};

type Actions = {
  // İlk kez tamamlanan level için ödül verir. Daha önce tamamlanmışsa null döner.
  // hiddenLevel: level gizli balıklıysa ek ödül uygulanır.
  completeLevel: (level: number, moves: number, hiddenLevel?: boolean) => RewardResult | null;
  openEgg: (kind: EggKind) => EggResult | null;
  buyEgg: (kind: EggKind) => boolean;
  updateSettings: (patch: Partial<PlayerState['settings']>) => void;
  resetProgress: () => void;
};

export type GameState = PlayerState & Actions;

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialPlayer,

      completeLevel: (level, moves, hiddenLevel = false) => {
        const s = get();
        if (level < s.currentLevel) return null;

        const reward = calcReward(level, s.ownedFish, FISH, hiddenLevel);
        set({
          currentLevel: level + 1,
          pearls: s.pearls + reward.pearls,
          eggs: reward.egg ? { ...s.eggs, [reward.egg]: s.eggs[reward.egg] + 1 } : s.eggs,
          stats: {
            levelsPlayed: s.stats.levelsPlayed + 1,
            totalMoves: s.stats.totalMoves + moves,
          },
        });
        return reward;
      },

      openEgg: (kind) => {
        const s = get();
        if (s.eggs[kind] <= 0) return null;

        const result = rollEgg(kind, s.pity, s.ownedFish, getUnlockedFish(s.currentLevel));
        if (!result) return null;

        set({
          eggs: { ...s.eggs, [kind]: s.eggs[kind] - 1 },
          ownedFish: result.isNew ? { ...s.ownedFish, [result.fish.id]: 1 } : s.ownedFish,
          pearls: s.pearls + result.duplicatePearls,
          pity: result.pity,
        });
        return result;
      },

      buyEgg: (kind) => {
        const s = get();
        const price = EGG_PRICE[kind];
        if (s.pearls < price) return false;
        set({
          pearls: s.pearls - price,
          eggs: { ...s.eggs, [kind]: s.eggs[kind] + 1 },
        });
        return true;
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetProgress: () => set({ ...initialPlayer }),
    }),
    {
      name: 'aquarium-sort-player',
      storage: createJSONStorage(() => mmkvStorage),
      version: STATE_VERSION,
      // Yalnızca veri alanları kaydedilir, fonksiyonlar değil.
      partialize: (s): PlayerState => ({
        version: s.version,
        currentLevel: s.currentLevel,
        pearls: s.pearls,
        ownedFish: s.ownedFish,
        ownedDecor: s.ownedDecor,
        eggs: s.eggs,
        boosters: s.boosters,
        settings: s.settings,
        noAds: s.noAds,
        daily: s.daily,
        stats: s.stats,
        pity: s.pity,
      }),
      migrate: (persisted) => {
        // Eksik alanlar varsayılanla doldurulur. Sürüm değiştikçe burayı genişlet.
        return { ...initialPlayer, ...(persisted as Partial<PlayerState>), version: STATE_VERSION };
      },
    }
  )
);