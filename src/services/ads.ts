import mobileAds, {
  AdEventType,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

import { Analytics } from '@/services/analytics';

// __DEV__ iken her zaman Google'ın test ID'leri kullanılır (kendi reklamına tıklama riski yok).
// Release build'de gerçek ad unit ID'leri kullanılır.
export const AD_UNIT_IDS = {
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-4166860490841357/7743119950',
  rewarded: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-4166860490841357/5621273510',
  banner: __DEV__ ? TestIds.BANNER : 'ca-app-pub-4166860490841357/5113087185',
};

// Kaç level'da bir interstitial gösterilsin
const LEVELS_BETWEEN_INTERSTITIALS = 3;
// İki interstitial arasındaki minimum süre (ms)
const MIN_INTERSTITIAL_GAP_MS = 90_000;
// Yükleme hatasında yeniden deneme süresi (ms)
const RETRY_DELAY_MS = 30_000;

type AdHooks = {
  onAdOpen?: () => void;
  onAdClose?: () => void;
};

class AdManagerClass {
  private initialized = false;
  private adsRemoved = false;
  private levelsSinceAd = 0;
  private lastInterstitialAt = 0;
  private hooks: AdHooks = {};

  private interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
  private rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
  private interstitialLoaded = false;
  private rewardedLoaded = false;

  /**
   * Uygulama açılışında bir kez çağır.
   * hooks: reklam açılınca müziği durdurmak, kapanınca devam ettirmek için.
   */
  async init(hooks: AdHooks = {}) {
    if (this.initialized) return;
    this.initialized = true;
    this.hooks = hooks;

    try {
      await mobileAds().initialize();
    } catch (e) {
      console.warn('[Ads] init failed', e);
      return;
    }

    this.setupInterstitial();
    this.setupRewarded();
    this.interstitial.load();
    this.rewarded.load();
  }

  // RevenueCat'te "reklamları kaldır" satın alımı olursa buradan kapat/aç
  setAdsRemoved(value: boolean) {
    this.adsRemoved = value;
  }

  get isAdsRemoved() {
    return this.adsRemoved;
  }

  private setupInterstitial() {
    this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
      this.interstitialLoaded = true;
    });
    this.interstitial.addAdEventListener(AdEventType.OPENED, () => {
      this.hooks.onAdOpen?.();
    });
    this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      this.interstitialLoaded = false;
      this.hooks.onAdClose?.();
      this.interstitial.load();
    });
    this.interstitial.addAdEventListener(AdEventType.ERROR, (e) => {
      console.warn('[Ads] interstitial error', e);
      this.interstitialLoaded = false;
      setTimeout(() => this.interstitial.load(), RETRY_DELAY_MS);
    });
  }

  private setupRewarded() {
    this.rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      this.rewardedLoaded = true;
    });
    this.rewarded.addAdEventListener(AdEventType.OPENED, () => {
      this.hooks.onAdOpen?.();
    });
    this.rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      this.rewardedLoaded = false;
      this.hooks.onAdClose?.();
      this.rewarded.load();
    });
    this.rewarded.addAdEventListener(AdEventType.ERROR, (e) => {
      console.warn('[Ads] rewarded error', e);
      this.rewardedLoaded = false;
      setTimeout(() => this.rewarded.load(), RETRY_DELAY_MS);
    });
  }

  /**
   * Level bittiğinde çağır. Sıra gelmişse, aralık dolmuşsa ve reklam hazırsa gösterir.
   * Dönüş değeri: reklam gösterildi mi.
   */
  maybeShowInterstitialAfterLevel(): boolean {
    if (this.adsRemoved) return false;

    this.levelsSinceAd += 1;
    if (this.levelsSinceAd < LEVELS_BETWEEN_INTERSTITIALS) return false;
    if (Date.now() - this.lastInterstitialAt < MIN_INTERSTITIAL_GAP_MS) return false;
    if (!this.interstitialLoaded) return false;

    this.levelsSinceAd = 0;
    this.lastInterstitialAt = Date.now();
    this.interstitial.show();
    Analytics.adShown('interstitial', 'level_end');
    return true;
  }

  get isRewardedReady() {
    return this.rewardedLoaded;
  }

  /**
   * Ödüllü reklam gösterir. Kullanıcı ödülü kazandıysa true döner.
   * Reklam hazır değilse hemen false döner.
   */
  showRewarded(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.rewardedLoaded) {
        resolve(false);
        return;
      }

      let earned = false;
      const unsubEarned = this.rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          earned = true;
        }
      );
      const unsubClosed = this.rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        unsubEarned();
        unsubClosed();
        resolve(earned);
      });

      this.rewarded.show();
    });
  }
}

export const AdManager = new AdManagerClass();