import type { ImageSourcePropType } from 'react-native';

// OTOMATİK ÜRETİLDİ (FishArt.tsx ve FishSprite şablonları -> webp). Metro statik require ister.
// Burada olmayan balıklar FishSprite'ta eski SVG çizimiyle devam eder.
// Görseller proje kökündeki assets/images/fish/ klasöründe durur.
export const FISH_IMAGES: Record<number, ImageSourcePropType> = {
  0: require('../../../assets/images/fish/fish-0.webp'),
  1: require('../../../assets/images/fish/fish-1.webp'),
  2: require('../../../assets/images/fish/fish-2.webp'),
  3: require('../../../assets/images/fish/fish-3.webp'),
  4: require('../../../assets/images/fish/fish-4.webp'),
  5: require('../../../assets/images/fish/fish-5.webp'),
  6: require('../../../assets/images/fish/fish-6.webp'),
  7: require('../../../assets/images/fish/fish-7.webp'),
  8: require('../../../assets/images/fish/fish-8.webp'),
  9: require('../../../assets/images/fish/fish-9.webp'),
  10: require('../../../assets/images/fish/fish-10.webp'),
  11: require('../../../assets/images/fish/fish-11.webp'),
  12: require('../../../assets/images/fish/fish-12.webp'),
  13: require('../../../assets/images/fish/fish-13.webp'),
  14: require('../../../assets/images/fish/fish-14.webp'),
  15: require('../../../assets/images/fish/fish-15.webp'),
  16: require('../../../assets/images/fish/fish-16.webp'),
  17: require('../../../assets/images/fish/fish-17.webp'),
  18: require('../../../assets/images/fish/fish-18.webp'),
  19: require('../../../assets/images/fish/fish-19.webp'),
};