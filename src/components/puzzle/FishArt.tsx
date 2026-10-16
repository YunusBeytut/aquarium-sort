import type { ReactNode } from 'react';
import { Circle, ClipPath, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

// 12 türün el yapımı çizimi. viewBox 0 0 60 40, balık sağa bakar.
// Kuyruk FishSprite'ta ayrı çizilir (animasyon için), burada yalnızca parametreleri tutulur.

export type TailSpec = {
  bx: number; // kuyruk bağlantı x
  cy: number;
  tip: number; // kuyruk ucu x
  spread: number; // açıklık
  fork: number; // + çatallı, - yuvarlak yelpaze
  fill: string;
  stroke: string;
  opacity?: number;
  rays?: number;
  rayColor?: string;
};

export type Art = { tail: TailSpec; defs: ReactNode; body: ReactNode };

export function tailPath(s: TailSpec, w: number): string {
  'worklet';
  const mx = (s.bx + s.tip) / 2;
  const top = s.cy - s.spread + w;
  const bot = s.cy + s.spread + w;
  return `M${s.bx} ${s.cy} Q${mx} ${s.cy - s.spread * 0.55} ${s.tip} ${top} Q${s.tip + s.fork} ${s.cy + w * 0.6} ${s.tip} ${bot} Q${mx} ${s.cy + s.spread * 0.55} ${s.bx} ${s.cy} Z`;
}

export function tailRays(s: TailSpec, w: number): string {
  'worklet';
  const n = s.rays || 0;
  const top = s.cy - s.spread + w;
  const bot = s.cy + s.spread + w;
  let d = '';
  for (let i = 1; i <= n; i++) {
    const f = i / (n + 1);
    const g = 2 * f * (1 - f);
    const x = s.tip + g * s.fork;
    const y = (1 - f) * (1 - f) * top + g * (s.cy + w * 0.6) + f * f * bot;
    d += `M${s.bx} ${s.cy} L${x} ${y} `;
  }
  return d;
}

const OL = 0.9;

const grad = (id: string, top: string, mid: string, bot: string) => (
  <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <Stop offset="0" stopColor={top} />
    <Stop offset="0.5" stopColor={mid} />
    <Stop offset="1" stopColor={bot} />
  </LinearGradient>
);

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

function scaleArcs(x0: number, x1: number, y0: number, y1: number, dx: number, dy: number, r: number) {
  let d = '';
  let row = 0;
  for (let y = y0; y <= y1; y += dy, row++) {
    for (let x = x0 + (row % 2) * (dx / 2); x <= x1; x += dx) d += `M${x} ${y} q${r} ${dy / 2} 0 ${dy} `;
  }
  return d;
}

function dotGrid(x0: number, x1: number, y0: number, y1: number, dx: number, dy: number) {
  let d = '';
  let row = 0;
  for (let y = y0; y <= y1; y += dy, row++) {
    for (let x = x0 + (row % 2) * (dx / 2); x <= x1; x += dx) d += `M${x} ${y} h0.01 `;
  }
  return d;
}

// ───────────────────────── 0 Clownfish ─────────────────────────
const CF = 'M52 21.5 C52 13 42 8 31 8.5 C22 9 16.5 14 16 20 C16.5 26.5 22 31.5 31 32 C42 32.5 52 29 52 21.5 Z';
const clownfish: Art = {
  tail: { bx: 19, cy: 20, tip: 5, spread: 8.5, fork: -3.5, fill: '#ff8a2a', stroke: '#17120f', rays: 3, rayColor: '#17120f' },
  defs: (
    <>
      {grad('cf-b', '#e8530e', '#ff7a1c', '#ffb25a')}
      <ClipPath id="cf-c"><Path d={CF} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M24 10 C26 2.5 36 1.5 43 8.5 C36 7 29 7.5 24 10 Z" fill="#ff7a1c" stroke="#17120f" strokeWidth={OL} strokeLinejoin="round" />
      <Path d="M27 30.5 C28 36.5 34 37.5 39 31.5 Z" fill="#ff7a1c" stroke="#17120f" strokeWidth={OL} strokeLinejoin="round" />
      <Path d={CF} fill="url(#cf-b)" stroke="#a63a00" strokeWidth={OL} />
      <G clipPath="url(#cf-c)">
        <Path d="M37.5 6 C40.5 14 40.5 26 37.5 34 L43.5 34 C46 26 46 14 43 6 Z" fill="#fffaf0" stroke="#17120f" strokeWidth={OL} />
        <Path d="M23 6 C26 14 26.5 26 24 34 L29.5 34 C31.5 26 31 14 28.5 6 Z" fill="#fffaf0" stroke="#17120f" strokeWidth={OL} />
        <Path d="M14 6 L18.5 6 L18.5 34 L14 34 Z" fill="#fffaf0" stroke="#17120f" strokeWidth={OL} />
        <Ellipse cx={33} cy={12.5} rx={10} ry={2.2} fill="#ffffff" opacity={0.25} />
      </G>
      <Path d="M36 21 C32.5 20 30.5 24 32.5 27.5 C35.5 27 37.5 24.5 36 21 Z" fill="#ff9a3d" stroke="#a63a00" strokeWidth={0.6} />
      <Path d="M52 21.5 L49.2 22.6" stroke="#7a2800" strokeWidth={0.7} strokeLinecap="round" />
      <Eye x={46.6} y={17.4} r={3.1} iris="#ffe3a3" />
    </>
  ),
};

// ───────────────────────── 1 Blue Tang ─────────────────────────
const BT = 'M54 22 C52.5 14 44.5 6.5 31.5 6.5 C21.5 6.5 14.5 12.5 14 20 C14.5 27.5 21.5 33.5 31.5 33.5 C44.5 33.5 52.5 30 54 22 Z';
const blueTang: Art = {
  tail: { bx: 16, cy: 20, tip: 3, spread: 11, fork: 6, fill: '#ffd21f', stroke: '#14143a', rays: 3, rayColor: '#b8860b' },
  defs: (
    <>
      {grad('bt-b', '#1440c0', '#2a76ff', '#6fb0ff')}
      <ClipPath id="bt-c"><Path d={BT} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M20 9 C26 3 39 3 46 8.5 C38 7 28 7.5 20 9 Z" fill="#1f5cf0" stroke="#10163a" strokeWidth={OL} strokeLinejoin="round" />
      <Path d="M21 31.5 C27 37.5 39 37.5 46 32 C38 33 28 32.5 21 31.5 Z" fill="#1f5cf0" stroke="#10163a" strokeWidth={OL} strokeLinejoin="round" />
      <Path d={BT} fill="url(#bt-b)" stroke="#10163a" strokeWidth={OL} />
      <G clipPath="url(#bt-c)">
        <Path d="M42 9.2 C33 6.8 24 10.5 19 18 C15.5 23.5 17 28.5 23 31 C21 25.5 22.5 20.5 26.5 17.5 C30.5 14.8 36 14.6 41 15.6 C44.5 14.8 44.5 10.8 42 9.2 Z" fill="#0a0d24" />
        <Path d="M29.5 22.5 C32.5 20 38.5 20.5 38.5 25 C38.5 29.5 32 30 29.5 27 Z" fill="#0a0d24" />
        <Ellipse cx={34} cy={11.5} rx={9} ry={1.6} fill="#ffffff" opacity={0.22} />
      </G>
      <Path d="M40.5 24 C36.5 23 34.5 27.5 36.5 31 C39.5 30.5 41.5 27.5 40.5 24 Z" fill="#ffd21f" stroke="#14143a" strokeWidth={0.6} />
      <Path d="M54 22 L51.4 23" stroke="#0a0d24" strokeWidth={0.7} strokeLinecap="round" />
      <Eye x={47.2} y={16.8} r={3} iris="#bcd6ff" />
    </>
  ),
};

// ───────────────────────── 2 Yellow Tang ─────────────────────────
const YT = 'M57.5 22 C53 20.5 50 14 42 10 C35 6.5 25 7 19 12 C15.5 15 14 18.5 14 20.5 C14.5 23 15.5 25.5 19 29 C25 33.5 35 34 42 31 C50 28 53 23.5 57.5 22 Z';
const yellowTang: Art = {
  tail: { bx: 15, cy: 20.5, tip: 6, spread: 8, fork: 3, fill: '#ffe21a', stroke: '#b38800', rays: 3, rayColor: '#b38800' },
  defs: (
    <>
      {grad('yt-b', '#ffc800', '#ffe51a', '#fff384')}
      <ClipPath id="yt-c"><Path d={YT} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M19 12.5 C24 4.5 38 4 47.5 10.5 C39 8.8 28 9 19 12.5 Z" fill="#ffd700" stroke="#b38800" strokeWidth={OL} strokeLinejoin="round" />
      <Path d="M21 29 C26 35.5 38 36 46 30.5 C38 32 28 31.5 21 29 Z" fill="#ffd700" stroke="#b38800" strokeWidth={OL} strokeLinejoin="round" />
      <Path d={YT} fill="url(#yt-b)" stroke="#b38800" strokeWidth={OL} />
      <G clipPath="url(#yt-c)">
        <Ellipse cx={33} cy={12} rx={11} ry={2.2} fill="#ffffff" opacity={0.35} />
        <Ellipse cx={30} cy={28} rx={10} ry={2} fill="#ffffff" opacity={0.25} />
      </G>
      <Path d="M16.5 19.2 L22 20.5 L16.5 22 Z" fill="#ffffff" stroke="#d9b800" strokeWidth={0.35} strokeLinejoin="round" />
      <Path d="M42 24 C38 23.5 36 27 38 30 C41 29.5 43 27 42 24 Z" fill="#fff7a8" stroke="#b38800" strokeWidth={0.6} />
      <Path d="M57.5 22 L54.5 22.4" stroke="#7a5a00" strokeWidth={0.7} strokeLinecap="round" />
      <Eye x={48.2} y={16.6} r={2.8} iris="#ff9a1f" />
    </>
  ),
};

// ───────────────────────── 3 Guppy ─────────────────────────
const GP = 'M51 21.5 C51 16.5 45 13.5 38 13.5 C32 13.5 28.5 15 25.5 18 L23 20.5 L25.5 23 C28.5 26.5 32 28.5 38 28.5 C45 28.5 51 26.5 51 21.5 Z';
const guppy: Art = {
  tail: { bx: 25, cy: 20.5, tip: 2, spread: 17, fork: -6, fill: 'url(#gp-t)', stroke: '#6a1b6e', rays: 6, rayColor: '#ffffff' },
  defs: (
    <>
      {grad('gp-b', '#13a0b8', '#3fd2e4', '#c5f4f8')}
      <LinearGradient id="gp-t" x1="1" y1="0" x2="0" y2="0">
        <Stop offset="0" stopColor="#26c6da" />
        <Stop offset="0.35" stopColor="#5d6cff" />
        <Stop offset="0.7" stopColor="#ec407a" />
        <Stop offset="1" stopColor="#ff9a3d" />
      </LinearGradient>
      <LinearGradient id="gp-o" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#ff4f9a" stopOpacity={0.7} />
        <Stop offset="0.55" stopColor="#ff4f9a" stopOpacity={0} />
      </LinearGradient>
      <ClipPath id="gp-c"><Path d={GP} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Circle cx={10.5} cy={14.5} r={2.3} fill="#ffd54f" stroke="#1a237e" strokeWidth={0.6} />
      <Circle cx={7.5} cy={22.5} r={1.9} fill="#ffd54f" stroke="#1a237e" strokeWidth={0.6} />
      <Circle cx={13.5} cy={27} r={1.6} fill="#ffd54f" stroke="#1a237e" strokeWidth={0.6} />
      <Path d="M33 14 C33.5 7.5 40 5.5 45 8.5 C41 9.5 37 11.5 33 14 Z" fill="url(#gp-t)" stroke="#6a1b6e" strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M30 27.5 C29 31.5 31.5 33.5 35 32.5 C33.5 31 33 29.5 33 27.8 Z" fill="#ff9a3d" stroke="#6a1b6e" strokeWidth={0.7} />
      <Path d={GP} fill="url(#gp-b)" stroke="#0b6d80" strokeWidth={OL} />
      <G clipPath="url(#gp-c)">
        <Path d={GP} fill="url(#gp-o)" />
        <Ellipse cx={39} cy={16} rx={8} ry={1.6} fill="#ffffff" opacity={0.3} />
        <Circle cx={31} cy={21} r={1.3} fill="#ffd54f" />
        <Circle cx={36} cy={24} r={1.1} fill="#3949ab" />
      </G>
      <Path d="M44.5 15 C46 18 46 22 44.5 25" stroke="#0b6d80" strokeWidth={0.6} fill="none" opacity={0.7} />
      <Path d="M51 21.5 L49 22.4" stroke="#0b6d80" strokeWidth={0.7} strokeLinecap="round" />
      <Eye x={47} y={19} r={3.1} iris="#ffd166" />
    </>
  ),
};

// ───────────────────────── 4 Neon Tetra ─────────────────────────
const NT = 'M53 21 C52 16 45 13.5 34 13.5 C25 13.5 19 16 14 19.5 C13 20.2 13 20.9 14 21.5 C19 25.5 25 28.5 34 28.5 C45 28.5 52 26 53 21 Z';
const neonTetra: Art = {
  tail: { bx: 15, cy: 20.5, tip: 5, spread: 7, fork: 3, fill: '#cfeaff', stroke: '#5b7fa8', opacity: 0.8, rays: 3, rayColor: '#5b7fa8' },
  defs: (
    <>
      {grad('nt-b', '#33466a', '#8da4c8', '#eef3fb')}
      <LinearGradient id="nt-r" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#ff3350" />
        <Stop offset="1" stopColor="#c20e2c" />
      </LinearGradient>
      <ClipPath id="nt-c"><Path d={NT} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M32 13.8 Q36.5 7.8 41.5 14.2 Z" fill="#cfeaff" stroke="#5b7fa8" strokeWidth={0.7} opacity={0.85} strokeLinejoin="round" />
      <Path d="M31 28.2 Q35 33.2 40 28.4 Z" fill="#ffd0d6" stroke="#b5405a" strokeWidth={0.7} opacity={0.85} strokeLinejoin="round" />
      <Path d={NT} fill="url(#nt-b)" stroke="#2b3b58" strokeWidth={OL} />
      <G clipPath="url(#nt-c)">
        <Path d="M12 20.6 C20 21 30 20.6 40 21.6 C37 24 35.5 27 36 30 L12 30 Z" fill="url(#nt-r)" />
        <Path d="M49 18.6 C40 17.4 28 17.5 15 19.6" stroke="#00e5ff" strokeWidth={2.7} strokeLinecap="round" fill="none" />
        <Path d="M49 18.6 C40 17.4 28 17.5 15 19.6" stroke="#d2fbff" strokeWidth={0.9} strokeLinecap="round" fill="none" />
        <Ellipse cx={34} cy={14.6} rx={10} ry={1} fill="#ffffff" opacity={0.3} />
      </G>
      <Path d="M43 14.5 C44.8 18 44.8 24 43 27.5" stroke="#2b3b58" strokeWidth={0.6} fill="none" opacity={0.6} />
      <Path d="M52.6 21.2 L50.6 22" stroke="#2b3b58" strokeWidth={0.6} strokeLinecap="round" />
      <Eye x={47.6} y={17.6} r={3.4} iris="#b9c6dd" />
    </>
  ),
};

// ───────────────────────── 5 Goldfish ─────────────────────────
const GF = 'M50 21.5 C50 14 42 9.5 33 10 C25 10.5 20.5 14.5 20 20 C20.5 26 25 31 33 31.5 C42 32 50 29 50 21.5 Z';
const goldfish: Art = {
  tail: { bx: 23, cy: 21, tip: 2, spread: 13.5, fork: 8, fill: '#ffa21f', stroke: '#b94d00', opacity: 0.92, rays: 5, rayColor: '#b94d00' },
  defs: (
    <>
      {grad('gf-b', '#e25f00', '#ff9d1c', '#ffe08a')}
      <ClipPath id="gf-c"><Path d={GF} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M26 11.5 C27 1.5 40 0.8 47 10.5 C40 8 32 9 26 11.5 Z" fill="#ff8a00" stroke="#b94d00" strokeWidth={OL} strokeLinejoin="round" opacity={0.95} />
      <Path d="M33 30.5 C31.5 36.5 37.5 39 43 36 C40.5 34.5 38.5 32.5 37 30.5 Z" fill="#ffa21f" stroke="#b94d00" strokeWidth={OL} strokeLinejoin="round" />
      <Path d={GF} fill="url(#gf-b)" stroke="#b94d00" strokeWidth={OL} />
      <G clipPath="url(#gf-c)">
        <Path d={scaleArcs(24, 46, 13, 27, 5, 5, 3)} stroke="#b94d00" strokeWidth={0.6} opacity={0.35} fill="none" strokeLinecap="round" />
        <Ellipse cx={33} cy={14.5} rx={10} ry={2.4} fill="#ffffff" opacity={0.3} />
        <Ellipse cx={34} cy={27.5} rx={9} ry={2} fill="#fff4c7" opacity={0.45} />
      </G>
      <Path d="M38 21.5 C34 21 32 25.5 34.5 28.5 C37.5 28 39.5 25 38 21.5 Z" fill="#ffb347" stroke="#b94d00" strokeWidth={0.6} />
      <Path d="M42 12.5 C44 17 44 24 42 29.5" stroke="#b94d00" strokeWidth={0.6} fill="none" opacity={0.55} />
      <Path d="M50 21.5 L47.8 22.4" stroke="#8a3a00" strokeWidth={0.7} strokeLinecap="round" />
      <Eye x={45.2} y={17.3} r={2.9} iris="#ffd98a" />
    </>
  ),
};

// ───────────────────────── 6 Damselfish ─────────────────────────
const DM = 'M51 21 C51 13 43 8 32 8 C23 8 17 13.5 16.5 20 C17 27 23 32 32 32 C43 32 51 29 51 21 Z';
const damselfish: Art = {
  tail: { bx: 18, cy: 20, tip: 4, spread: 10, fork: 5, fill: '#2a2478', stroke: '#3df0ff', rays: 3, rayColor: '#3df0ff' },
  defs: (
    <>
      {grad('dm-b', '#150f48', '#2d2784', '#5a4fd0')}
      <ClipPath id="dm-c"><Path d={DM} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M20 11.5 C26 3 40 3 47 10 C40 8 28 8 20 11.5 Z" fill="#2a2478" stroke="#3df0ff" strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M22 29.5 C27 36 38 36 44 30.5 C38 31.5 28 31.5 22 29.5 Z" fill="#2a2478" stroke="#3df0ff" strokeWidth={0.8} strokeLinejoin="round" />
      <Path d={DM} fill="url(#dm-b)" stroke="#0e0a33" strokeWidth={OL} />
      <G clipPath="url(#dm-c)">
        <Path d={dotGrid(19, 48, 11, 30, 4.2, 3.6)} stroke="#3df0ff" strokeWidth={1.1} strokeLinecap="round" opacity={0.9} />
        <Ellipse cx={32} cy={11.5} rx={11} ry={2} fill="#ffffff" opacity={0.22} />
      </G>
      <Path d="M39 22 C35 21.5 33 26 35 29 C38.5 28.5 40.5 25.5 39 22 Z" fill="#3b33a0" stroke="#3df0ff" strokeWidth={0.6} />
      <Path d="M51 21 L48.6 22" stroke="#0e0a33" strokeWidth={0.7} strokeLinecap="round" />
      <Eye x={45.2} y={16.4} r={3.2} iris="#3df0ff" />
    </>
  ),
};

// ───────────────────────── 7 Minnow ─────────────────────────
const MN = 'M57 21 C55 16 47 14 35 14.3 C25 14.6 16 17 10 20 C9.5 20.3 9.5 20.7 10 21 C16 24.5 25 27.5 35 27.7 C47 28 55 26 57 21 Z';
const minnow: Art = {
  tail: { bx: 12, cy: 20.5, tip: 1, spread: 8, fork: 4.5, fill: '#cfd8dc', stroke: '#6d7f86', opacity: 0.85, rays: 3, rayColor: '#6d7f86' },
  defs: (
    <>
      {grad('mn-b', '#44563f', '#a3b4aa', '#f4f7f5')}
      <ClipPath id="mn-c"><Path d={MN} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M31 14.4 Q35.5 8.8 41 14.7 Z" fill="#cfd8dc" stroke="#6d7f86" strokeWidth={0.7} opacity={0.9} strokeLinejoin="round" />
      <Path d="M30 27.6 Q34.5 32.6 40 27.9 Z" fill="#cfd8dc" stroke="#6d7f86" strokeWidth={0.7} opacity={0.9} strokeLinejoin="round" />
      <Path d={MN} fill="url(#mn-b)" stroke="#3b4a4f" strokeWidth={OL} />
      <G clipPath="url(#mn-c)">
        <Path d="M55 20.2 C43 19.2 24 19.4 11 20.4" stroke="#33454c" strokeWidth={1.9} strokeLinecap="round" fill="none" opacity={0.75} />
        <Path d="M55 18.1 C43 17.1 24 17.3 11 18.4" stroke="#e8c85c" strokeWidth={0.9} strokeLinecap="round" fill="none" opacity={0.9} />
        <Ellipse cx={34} cy={15.3} rx={12} ry={0.9} fill="#ffffff" opacity={0.3} />
        <Path d={scaleArcs(14, 46, 21.5, 24.5, 4.2, 3, 1.6)} stroke="#ffffff" strokeWidth={0.5} opacity={0.5} fill="none" />
      </G>
      <Path d="M46.5 15.2 C48 18.5 48 24 46.5 27" stroke="#3b4a4f" strokeWidth={0.6} fill="none" opacity={0.55} />
      <Path d="M57 21 L54.6 21.6" stroke="#3b4a4f" strokeWidth={0.7} strokeLinecap="round" />
      <Eye x={51.6} y={18.7} r={2.7} iris="#e1e7ec" />
    </>
  ),
};

// ───────────────────────── 8 Angelfish ─────────────────────────
const AG_BODY = 'M50 21 C50 14 44 9.5 36 9.5 C27 9.5 22 14 22 20.5 C22 27 27 31.5 36 31.5 C44 31.5 50 28 50 21 Z';
const AG_DORSAL = 'M43 11 C41.5 6 38.5 3 35 0.8 C33 6 27 9 16.5 9.5 C21 11.5 23.5 13 24.5 15.5 C29 12.5 36 11 43 11 Z';
const AG_ANAL = 'M43 30 C41.5 35 38.5 38 35 40.2 C33 35 27 32 16.5 31.5 C21 29.5 23.5 28 24.5 25.5 C29 28.5 36 30 43 30 Z';
const angelfish: Art = {
  tail: { bx: 23, cy: 20.5, tip: 14, spread: 7.5, fork: 2.5, fill: '#ffe9a0', stroke: '#6b5a1a', opacity: 0.85, rays: 3, rayColor: '#6b5a1a' },
  defs: (
    <>
      {grad('ag-b', '#e3b312', '#ffdf6b', '#fff7d6')}
      <ClipPath id="ag-c">
        <Path d={AG_BODY} />
        <Path d={AG_DORSAL} />
        <Path d={AG_ANAL} />
      </ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M41 29.5 C42.4 34 43.8 37 42.2 39.6" stroke="#e8dca0" strokeWidth={0.8} fill="none" strokeLinecap="round" />
      <Path d="M38.5 30.5 C39.5 34.5 40.5 37 39.5 39.4" stroke="#e8dca0" strokeWidth={0.7} fill="none" strokeLinecap="round" />
      <Path d={AG_DORSAL} fill="#ffe9a0" stroke="#6b5a1a" strokeWidth={OL} strokeLinejoin="round" opacity={0.92} />
      <Path d={AG_ANAL} fill="#ffe9a0" stroke="#6b5a1a" strokeWidth={OL} strokeLinejoin="round" opacity={0.92} />
      <Path d={AG_BODY} fill="url(#ag-b)" stroke="#6b5a1a" strokeWidth={OL} />
      <G clipPath="url(#ag-c)">
        <Path d="M43 3 C45 12 46 30 43.5 38 L48 38 C49.5 30 48.5 12 46.5 3 Z" fill="#171717" opacity={0.92} />
        <Path d="M32.5 0 C34.5 12 34.5 30 32.5 41 L38 41 C40 30 40 12 38 0 Z" fill="#171717" opacity={0.92} />
        <Path d="M23 3 C25 12 25 30 23 38 L27.5 38 C29.5 30 29.5 12 27.5 3 Z" fill="#171717" opacity={0.92} />
        <Ellipse cx={36} cy={12.5} rx={9} ry={1.8} fill="#ffffff" opacity={0.3} />
      </G>
      <Path d="M50 21 L47.6 22" stroke="#3d330c" strokeWidth={0.7} strokeLinecap="round" />
      <Eye x={46.4} y={17} r={3} iris="#ff5a36" />
    </>
  ),
};

// ───────────────────────── 9 Butterflyfish ─────────────────────────
const BF = 'M57 22.5 C52.5 22 50 18 46.5 12.5 C43 8 36.5 6.5 31 6.5 C22 6.5 15 13 15 20.5 C15 28 22 34.5 32 34.5 C41 34.5 47 29.5 50.5 25 C52.5 23.8 55 23.1 57 22.5 Z';
const butterflyfish: Art = {
  tail: { bx: 17, cy: 20.5, tip: 8, spread: 8, fork: 2, fill: '#ffc400', stroke: '#8a6a00', rays: 3, rayColor: '#8a6a00' },
  defs: (
    <>
      {grad('bf-b', '#f2d93a', '#fff3a6', '#fffce9')}
      <ClipPath id="bf-c"><Path d={BF} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M17 9.5 C24 2.5 37 2.5 43 8 C35 6.5 25 7 17 9.5 Z" fill="#ffd21f" stroke="#8a6a00" strokeWidth={OL} strokeLinejoin="round" />
      <Path d="M18 31.5 C25 38.5 37 38.5 43 33 C35 34 26 33.5 18 31.5 Z" fill="#ffd21f" stroke="#8a6a00" strokeWidth={OL} strokeLinejoin="round" />
      <Path d={BF} fill="url(#bf-b)" stroke="#8a6a00" strokeWidth={OL} />
      <G clipPath="url(#bf-c)">
        <Path d="M13 6 L25 6 C28 14 28 27 25 36 L13 36 Z" fill="#ffb300" opacity={0.85} />
        <Path d="M9 5 L40 36 M15 5 L46 36 M21 5 L52 36 M3 5 L34 36" stroke="#b58900" strokeWidth={0.5} opacity={0.35} />
        <Path d="M39.5 6 C41.5 14 42 26 40 35 L47 35 C48.5 26 48 14 46 6 Z" fill="#ffffff" />
        <Path d="M41.2 6 C43 14 43.2 26 41.5 35 L45.6 35 C47 26 46.6 14 45 6 Z" fill="#14110d" />
        <Ellipse cx={33} cy={11.5} rx={9} ry={2} fill="#ffffff" opacity={0.35} />
      </G>
      <Circle cx={26.5} cy={13} r={2.4} fill="#14110d" stroke="#ffffff" strokeWidth={0.9} />
      <Path d="M57 22.5 L54.4 22.9" stroke="#5d4600" strokeWidth={0.7} strokeLinecap="round" />
      <Eye x={43.4} y={17} r={2.8} iris="#d8d8d8" />
    </>
  ),
};

// ───────────────────────── 10 Moorish Idol ─────────────────────────
const MI = 'M55.5 23 C52 22.2 50 18 46.5 13 C43 8.5 37 7 31.5 7.5 C22 8.5 16.5 14 16.5 21 C16.5 28 22 33 31 33.5 C39 33.5 46 30 50.5 26 C52 24.8 53.8 23.7 55.5 23 Z';
const moorishIdol: Art = {
  tail: { bx: 18, cy: 21, tip: 5, spread: 9, fork: 3, fill: '#1a1a1a', stroke: '#000000', rays: 3, rayColor: '#cfcfcf' },
  defs: (
    <>
      {grad('mi-b', '#ffffff', '#fbfbf6', '#ece9de')}
      <ClipPath id="mi-c"><Path d={MI} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M43 10 C41.5 5 37.5 3 33 1.8 C26 0.2 16 1 5 6 C15 5.2 24 6.8 29.5 9 Z" fill="#fafafa" stroke="#1a1a1a" strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M5 6 C15 5.2 24 6.8 29.5 9 L33 9 C26 5.5 16 4.5 5 6 Z" fill="#1a1a1a" opacity={0.85} />
      <Path d="M30 32 C29 36.5 33 38.5 38 36 C36 35 34.5 33.5 34 32 Z" fill="#1a1a1a" />
      <Path d={MI} fill="url(#mi-b)" stroke="#1a1a1a" strokeWidth={OL} />
      <G clipPath="url(#mi-c)">
        <Path d="M30.5 8 C34.5 14 35 24 31.5 34 L39.5 34 C41 24 40 14 37 8 Z" fill="#ffc928" />
        <Path d="M20 6 C25.5 14 26 28 22 35 L31 35 C34 28 33 14 29 6 Z" fill="#161616" />
        <Path d="M39.5 6 C42.5 14 42.5 26 40 34 L47 33 C49 26 48.5 15 45.5 8 Z" fill="#161616" />
        <Ellipse cx={52} cy={20.5} rx={4} ry={2.6} fill="#ff9e1b" opacity={0.95} />
        <Ellipse cx={34} cy={11} rx={9} ry={1.8} fill="#ffffff" opacity={0.5} />
      </G>
      <Path d="M55.5 23 L53 23.4" stroke="#1a1a1a" strokeWidth={0.7} strokeLinecap="round" />
      <Eye x={44} y={17.2} r={2.8} iris="#dcdcdc" />
    </>
  ),
};

// ───────────────────────── 11 Lionfish ─────────────────────────
const LF = 'M55 22 C54 17 47 13 38 13 C28 13 20 15.5 15.5 19.5 L12.5 21 L15.5 23 C20 27.5 28 29.5 38 29.5 C47 29.5 54 27 55 22 Z';
const lionfish: Art = {
  tail: { bx: 15, cy: 21, tip: 3, spread: 8.5, fork: -3, fill: '#ff7043', stroke: '#7a1d00', opacity: 0.8, rays: 4, rayColor: '#7a1d00' },
  defs: (
    <>
      {grad('lf-b', '#7e1f00', '#d84315', '#ff8a50')}
      <ClipPath id="lf-c"><Path d={LF} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M24 14 L21 4 L25.5 2 L30 1.2 L34.5 1.4 L39 2.4 L43 4.8 L46 8 L45 14 Z" fill="#ff7043" opacity={0.6} stroke="#7a1d00" strokeWidth={0.7} strokeLinejoin="round" />
      <Path d="M24.5 14 L21 4 M28 14 L25.5 2 M31.5 14 L30 1.2 M35 14 L34.5 1.4 M38.5 14 L39 2.4 M41.5 14 L43 4.8 M44 14 L46 8" stroke="#5a1500" strokeWidth={0.6} fill="none" strokeLinecap="round" />
      <Path d="M22 29 L19 34.5 L25.5 32 L29.5 35 L32.5 29.6 Z" fill="#ff8a50" opacity={0.65} stroke="#7a1d00" strokeWidth={0.7} strokeLinejoin="round" />
      <Path d={LF} fill="url(#lf-b)" stroke="#5a1500" strokeWidth={OL} />
      <G clipPath="url(#lf-c)">
        <Path d="M46 12 C47.5 18 47.5 24 46 30 L43.2 30 C44.6 24 44.6 18 43.2 12 Z" fill="#ffe9d2" opacity={0.92} />
        <Path d="M39 12 C40.5 18 40.5 24 39 30 L36 30 C37.5 24 37.5 18 36 12 Z" fill="#ffe9d2" opacity={0.92} />
        <Path d="M32 12 C33.5 18 33.5 24 32 30 L29 30 C30.5 24 30.5 18 29 12 Z" fill="#ffe9d2" opacity={0.92} />
        <Path d="M25 12 C26.5 18 26.5 24 25 30 L22 30 C23.5 24 23.5 18 22 12 Z" fill="#ffe9d2" opacity={0.92} />
        <Path d="M18.5 12 C19.8 18 19.8 24 18.5 30 L16 30 C17 24 17 18 16 12 Z" fill="#ffe9d2" opacity={0.92} />
        <Ellipse cx={36} cy={14.6} rx={11} ry={1.1} fill="#ffffff" opacity={0.28} />
      </G>
      <Path d="M43 21.5 L14.5 31.5 L18 36.5 L24 39.2 L30 39.8 L36 38.8 L41 36 Z" fill="#ff8a50" opacity={0.7} stroke="#7a1d00" strokeWidth={0.7} strokeLinejoin="round" />
      <Path d="M43 21.5 L14.5 31.5 M43 21.5 L18 36.5 M43 21.5 L24 39.2 M43 21.5 L30 39.8 M43 21.5 L36 38.8" stroke="#5a1500" strokeWidth={0.5} fill="none" opacity={0.8} />
      <Path d="M48 13.5 L46.6 9 M50 14.4 L51.8 10.2" stroke="#7a1d00" strokeWidth={0.9} strokeLinecap="round" />
      <Path d="M55 22 C52 24.2 49 24.4 46.8 23.8" stroke="#3b0c00" strokeWidth={0.7} fill="none" strokeLinecap="round" />
      <Eye x={49} y={17.8} r={3} iris="#ffcf5a" />
    </>
  ),
};

export const ART: Record<number, Art> = {
  0: clownfish,
  1: blueTang,
  2: yellowTang,
  3: guppy,
  4: neonTetra,
  5: goldfish,
  6: damselfish,
  7: minnow,
  8: angelfish,
  9: butterflyfish,
  10: moorishIdol,
  11: lionfish,
};
