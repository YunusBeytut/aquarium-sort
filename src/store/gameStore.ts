import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DECOR, FISH, getUnlockedFish } from '@/data';
import { DAILY_REWARDS, dayKey, effectiveStreak, type DailyReward } from '@/game/daily';
import {
  DEFAULT_AQUARIUM_BACKGROUND_ID,
  DEFAULT_BACKGROUND_ID,
  isDecorUnlocked,
} from '@/game/decor';
import {
  BOOSTER_PRICE,
  FOOD_PACK,
  FOOD_START,
  SHOP_FISH_PRICE,
  START_BOOSTERS,
  eggPrice,
} from '@/game/economy';
import { EggResult, rollEgg } from '@/game/eggs';
import { RewardResult, calcReward } from '@/game/rewards';
import { TUTORIAL_LAST_LEVEL } from '@/game/tutorialLevels';
import type { EggKind, PlayerState } from '@/game/types';
import { Analytics } from '@/services/analytics';

import { mmkvStorage } from './persist';

const MILESTONES = [25, 50, 75, 100];

// Koleksiyon yüzdesi (mağazadaki ilerleme çubuğuyla aynı kural: yalnızca mağaza dışı balıklar).
function collectionPct(owned: Record<number, number>, level: number): number {
  const list = getUnlockedFish(level).filter((f) => !f.storeOnly);
  if (list.length === 0) return 0;
  return Math.floor((list.filter((f) => (owned[f.id] ?? 0) > 0).length / list.length) * 100);
}

// Kayıt şeması değişince artır ve migrate içinde eski kaydı dönüştür.
export const STATE_VERSION = 5;

export const initialPlayer: PlayerState = {
  version: STATE_VERSION,
  currentLevel: 1,
  pearls: 0,
  ownedFish: {},
  ownedDecor: [],
  selectedBackground: DEFAULT_BACKGROUND_ID,
  selectedAquariumBackground: DEFAULT_AQUARIUM_BACKGROUND_ID,
  selectedAccessories: [],
  eggs: { normal: 0, rare: 0 },
  food: FOOD_START,
  boosters: { undo: START_BOOSTERS.undo, extraJar: START_BOOSTERS.extraJar, hint: START_BOOSTERS.hint },
  settings: { sound: true, music: true, haptics: true, lang: 'en' },
  noAds: false,
  tutorialDone: false,
  daily: { lastClaim: '', streak: 0 },
  stats: { levelsPlayed: 0, totalMoves: 0 },
  pity: 0,
  dupStreak: 0,
};

type Actions = {
  // İlk kez tamamlanan level için ödül verir. Daha önce tamamlanmışsa null döner.
  // hiddenLevel: level gizli balıklıysa ek ödül uygulanır.
  completeLevel: (level: number, moves: number, hiddenLevel?: boolean) => RewardResult | null;
  openEgg: (kind: EggKind) => EggResult | null;
  buyEgg: (kind: EggKind) => boolean;
  // Bir yem paketini inciyle alır. İnci yetmezse false döner.
  buyFood: () => boolean;
  // Bir yem harcar. Stok yoksa false döner.
  consumeFood: () => boolean;
  // Mağaza özel canlısını inciyle alır. Sahipse, açık değilse ya da inci yetmezse false döner.
  buyFish: (id: number) => boolean;
  // Açılış levelüne gelmeden dekoru inciyle alır. Zaten açıksa ya da inci yetmezse false döner.
  buyDecor: (id: string) => boolean;
  // Açık bir arka planı seçer ('default' her zaman seçilebilir). Açık değilse false döner.
  selectBackground: (id: string) => boolean;
  // Satın alınmış bir akvaryum arka planını seçer ('aq-default' her zaman seçilebilir). Alınmamışsa false döner.
  selectAquariumBackground: (id: string) => boolean;
  // Sahip olunan aksesuarı akvaryuma koyar ya da kaldırır. Aynı yuvadaki öncekinin yerine geçer.
  toggleAccessory: (id: string) => boolean;
  // Bir yetenek hakkı harcar. Hak yoksa false döner.
  spendBooster: (kind: 'undo' | 'extraJar' | 'hint') => boolean;
  // Ödüllü video sonrası hak ekler.
  addBooster: (kind: 'undo' | 'extraJar' | 'hint', n?: number) => void;
  // İnciyle bir hak alır. İnci yetmezse false döner.
  buyBooster: (kind: 'undo' | 'extraJar' | 'hint') => boolean;
  // Günlük seri ödülünü verir. Bugün zaten alındıysa null döner.
  claimDaily: () => DailyReward | null;
  updateSettings: (patch: Partial<PlayerState['settings']>) => void;
  // Gerçek parayla alınan inciyi ekler (RevenueCat satın alma sonrası).
  addPearls: (n: number) => void;
  // Reklam kaldırma durumunu RevenueCat entitlement'ından günceller.
  setNoAds: (value: boolean) => void;
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
          // Öğreticinin son leveli tamamlanınca öğretici bir daha açılmaz.
          tutorialDone: s.tutorialDone || level >= TUTORIAL_LAST_LEVEL,
          pearls: s.pearls + reward.pearls,
          eggs: reward.egg ? { ...s.eggs, [reward.egg]: s.eggs[reward.egg] + 1 } : s.eggs,
          stats: {
            levelsPlayed: s.stats.levelsPlayed + 1,
            totalMoves: s.stats.totalMoves + moves,
          },
        });
        Analytics.pearlEarn(reward.pearls, 'level');
        Analytics.setUserProps({ level: level + 1 });
        return reward;
      },

      openEgg: (kind) => {
        const s = get();
        if (s.eggs[kind] <= 0) return null;

        const result = rollEgg(
          kind,
          s.pity,
          s.dupStreak,
          s.ownedFish,
          getUnlockedFish(s.currentLevel).filter((f) => !f.storeOnly)
        );
        if (!result) return null;

        set({
          eggs: { ...s.eggs, [kind]: s.eggs[kind] - 1 },
          ownedFish: result.isNew ? { ...s.ownedFish, [result.fish.id]: 1 } : s.ownedFish,
          pearls: s.pearls + result.duplicatePearls,
          pity: result.pity,
          dupStreak: result.dupStreak,
        });
        Analytics.eggOpen(kind, result.isNew ? 'new' : 'duplicate', result.fish.rarity);
        if (result.duplicatePearls > 0) Analytics.pearlEarn(result.duplicatePearls, 'egg_duplicate');
        Analytics.setUserProps({ fishOwned: Object.keys(get().ownedFish).length });
        if (result.isNew) {
          const before = collectionPct(s.ownedFish, s.currentLevel);
          const after = collectionPct({ ...s.ownedFish, [result.fish.id]: 1 }, s.currentLevel);
          MILESTONES.filter((m) => before < m && after >= m).forEach((m) =>
            Analytics.collectionMilestone(m)
          );
        }
        return result;
      },

      buyEgg: (kind) => {
        const s = get();
        const price = eggPrice(kind, s.currentLevel);
        if (s.pearls < price) return false;
        set({
          pearls: s.pearls - price,
          eggs: { ...s.eggs, [kind]: s.eggs[kind] + 1 },
        });
        Analytics.pearlSpend(price, `egg_${kind}`);
        return true;
      },

      buyFood: () => {
        const s = get();
        if (s.pearls < FOOD_PACK.price) return false;
        set({
          pearls: s.pearls - FOOD_PACK.price,
          food: s.food + FOOD_PACK.amount,
        });
        Analytics.pearlSpend(FOOD_PACK.price, 'food');
        return true;
      },

      consumeFood: () => {
        const s = get();
        if (s.food <= 0) return false;
        set({ food: s.food - 1 });
        return true;
      },

      buyFish: (id) => {
        const s = get();
        const def = getUnlockedFish(s.currentLevel).find((f) => f.id === id && f.storeOnly);
        if (!def || (s.ownedFish[id] ?? 0) > 0 || s.pearls < SHOP_FISH_PRICE) return false;
        set({
          pearls: s.pearls - SHOP_FISH_PRICE,
          ownedFish: { ...s.ownedFish, [id]: 1 },
        });
        Analytics.pearlSpend(SHOP_FISH_PRICE, `fish_${id}`);
        return true;
      },

      buyDecor: (id) => {
        const s = get();
        const def = DECOR.find((d) => d.id === id);
        if (!def) return false;
        if (isDecorUnlocked(def, s.ownedDecor, s.currentLevel)) return false;
        if (s.pearls < def.price) return false;
        set({
          pearls: s.pearls - def.price,
          ownedDecor: [...s.ownedDecor, def.id],
        });
        Analytics.pearlSpend(def.price, `decor_${id}`);
        return true;
      },

      selectBackground: (id) => {
        const s = get();
        if (id !== DEFAULT_BACKGROUND_ID) {
          const def = DECOR.find((d) => d.id === id && d.kind === 'background');
          if (!def || !isDecorUnlocked(def, s.ownedDecor, s.currentLevel)) return false;
        }
        set({ selectedBackground: id });
        return true;
      },

      selectAquariumBackground: (id) => {
        const s = get();
        if (id !== DEFAULT_AQUARIUM_BACKGROUND_ID) {
          const def = DECOR.find((d) => d.id === id && d.kind === 'aquariumBackground');
          if (!def || !s.ownedDecor.includes(def.id)) return false;
        }
        set({ selectedAquariumBackground: id });
        return true;
      },

      toggleAccessory: (id) => {
        const s = get();
        const def = DECOR.find((d) => d.id === id && d.kind === 'accessory');
        if (!def || !isDecorUnlocked(def, s.ownedDecor, s.currentLevel)) return false;
        if (s.selectedAccessories.includes(id)) {
          set({ selectedAccessories: s.selectedAccessories.filter((x) => x !== id) });
        } else {
          const rest = s.selectedAccessories.filter(
            (x) => DECOR.find((d) => d.id === x)?.slot !== def.slot
          );
          set({ selectedAccessories: [...rest, id] });
        }
        return true;
      },

      spendBooster: (kind) => {
        const s = get();
        if (s.boosters[kind] <= 0) return false;
        set({ boosters: { ...s.boosters, [kind]: s.boosters[kind] - 1 } });
        Analytics.boosterUse(kind, s.currentLevel);
        return true;
      },

      addBooster: (kind, n = 1) =>
        set((s) => ({ boosters: { ...s.boosters, [kind]: s.boosters[kind] + n } })),

      buyBooster: (kind) => {
        const s = get();
        const price = BOOSTER_PRICE[kind];
        if (s.pearls < price) return false;
        set({
          pearls: s.pearls - price,
          boosters: { ...s.boosters, [kind]: s.boosters[kind] + 1 },
        });
        Analytics.pearlSpend(price, `booster_${kind}`);
        return true;
      },

      claimDaily: () => {
        const s = get();
        const today = dayKey();
        if (s.daily.lastClaim === today) return null;
        // Gün kaçırıldıysa seri sıfırlanmaz, yalnızca bir adım geri düşer.
        const base = effectiveStreak(s.daily, today);
        const reward = DAILY_REWARDS[base % DAILY_REWARDS.length];
        set({
          daily: { lastClaim: today, streak: base + 1 },
          pearls: s.pearls + (reward.pearls ?? 0),
          food: s.food + (reward.food ?? 0),
          boosters: reward.booster
            ? {
                ...s.boosters,
                [reward.booster.kind]: s.boosters[reward.booster.kind] + reward.booster.n,
              }
            : s.boosters,
          eggs: reward.egg ? { ...s.eggs, [reward.egg]: s.eggs[reward.egg] + 1 } : s.eggs,
        });
        Analytics.dailyClaim((base % DAILY_REWARDS.length) + 1, base + 1);
        if (reward.pearls) Analytics.pearlEarn(reward.pearls, 'daily');
        return reward;
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      addPearls: (n) => {
        set((s) => ({ pearls: s.pearls + n }));
        Analytics.pearlEarn(n, 'iap');
      },

      setNoAds: (value) => set({ noAds: value }),

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
        selectedBackground: s.selectedBackground,
        selectedAquariumBackground: s.selectedAquariumBackground,
        selectedAccessories: s.selectedAccessories,
        eggs: s.eggs,
        food: s.food,
        boosters: s.boosters,
        settings: s.settings,
        noAds: s.noAds,
        tutorialDone: s.tutorialDone,
        daily: s.daily,
        stats: s.stats,
        pity: s.pity,
        dupStreak: s.dupStreak,
      }),
      migrate: (persisted) => {
        // Eksik alanlar varsayılanla doldurulur. Sürüm değiştikçe burayı genişlet.
        const p = (persisted ?? {}) as Partial<PlayerState>;
        return {
          ...initialPlayer,
          ...p,
          // Öğretici eklenmeden önce oynamaya başlamış oyuncular öğreticiyi görmez.
          tutorialDone: p.tutorialDone ?? (p.currentLevel ?? 1) > 1,
          // Haklar artık level başına değil kalıcı: eski kayıtlara başlangıç hakkı tamamlanır.
          boosters: {
            ...initialPlayer.boosters,
            ...p.boosters,
            undo: Math.max(p.boosters?.undo ?? 0, START_BOOSTERS.undo),
            extraJar: Math.max(p.boosters?.extraJar ?? 0, START_BOOSTERS.extraJar),
            hint: Math.max(p.boosters?.hint ?? 0, START_BOOSTERS.hint),
          },
          version: STATE_VERSION,
        };
      },
      // Kayıtlı ayarlar eksik alan içeriyorsa (ör. sonradan eklenen "music") varsayılanlarla birleştirilir.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PlayerState>;
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...p.settings },
          // Öğretici eklenmeden önce oynamaya başlamış oyuncular öğreticiyi görmez.
          tutorialDone: p.tutorialDone ?? (p.currentLevel ?? 1) > 1,
        };
      },
    }
  )
);