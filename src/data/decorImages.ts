import type { ImageSourcePropType } from 'react-native';

// Arka plan görselleri statik require ile bağlanır (Metro bunları böyle paketler).
// Dosya yolu: src/data/decorImages.ts -> proje kökündeki assets/images (src içinde değil).
//
// Yeni arka plan eklemek için:
//   1. Görseli assets/images/backgrounds/ altına koy
//   2. src/data/decor.json'a bir satır ekle
//   3. Aşağıya aynı id ile bir require satırı ekle
export const BACKGROUND_IMAGES: Record<string, ImageSourcePropType> = {
  default: require('../../assets/images/puzzle-bg.webp'),
  'bg-50': require('../../assets/images/backgrounds/level50.webp'),
  'bg-100': require('../../assets/images/backgrounds/level100.webp'),
  'bg-150': require('../../assets/images/backgrounds/level150.webp'),
  'bg-coral': require('../../assets/images/backgrounds/coral.webp'),
  'bg-crystal': require('../../assets/images/backgrounds/crystal.webp'),
  'bg-forest': require('../../assets/images/backgrounds/forest.webp'),
  'bg-glacier': require('../../assets/images/backgrounds/glacier.webp'),
};

export function getBackgroundImage(id: string): ImageSourcePropType {
  return BACKGROUND_IMAGES[id] ?? BACKGROUND_IMAGES.default;
}

// Mağaza önizlemeleri için küçük (224x380) sürümler. Tam boyutlu resim yerine bunlar yüklenir,
// böylece mağaza açılınca bellekte onlarca MB'lık arka plan resmi tutulmaz.
// Yeni arka plan eklerken önizlemesini assets/images/backgrounds/thumbs/ altına koyup buraya ekle;
// eklemezsen o arka plan için tam boyutlu resim kullanılır (çalışır ama daha ağır).
export const BACKGROUND_THUMBS: Record<string, ImageSourcePropType> = {
  default: require('../../assets/images/backgrounds/thumbs/default.webp'),
  'bg-50': require('../../assets/images/backgrounds/thumbs/level50.webp'),
  'bg-100': require('../../assets/images/backgrounds/thumbs/level100.webp'),
  'bg-150': require('../../assets/images/backgrounds/thumbs/level150.webp'),
  'bg-coral': require('../../assets/images/backgrounds/thumbs/coral.webp'),
  'bg-crystal': require('../../assets/images/backgrounds/thumbs/crystal.webp'),
  'bg-forest': require('../../assets/images/backgrounds/thumbs/forest.webp'),
  'bg-glacier': require('../../assets/images/backgrounds/thumbs/glacier.webp'),
};

export function getBackgroundThumb(id: string): ImageSourcePropType {
  return BACKGROUND_THUMBS[id] ?? getBackgroundImage(id);
}

// ---------------------------------------------------------------------------
// Akvaryum arka planları: yalnızca akvaryum ekranında kullanılır, yukarıdaki arka planlardan ayrıdır.
// sandTop: görselde kum çizgisinin yukarıdan oranı (balıklar ve aksesuarlar buna göre yerleşir).
// Yeni akvaryum arka planı: görseli assets/images/aquarium/ altına koy, decor.json'a
// kind "aquariumBackground" satırı ekle, buraya aynı id ile bir kayıt ekle.
// ---------------------------------------------------------------------------
type AquariumBg = { source: ImageSourcePropType; thumb: ImageSourcePropType; sandTop: number };

export const AQUARIUM_BACKGROUNDS: Record<string, AquariumBg> = {
  'aq-default': {
    source: require('../../assets/images/aquarium-bg.webp'),
    thumb: require('../../assets/images/aquarium-bg.webp'),
    sandTop: 0.84,
  },
  'aq-pirate': {
    source: require('../../assets/images/aquarium/pirate.webp'),
    thumb: require('../../assets/images/aquarium/thumbs/pirate.webp'),
    sandTop: 0.83,
  },
  'aq-cute': {
    source: require('../../assets/images/aquarium/cute.webp'),
    thumb: require('../../assets/images/aquarium/thumbs/cute.webp'),
    sandTop: 0.84,
  },
  'aq-glacier': {
    source: require('../../assets/images/aquarium/glacier.webp'),
    thumb: require('../../assets/images/aquarium/thumbs/glacier.webp'),
    sandTop: 0.84,
  },
  'aq-night': {
    source: require('../../assets/images/aquarium/night.webp'),
    thumb: require('../../assets/images/aquarium/thumbs/night.webp'),
    sandTop: 0.84,
  },


};

export function getAquariumBackground(id: string): AquariumBg {
  return AQUARIUM_BACKGROUNDS[id] ?? AQUARIUM_BACKGROUNDS['aq-default'];
}

// Akvaryum aksesuarları: kapalı ve açık (dokununca) görsel.
// Yeni aksesuar: assets/images/accessories/ altına iki webp koy, decor.json'a kind "accessory" satırı ekle,
// buraya aynı id ile bir satır ekle.
const SHIP = require('../../assets/images/accessories/ship.webp');
const ANCHOR = require('../../assets/images/accessories/anchor.webp');
const SKULL = require('../../assets/images/accessories/skull.webp');

export const ACCESSORY_IMAGES: Record<string, { closed: ImageSourcePropType; open: ImageSourcePropType }> = {
  'acc-chest': {
    closed: require('../../assets/images/accessories/chest-closed.webp'),
    open: require('../../assets/images/accessories/chest-open.webp'),
  },
  'acc-clam': {
    closed: require('../../assets/images/accessories/clam-closed.webp'),
    open: require('../../assets/images/accessories/clam-open.webp'),
  },
  // Açılıp kapanmayan aksesuarlar: kapalı ve açık aynı görsel.
  'acc-ship': { closed: SHIP, open: SHIP },
  'acc-anchor': { closed: ANCHOR, open: ANCHOR },
  'acc-skull': { closed: SKULL, open: SKULL },
};