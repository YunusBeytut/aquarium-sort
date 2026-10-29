import { Circle, ClipPath, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { Art } from './FishArt';

// 19 Dragon Arowana (efsanevi). viewBox 0 0 60 40, balık sağa bakar.
// FishArt.tsx'teki ART kaydına eklenir (bkz. EKLE.md). Kuyruk parametreleri FishSprite'ta animasyonlanır.

function Eye({ x, y, r, iris }: { x: number; y: number; r: number; iris: string }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={r} fill={iris} />
      <Circle cx={x + r * 0.12} cy={y} r={r * 0.68} fill="#10131c" />
      <Circle cx={x + r * 0.38} cy={y - r * 0.38} r={r * 0.27} fill="#ffffff" />
      <Circle cx={x - r * 0.25} cy={y + r * 0.32} r={r * 0.12} fill="#ffffff" opacity={0.7} />
    </G>
  );
}

export const arowana: Art = {
  tail: { bx: 16.2, cy: 20.6, tip: 3, spread: 8.8, fork: -4, fill: '#ef4a2c', stroke: '#7a1030', rays: 5, rayColor: '#7a1030' },
  defs: (
    <>
      <LinearGradient id="ar-b" x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor="#06453f"/>
      <Stop offset="0.3" stopColor="#0f8f6c"/>
      <Stop offset="0.62" stopColor="#5fd9a0"/>
      <Stop offset="1" stopColor="#fff0b8"/>
      </LinearGradient>
      <LinearGradient id="ar-h" x1="1" y1="0" x2="0" y2="0">
      <Stop offset="0" stopColor="#ff5a2a" stopOpacity={0}/>
      <Stop offset="0.45" stopColor="#ff6a2a" stopOpacity={0.12}/>
      <Stop offset="1" stopColor="#ff4a22" stopOpacity={0.62}/>
      </LinearGradient>
      <LinearGradient id="ar-f" x1="0" y1="0" x2="1" y2="0">
      <Stop offset="0" stopColor="#e5243b"/>
      <Stop offset="1" stopColor="#ffb42e"/>
      </LinearGradient>
      <ClipPath id="ar-c"><Path d="M57.6 17.4 C56 15.4 52 13.2 46 12.6 C38 12 28 13.2 20.5 15.6 C17.4 16.6 15 18.3 14.4 20.2 C15 22 17.4 23.8 20.5 25.2 C28 28.6 38 31.2 45 30.6 C51 30 55 26.2 57 22.6 C57.9 21 58 19 57.6 17.4 Z"/></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M37 12.5 C31 8.6 21.5 9.2 13.5 14.8 C12.9 15.4 13.1 16.1 14 16.4 C22 14.6 29.5 13.2 37 12.5 Z" fill="url(#ar-f)" stroke="#7a1030" strokeWidth={0.8} strokeLinejoin="round"/>
      <Path d="M34 12.2 L30.5 10 M30 12.6 L25.5 10.4 M26 13.2 L20.5 11.8 M22 14 L16.5 13.8" stroke="#7a1030" strokeWidth={0.4} opacity={0.5} fill="none"/>
      <Path d="M42 30.7 C36 35.2 25 34.6 14.5 26.2 C13.9 25.6 14.1 25 15 24.8 C23 27.6 32 29.8 42 30.7 Z" fill="url(#ar-f)" stroke="#7a1030" strokeWidth={0.8} strokeLinejoin="round"/>
      <Path d="M39 30.5 L35.5 33.4 M35 30 L30.5 33.6 M31 29.2 L25.5 32.4 M27 28.2 L21 30.6 M23 26.8 L17.5 28" stroke="#7a1030" strokeWidth={0.4} opacity={0.5} fill="none"/>
      <Path d="M57.6 17.4 C56 15.4 52 13.2 46 12.6 C38 12 28 13.2 20.5 15.6 C17.4 16.6 15 18.3 14.4 20.2 C15 22 17.4 23.8 20.5 25.2 C28 28.6 38 31.2 45 30.6 C51 30 55 26.2 57 22.6 C57.9 21 58 19 57.6 17.4 Z" fill="url(#ar-b)" stroke="#053b3a" strokeWidth={0.9}/>
      <G clipPath="url(#ar-c)">
      <Rect x={14} y={10} width={44} height={24} fill="url(#ar-h)"/>
      <Path d="M17.5 14.3 q-1.7 1.55 0 3.1 M21.2 14.3 q-1.7 1.55 0 3.1 M24.9 14.3 q-1.7 1.55 0 3.1 M28.6 14.3 q-1.7 1.55 0 3.1 M32.3 14.3 q-1.7 1.55 0 3.1 M36.0 14.3 q-1.7 1.55 0 3.1 M39.7 14.3 q-1.7 1.55 0 3.1 M43.4 14.3 q-1.7 1.55 0 3.1 M47.1 14.3 q-1.7 1.55 0 3.1 M50.8 14.3 q-1.7 1.55 0 3.1 M19.4 17.4 q-1.7 1.55 0 3.1 M23.1 17.4 q-1.7 1.55 0 3.1 M26.8 17.4 q-1.7 1.55 0 3.1 M30.4 17.4 q-1.7 1.55 0 3.1 M34.1 17.4 q-1.7 1.55 0 3.1 M37.9 17.4 q-1.7 1.55 0 3.1 M41.6 17.4 q-1.7 1.55 0 3.1 M45.3 17.4 q-1.7 1.55 0 3.1 M49.0 17.4 q-1.7 1.55 0 3.1 M17.5 20.5 q-1.7 1.55 0 3.1 M21.2 20.5 q-1.7 1.55 0 3.1 M24.9 20.5 q-1.7 1.55 0 3.1 M28.6 20.5 q-1.7 1.55 0 3.1 M32.3 20.5 q-1.7 1.55 0 3.1 M36.0 20.5 q-1.7 1.55 0 3.1 M39.7 20.5 q-1.7 1.55 0 3.1 M43.4 20.5 q-1.7 1.55 0 3.1 M47.1 20.5 q-1.7 1.55 0 3.1 M50.8 20.5 q-1.7 1.55 0 3.1 M19.4 23.6 q-1.7 1.55 0 3.1 M23.1 23.6 q-1.7 1.55 0 3.1 M26.8 23.6 q-1.7 1.55 0 3.1 M30.4 23.6 q-1.7 1.55 0 3.1 M34.1 23.6 q-1.7 1.55 0 3.1 M37.9 23.6 q-1.7 1.55 0 3.1 M41.6 23.6 q-1.7 1.55 0 3.1 M45.3 23.6 q-1.7 1.55 0 3.1 M49.0 23.6 q-1.7 1.55 0 3.1 M17.5 26.7 q-1.7 1.55 0 3.1 M21.2 26.7 q-1.7 1.55 0 3.1 M24.9 26.7 q-1.7 1.55 0 3.1 M28.6 26.7 q-1.7 1.55 0 3.1 M32.3 26.7 q-1.7 1.55 0 3.1 M36.0 26.7 q-1.7 1.55 0 3.1 M39.7 26.7 q-1.7 1.55 0 3.1 M43.4 26.7 q-1.7 1.55 0 3.1 M47.1 26.7 q-1.7 1.55 0 3.1 M50.8 26.7 q-1.7 1.55 0 3.1 " stroke="#053b3a" strokeWidth={0.55} opacity={0.3} fill="none" strokeLinecap="round"/>
      <Path d="M17.5 14.0 q-1.7 1.55 0 3.1 M21.2 14.0 q-1.7 1.55 0 3.1 M24.9 14.0 q-1.7 1.55 0 3.1 M28.6 14.0 q-1.7 1.55 0 3.1 M32.3 14.0 q-1.7 1.55 0 3.1 M36.0 14.0 q-1.7 1.55 0 3.1 M39.7 14.0 q-1.7 1.55 0 3.1 M43.4 14.0 q-1.7 1.55 0 3.1 M47.1 14.0 q-1.7 1.55 0 3.1 M50.8 14.0 q-1.7 1.55 0 3.1 M19.4 17.1 q-1.7 1.55 0 3.1 M23.1 17.1 q-1.7 1.55 0 3.1 M26.8 17.1 q-1.7 1.55 0 3.1 M30.4 17.1 q-1.7 1.55 0 3.1 M34.1 17.1 q-1.7 1.55 0 3.1 M37.9 17.1 q-1.7 1.55 0 3.1 M41.6 17.1 q-1.7 1.55 0 3.1 M45.3 17.1 q-1.7 1.55 0 3.1 M49.0 17.1 q-1.7 1.55 0 3.1 M17.5 20.2 q-1.7 1.55 0 3.1 M21.2 20.2 q-1.7 1.55 0 3.1 M24.9 20.2 q-1.7 1.55 0 3.1 M28.6 20.2 q-1.7 1.55 0 3.1 M32.3 20.2 q-1.7 1.55 0 3.1 M36.0 20.2 q-1.7 1.55 0 3.1 M39.7 20.2 q-1.7 1.55 0 3.1 M43.4 20.2 q-1.7 1.55 0 3.1 M47.1 20.2 q-1.7 1.55 0 3.1 M50.8 20.2 q-1.7 1.55 0 3.1 M19.4 23.3 q-1.7 1.55 0 3.1 M23.1 23.3 q-1.7 1.55 0 3.1 M26.8 23.3 q-1.7 1.55 0 3.1 M30.4 23.3 q-1.7 1.55 0 3.1 M34.1 23.3 q-1.7 1.55 0 3.1 M37.9 23.3 q-1.7 1.55 0 3.1 M41.6 23.3 q-1.7 1.55 0 3.1 M45.3 23.3 q-1.7 1.55 0 3.1 M49.0 23.3 q-1.7 1.55 0 3.1 M17.5 26.4 q-1.7 1.55 0 3.1 M21.2 26.4 q-1.7 1.55 0 3.1 M24.9 26.4 q-1.7 1.55 0 3.1 M28.6 26.4 q-1.7 1.55 0 3.1 M32.3 26.4 q-1.7 1.55 0 3.1 M36.0 26.4 q-1.7 1.55 0 3.1 M39.7 26.4 q-1.7 1.55 0 3.1 M43.4 26.4 q-1.7 1.55 0 3.1 M47.1 26.4 q-1.7 1.55 0 3.1 M50.8 26.4 q-1.7 1.55 0 3.1 " stroke="#ffd96a" strokeWidth={0.6} opacity={0.9} fill="none" strokeLinecap="round"/>
      <Path d="M16 20.6 C27 21.2 40 21.2 53 20.6" stroke="#fff3b0" strokeWidth={0.5} opacity={0.5} fill="none"/>
      <Ellipse cx={34} cy={14.6} rx={13} ry={1.4} fill="#ffffff" opacity={0.28}/>
      <Path d="M46.4 12.8 C50.6 16.6 50.6 26 46 30.6 C52 30 55.4 26.4 57 22.6 C57.9 21 58 19 57.6 17.4 C56 15.4 52 13.2 46.4 12.8 Z" fill="#ffd54f" opacity={0.2}/>
      </G>
      <Path d="M46.4 12.8 C50.2 16.8 50.2 25.8 46 30.4" stroke="#053b3a" strokeWidth={0.7} opacity={0.65} fill="none"/>
      <Path d="M47.8 13.4 C51.2 17 51.2 25 47.4 29.6" stroke="#ffd54f" strokeWidth={0.45} opacity={0.7} fill="none"/>
      <Path d="M45.5 24.2 C41 23.4 36.8 25.6 34.6 30.6 C39 30.4 43.4 28.4 45.5 24.2 Z" fill="url(#ar-f)" stroke="#7a1030" strokeWidth={0.7} strokeLinejoin="round" opacity={0.96}/>
      <Path d="M45 25 L38.5 28.8 M44 26 L40.5 29.8" stroke="#7a1030" strokeWidth={0.4} opacity={0.5} fill="none"/>
      <Path d="M56.6 22.6 Q59 24.8 57.4 28 M55 23.6 Q57.2 26.6 55.2 29.4" stroke="#053b3a" strokeWidth={1.4} strokeLinecap="round" fill="none"/>
      <Path d="M56.6 22.6 Q59 24.8 57.4 28 M55 23.6 Q57.2 26.6 55.2 29.4" stroke="#ffd54f" strokeWidth={0.65} strokeLinecap="round" fill="none"/>
      <Path d="M57.7 19.4 L52.6 22.2" stroke="#053b3a" strokeWidth={0.7} strokeLinecap="round" fill="none"/>
      <Eye x={53.2} y={17.6} r={2.6} iris="#ffd166" />
    </>
  ),
};
