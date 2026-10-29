import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { AD_UNIT_IDS } from '@/services/ads';

// Standart banner (320x50) sabit yükseklikte olduğu için reklam yüklenince
// düzen zıplamaz. Reklam gelmese de yer ayrılır.
export const BANNER_HEIGHT = 50;

type Props = {
  // "Reklamları kaldır" satın alındıysa true ver; banner ve ayrılan alan tamamen kalkar
  hidden?: boolean;
};

/**
 * Oyun ekranında skill butonlarının hemen altına koyulur.
 *
 * Nav bar / gesture bar çakışmasını bu bileşen değil, onu saran SafeAreaView çözer
 * (oyun ekranında zaten react-native-safe-area-context SafeAreaView kullanılıyor).
 * Bu yüzden burada ayrıca inset eklenmez, yoksa alt boşluk iki kez hesaplanırdı.
 * Başka bir ekranda SafeAreaView olmadan kullanırsan alt inset'i sen ekle.
 */
export function AdBanner({ hidden = false }: Props) {
  if (hidden) return null;

  return (
    <View style={styles.slot}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={(e) => console.warn('[Ads] banner failed', e)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: BANNER_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});