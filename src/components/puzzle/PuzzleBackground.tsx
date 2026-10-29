import { memo, useMemo, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { DECOR } from '@/data';
import { getBackgroundImage } from '@/data/decorImages';
import { resolveBackgroundId } from '@/game/decor';
import { useGameStore } from '@/store/gameStore';

// Görseller proje kökündeki assets/images klasöründe durur (src içinde değil).
// Hangi görselin kullanılacağı oyuncunun seçtiği arka plana göre belirlenir
// (varsayılan: assets/images/puzzle-bg.webp, diğerleri: src/data/decorImages.ts).
// Boyut okunamazsa varsayılan görselin boyutu kullanılır.
const FALLBACK_W = 841;
const FALLBACK_H = 1870;

// Görsel yüklenemezse veya boyut hesaplanana kadar görünen zemin rengi.
const FALLBACK_COLOR = '#0d3b7a';

// Ekranın en arkasına yerleşir, dokunmaları engellemez.
// Kullanım: <View style={{ flex: 1 }}><PuzzleBackground /> ...içerik... </View>
function PuzzleBackgroundBase() {
  const selected = useGameStore((s) => s.selectedBackground);
  const ownedDecor = useGameStore((s) => s.ownedDecor);
  const currentLevel = useGameStore((s) => s.currentLevel);

  const backgroundId = resolveBackgroundId(selected, DECOR, ownedDecor, currentLevel);
  const source = getBackgroundImage(backgroundId);

  const natural = useMemo(() => {
    const resolved = Image.resolveAssetSource(source);
    return { w: resolved?.width || FALLBACK_W, h: resolved?.height || FALLBACK_H };
  }, [source]);

  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
  };

  // "cover" gibi ölçeklenir ama alta sabitlenir: deniz tabanı her ekran oranında altta kalır,
  // fazlalık üstten ve yanlardan kırpılır.
  const img = useMemo(() => {
    if (!size.w || !size.h) return null;
    const scale = Math.max(size.w / natural.w, size.h / natural.h);
    const width = natural.w * scale;
    return {
      width,
      height: natural.h * scale,
      left: (size.w - width) / 2,
    };
  }, [size, natural]);

  return (
    <View pointerEvents="none" style={styles.root} onLayout={onLayout}>
      {img && (
        <Image
          source={source}
          fadeDuration={0}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            left: img.left,
            bottom: 0,
            width: img.width,
            height: img.height,
          }}
        />
      )}
    </View>
  );
}

export const PuzzleBackground = memo(PuzzleBackgroundBase);
export default PuzzleBackground;

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: FALLBACK_COLOR,
  },
});