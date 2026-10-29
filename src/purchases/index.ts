import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';

import { Analytics } from '@/services/analytics';
import { useGameStore } from '@/store/gameStore';

// RevenueCat panelindeki entitlement ID'si ile aynı olmalı.
export const ENTITLEMENT_NO_ADS = 'no_ads';

// Ürün ID'leri Play Console / RevenueCat'teki ürün ID'leriyle birebir aynı olmalı.
export const NO_ADS_PRODUCT = 'no_ads';

// Tüketilebilir inci paketleri: ürün ID -> verilecek inci. Miktarları ekonomine göre ayarla.
export const PEARL_PACKS: Record<string, number> = {
  pearls_small: 500,
  pearls_medium: 1800,
  pearls_large: 4500,
};

// Public SDK anahtarları (gizli değildir). .env dosyasına yaz:
// EXPO_PUBLIC_RC_ANDROID_KEY=goog_...   EXPO_PUBLIC_RC_IOS_KEY=appl_...
const API_KEY = Platform.select({
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
});

export type StoreItem = {
  id: string;
  pkg: PurchasesPackage;
  priceString: string;
};

export type BuyResult = 'ok' | 'cancelled' | 'pending' | 'error';

// Entitlement durumunu store'daki noAds alanına yansıtır (kaynak: RevenueCat).
function syncEntitlements(info: CustomerInfo) {
  const active = info.entitlements.active[ENTITLEMENT_NO_ADS] !== undefined;
  const { noAds, setNoAds } = useGameStore.getState();
  if (active !== noAds) setNoAds(active);
}

let initPromise: Promise<boolean> | null = null;

// Birden çok yerden çağrılabilir; SDK yalnızca bir kez yapılandırılır.
// Anahtar yoksa ya da web'deyse false döner, oyun etkilenmez.
export function initPurchases(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (Platform.OS === 'web' || !API_KEY) return false;
    try {
      if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey: API_KEY });
      Purchases.addCustomerInfoUpdateListener(syncEntitlements);
      syncEntitlements(await Purchases.getCustomerInfo());
      return true;
    } catch {
      return false;
    }
  })();
  return initPromise;
}

// Mevcut offering'deki bilinen ürünleri ID'ye göre döndürür.
export async function loadStoreItems(): Promise<Record<string, StoreItem>> {
  const items: Record<string, StoreItem> = {};
  try {
    const offerings = await Purchases.getOfferings();
    for (const pkg of offerings.current?.availablePackages ?? []) {
      const id = pkg.product.identifier;
      if (id === NO_ADS_PRODUCT || id in PEARL_PACKS) {
        items[id] = { id, pkg, priceString: pkg.product.priceString };
      }
    }
  } catch {
    // Çevrimdışı ya da offering yok: boş döner, arayüz bölümü gizler.
  }
  return items;
}

export async function buyItem(item: StoreItem): Promise<BuyResult> {
  Analytics.purchaseStart(item.id);
  try {
    const { customerInfo } = await Purchases.purchasePackage(item.pkg);
    const pearls = PEARL_PACKS[item.id];
    if (pearls) useGameStore.getState().addPearls(pearls);
    syncEntitlements(customerInfo);
    Analytics.purchaseComplete(item.id, item.pkg.product.price, item.pkg.product.currencyCode);
    Analytics.setUserProps({ payer: true });
    return 'ok';
  } catch (e) {
    const err = e as PurchasesError;
    if (err.userCancelled) {
      Analytics.purchaseFail(item.id, 'cancelled');
      return 'cancelled';
    }
    if (err.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      Analytics.purchaseFail(item.id, 'pending');
      return 'pending';
    }
    Analytics.purchaseFail(item.id, String(err.code ?? 'error'));
    return 'error';
  }
}

// Yalnızca reklam kaldırma gibi kalıcı satın alımları geri getirir (inci paketleri geri yüklenmez).
export async function restorePurchases(): Promise<boolean> {
  try {
    syncEntitlements(await Purchases.restorePurchases());
    return true;
  } catch {
    return false;
  }
}