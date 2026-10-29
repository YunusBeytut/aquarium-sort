// src/services/analytics.ts
// Firebase Analytics sarmalayıcı (modular API). Tek yerden event yönetimi.
// Firebase hazır değilse (ör. native build eski) çağrılar sessizce atlanır, oyun çökmez.
import {
  getAnalytics,
  logEvent,
  logPurchase,
  logScreenView,
  logTutorialComplete,
  setAnalyticsCollectionEnabled,
  setUserProperty,
} from '@react-native-firebase/analytics';

type Params = Record<string, string | number | boolean>;

const a = () => getAnalytics();

// Her çağrı güvenli çalışır: senkron hata da, promise hatası da yutulur.
const run = (fn: () => unknown) => {
  try {
    const r = fn();
    if (r instanceof Promise) {
      r.catch((e) => {
        if (__DEV__) console.warn('[analytics]', e);
      });
    }
  } catch (e) {
    if (__DEV__) console.warn('[analytics]', e);
  }
};

const log = (name: string, params?: Params) => run(() => logEvent(a(), name, params));

export const Analytics = {
  // --- Kurulum / kullanıcı ---
  init: () => run(() => setAnalyticsCollectionEnabled(a(), true)),
  setUserProps: (p: { level?: number; fishOwned?: number; payer?: boolean }) => {
    if (p.level !== undefined) run(() => setUserProperty(a(), 'max_level', String(p.level)));
    if (p.fishOwned !== undefined) run(() => setUserProperty(a(), 'fish_owned', String(p.fishOwned)));
    if (p.payer !== undefined) run(() => setUserProperty(a(), 'payer', p.payer ? '1' : '0'));
  },

  // --- Retention / onboarding ---
  tutorialStep: (step: number, name: string) => log('tutorial_step', { step, name }),
  tutorialComplete: () => run(() => logTutorialComplete(a())),
  screen: (name: string) =>
    run(() => logScreenView(a(), { screen_name: name, screen_class: name })),

  // --- Seviye ---
  levelStart: (level: number) => log('level_start', { level }),
  levelComplete: (level: number, moves: number, seconds: number, undos = 0) =>
    log('level_complete', { level, moves, seconds, undos }),
  levelFail: (level: number, moves: number, seconds: number) =>
    log('level_fail', { level, moves, seconds }),
  levelRestart: (level: number) => log('level_restart', { level }),

  // --- Ekonomi ---
  eggOpen: (type: 'normal' | 'rare' | 'free', result: 'new' | 'duplicate', rarity: string) =>
    log('egg_open', { type, result, rarity }),
  pearlEarn: (amount: number, source: string) =>
    log('earn_virtual_currency', { virtual_currency_name: 'pearl', value: amount, source }),
  pearlSpend: (amount: number, item: string) =>
    log('spend_virtual_currency', {
      virtual_currency_name: 'pearl',
      value: amount,
      item_name: item,
    }),
  collectionMilestone: (percent: number) => log('collection_milestone', { percent }),

  // --- Günlük seri ---
  dailyClaim: (day: number, streak: number) => log('daily_claim', { day, streak }),

  // --- Booster ---
  boosterUse: (kind: string, level: number) => log('booster_use', { kind, level }),
  refillShown: (kind: string, adReady: boolean) => log('refill_shown', { kind, ad_ready: adReady }),
  refillChoice: (kind: string, choice: 'watch' | 'buy' | 'close') =>
    log('refill_choice', { kind, choice }),

  // --- Reklam ---
  adShown: (type: 'rewarded' | 'interstitial', placement: string) =>
    log('ad_shown', { type, placement }),
  adRewarded: (placement: string) => log('ad_rewarded', { placement }),
  adFailed: (placement: string, reason: 'not_ready' | 'no_reward') =>
    log('ad_failed', { placement, reason }),

  // --- IAP (RevenueCat ile birlikte) ---
  purchaseStart: (productId: string) => log('purchase_start', { product_id: productId }),
  purchaseComplete: (productId: string, value: number, currency: string) =>
    run(() => logPurchase(a(), { value, currency, items: [{ item_id: productId }] })),
  purchaseFail: (productId: string, reason: string) =>
    log('purchase_fail', { product_id: productId, reason }),
};