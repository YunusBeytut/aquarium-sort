import '@/i18n';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { FishLoader } from '@/components/ui/FishLoader';
import { SoundManager } from '@/audio/SoundManager';
import { AdManager } from '@/services/ads';
import { Analytics } from '@/services/analytics';

const BG = '#0b3d5c';

// Sistem splash'i FishLoader ilk çizilene kadar açık kalır, sonra kapanır (aynı zemin rengi: geçiş fark edilmez).
SplashScreen.preventAutoHideAsync().catch(() => {});
let splashHidden = false;
function hideSplash() {
  if (splashHidden) return;
  splashHidden = true;
  requestAnimationFrame(() => SplashScreen.hideAsync().catch(() => {}));
}

export default function RootLayout() {
  // Reklam SDK'sı uygulama açılışında bir kez başlatılır.
  // Tam ekran reklam açılınca müzik durur, kapanınca devam eder.
  useEffect(() => {
    void Analytics.init();
    void AdManager.init({
      onAdOpen: () => SoundManager.pauseForAd(),
      onAdClose: () => SoundManager.resumeAfterAd(),
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: BG }} onLayout={hideSplash}>
      <StatusBar style="light" />
      {/* Ekranlar hazır olana kadar (geçişte) arkadan bu yükleme görünür. */}
      <FishLoader fullscreen />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="play/[level]" options={{ animation: 'fade' }} />
      </Stack>
    </View>
  );
}