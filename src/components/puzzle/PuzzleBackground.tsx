import { memo, useMemo, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';

// Görsel proje kökündeki assets/images klasöründe durur (src içinde değil).
// Bu dosya src/components/puzzle/ içinde olduğu için köke 3 seviye çıkılır.
const BG = require('../../../assets/images/puzzle-bg.webp');
const BG_SRC = Image.resolveAssetSource(BG);
const BG_W = BG_SRC?.width || 841;
const BG_H = BG_SRC?.height || 1870;

// Görsel yüklenemezse veya boyut hesaplanana kadar görünen zemin rengi.
const FALLBACK_COLOR = '#0d3b7a';

// Ekranın en arkasına yerleşir, dokunmaları engellemez.
// Kullanım: <View style={{ flex: 1 }}><PuzzleBackground /> ...içerik... </View>
function PuzzleBackgroundBase() {
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
    const scale = Math.max(size.w / BG_W, size.h / BG_H);
    const width = BG_W * scale;
    return {
      width,
      height: BG_H * scale,
      left: (size.w - width) / 2,
    };
  }, [size]);

  return (
    <View pointerEvents="none" style={styles.root} onLayout={onLayout}>
      {img && (
        <Image
          source={BG}
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