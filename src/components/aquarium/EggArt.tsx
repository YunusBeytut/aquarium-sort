import Svg, {
  ClipPath,
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import type { EggKind } from '@/game/types';

// Yumurta çiziminin iç koordinat alanı. Üstüne çatlak gibi katmanlar çizmek istersen
// aynı viewBox'ı kullan: 0 0 EGG_VIEW_W EGG_VIEW_H.
export const EGG_VIEW_W = 100;
export const EGG_VIEW_H = 125;

// Çiziminin genişliği yüksekliğin bu oranıdır (width = size * EGG_ASPECT).
export const EGG_ASPECT = 0.8;

export const EGG_PATH =
  'M50 6 C74 6 92 50 92 80 C92 104 74 119 50 119 C26 119 8 104 8 80 C8 50 26 6 50 6 Z';

const SPARKLE = 'M0 -8 L2.2 -2.2 L8 0 L2.2 2.2 L0 8 L-2.2 2.2 L-8 0 L-2.2 -2.2 Z';

// Yumurta çatlağı (EGG_VIEW koordinatlarında).
export const EGG_CRACK_PATH = 'M50 7 L43 30 L57 46 L42 66 L58 84 L47 106';

export function EggArt({ kind, size }: { kind: EggKind; size: number }) {
  const rare = kind === 'rare';
  const id = `eggArt-${kind}`;
  const c = rare
    ? { top: '#ead9ff', bottom: '#8e5be8', mark: '#ffd54f', dot: '#ffffff' }
    : { top: '#fff6e0', bottom: '#ffc98b', mark: '#7fdbff', dot: '#ff9f80' };

  return (
    <Svg
      width={size * EGG_ASPECT}
      height={size}
      viewBox={`0 0 ${EGG_VIEW_W} ${EGG_VIEW_H}`}
    >
      <Defs>
        <LinearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c.top} />
          <Stop offset="1" stopColor={c.bottom} />
        </LinearGradient>
        <ClipPath id={`${id}-clip`}>
          <Path d={EGG_PATH} />
        </ClipPath>
      </Defs>

      <Path d={EGG_PATH} fill={`url(#${id}-body)`} />

      <G clipPath={`url(#${id}-clip)`}>
        {rare ? (
          <>
            <Path
              d="M0 84 L16 72 L32 84 L48 72 L64 84 L80 72 L100 84"
              stroke={c.mark}
              strokeWidth={7}
              fill="none"
              strokeLinejoin="round"
            />
            <Path
              d="M0 100 L16 88 L32 100 L48 88 L64 100 L80 88 L100 100"
              stroke={c.mark}
              strokeWidth={3.5}
              fill="none"
              strokeLinejoin="round"
              opacity={0.8}
            />
            <Circle cx="38" cy="46" r="3.5" fill={c.dot} opacity={0.85} />
            <Circle cx="62" cy="38" r="2.5" fill={c.dot} opacity={0.85} />
          </>
        ) : (
          <>
            <Circle cx="34" cy="62" r="7" fill={c.mark} opacity={0.9} />
            <Circle cx="66" cy="86" r="9" fill={c.dot} opacity={0.8} />
            <Circle cx="52" cy="40" r="5" fill={c.dot} opacity={0.8} />
            <Circle cx="70" cy="58" r="4" fill={c.mark} opacity={0.9} />
            <Circle cx="30" cy="94" r="5" fill={c.dot} opacity={0.7} />
          </>
        )}
      </G>

      <Ellipse
        cx="34"
        cy="38"
        rx="8"
        ry="15"
        fill="#ffffff"
        opacity={0.4}
        rotation={-18}
        originX={34}
        originY={38}
      />
      <Path d={EGG_PATH} fill="none" stroke="rgba(6,38,61,0.35)" strokeWidth={2.5} />

      {rare && (
        <>
          <G x={90} y={20}>
            <Path d={SPARKLE} fill="#fff8c4" />
          </G>
          <G x={10} y={46}>
            <Path d={SPARKLE} fill="#fff8c4" transform="scale(0.7)" />
          </G>
        </>
      )}
    </Svg>
  );
}

export function PearlIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Defs>
        <RadialGradient id="sharedPearl" cx="35%" cy="30%" r="75%">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.55" stopColor="#d8ecff" />
          <Stop offset="1" stopColor="#9ec9f0" />
        </RadialGradient>
      </Defs>
      <Circle
        cx="10"
        cy="10"
        r="9"
        fill="url(#sharedPearl)"
        stroke="rgba(6,38,61,0.35)"
        strokeWidth={1}
      />
      <Ellipse cx="7" cy="6.5" rx="2.6" ry="1.6" fill="#ffffff" opacity={0.85} />
    </Svg>
  );
}
