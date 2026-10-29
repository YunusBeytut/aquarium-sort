import type { ReactNode } from 'react';
import { Circle, ClipPath, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { arowana } from './ArowanaArt';

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

// ───────────────────────── 16 Seahorse (yalnızca mağazada satılır) ─────────────────────────
const SH_BODY = 'M25.51 10.92 C25.44 11.15 25.22 11.66 25.06 12.27 C24.91 12.87 24.65 13.71 24.59 14.57 C24.53 15.44 24.68 16.67 24.7 17.44 C24.72 18.22 24.75 18.83 24.72 19.23 C24.69 19.63 24.57 19.55 24.54 19.85 C24.52 20.15 24.55 20.64 24.57 21.02 C24.59 21.41 24.66 21.7 24.67 22.13 C24.68 22.57 24.73 22.98 24.62 23.62 C24.51 24.27 24.19 25.3 24.03 26.02 C23.86 26.74 23.79 27.3 23.66 27.96 C23.53 28.62 23.35 29.31 23.27 29.97 C23.18 30.63 23.12 31.28 23.12 31.93 C23.13 32.58 23.1 33.22 23.27 33.85 C23.44 34.49 23.76 35.2 24.17 35.74 C24.57 36.29 25.09 36.76 25.67 37.14 C26.26 37.52 26.97 37.87 27.67 38 C28.37 38.13 29.17 38.05 29.89 37.93 C30.6 37.81 31.34 37.58 31.96 37.28 C32.58 36.97 33.14 36.54 33.59 36.09 C34.04 35.64 34.41 35.09 34.67 34.56 C34.93 34.03 35.12 33.44 35.16 32.9 C35.2 32.37 34.97 31.75 34.89 31.38 C34.81 31 34.7 30.77 34.66 30.65 A0.62 0.62 0 0 0 33.44 30.79 C33.45 30.94 33.52 31.34 33.54 31.67 C33.56 32 33.62 32.46 33.55 32.78 C33.48 33.11 33.33 33.32 33.1 33.62 C32.87 33.93 32.51 34.36 32.18 34.62 C31.85 34.88 31.55 35.05 31.11 35.2 C30.67 35.35 30.02 35.48 29.55 35.51 C29.07 35.55 28.61 35.52 28.27 35.41 C27.92 35.3 27.71 35.09 27.47 34.85 C27.23 34.61 26.95 34.2 26.85 33.96 C26.74 33.73 26.8 33.66 26.84 33.44 C26.89 33.22 26.98 32.92 27.13 32.65 C27.28 32.37 27.48 32.07 27.76 31.78 C28.05 31.49 28.42 31.26 28.84 30.9 C29.26 30.54 29.76 30.04 30.29 29.61 C30.82 29.17 31.4 28.92 32.03 28.29 C32.67 27.66 33.56 26.73 34.1 25.82 C34.64 24.91 35.03 23.83 35.29 22.82 C35.54 21.82 35.71 20.87 35.65 19.79 C35.6 18.71 35.3 17.28 34.96 16.35 C34.61 15.41 33.96 14.68 33.58 14.18 C33.2 13.67 32.98 13.71 32.68 13.31 C32.39 12.92 32.06 12.29 31.82 11.81 C31.57 11.33 31.29 10.66 31.19 10.43 A2.85 2.85 0 0 0 25.51 10.92 Z';
const SH_HEAD = 'M29.68 12.68 C29.83 12.67 30.24 12.62 30.55 12.62 C30.86 12.61 31.23 12.63 31.53 12.66 C31.82 12.69 32.19 12.74 32.32 12.79 C32.44 12.85 32.35 12.98 32.26 13 C32.18 13.02 31.83 12.96 31.8 12.89 C31.76 12.82 31.9 12.68 32.04 12.59 C32.18 12.5 32.4 12.4 32.64 12.35 C32.88 12.31 33.34 12.31 33.48 12.3 A3.61 3.61 0 0 0 35 5.25 C34.99 5.2 35.04 5.1 34.91 4.94 C34.77 4.79 34.52 4.53 34.18 4.32 C33.85 4.12 33.45 3.84 32.9 3.72 C32.35 3.6 31.52 3.51 30.9 3.6 C30.27 3.69 29.63 4.01 29.16 4.28 C28.69 4.55 28.37 4.91 28.07 5.21 C27.77 5.51 27.51 5.85 27.34 6.08 C27.16 6.31 27.07 6.5 27.02 6.58 A3.32 3.32 0 0 0 29.68 12.68 Z';
const SH_SNOUT = 'M34.61 10.96 C34.74 10.99 35.08 11.04 35.41 11.09 C35.74 11.14 36.17 11.21 36.58 11.27 C36.99 11.34 37.45 11.41 37.87 11.47 C38.28 11.53 38.67 11.59 39.05 11.64 C39.43 11.69 39.79 11.73 40.16 11.78 C40.53 11.82 40.93 11.86 41.27 11.9 C41.62 11.94 41.97 11.98 42.25 12 C42.53 12.03 42.82 12.06 42.93 12.08 A1.23 1.23 0 0 0 43.41 9.65 C43.3 9.62 43.02 9.54 42.75 9.46 C42.48 9.38 42.15 9.28 41.81 9.19 C41.48 9.09 41.1 8.98 40.74 8.88 C40.39 8.77 40.05 8.68 39.69 8.57 C39.33 8.47 38.96 8.36 38.56 8.25 C38.17 8.13 37.71 8 37.32 7.89 C36.92 7.78 36.51 7.66 36.19 7.57 C35.87 7.48 35.53 7.38 35.39 7.35 A1.85 1.85 0 0 0 34.61 10.96 Z';
const seahorse: Art = {
  // "Kuyruk" yerine sırt yüzgeci dalgalanır; kıvrık kuyruk gövdenin parçasıdır.
  tail: { bx: 25.36, cy: 22.82, tip: 15.38, spread: 5.32, fork: -2.47, fill: '#ff8f6b', stroke: '#8a3a1a', opacity: 0.9, rays: 5, rayColor: '#8a3a1a' },
  defs: (
    <>
      <LinearGradient id="sh-b" gradientUnits="userSpaceOnUse" x1="22.65" y1="0" x2="38.8" y2="0">
        <Stop offset="0" stopColor="#dd7a00" />
        <Stop offset="0.5" stopColor="#ffbe1f" />
        <Stop offset="1" stopColor="#ffe08a" />
      </LinearGradient>
      <ClipPath id="sh-c">
        <Path d={SH_BODY} />
        <Path d={SH_HEAD} />
        <Path d={SH_SNOUT} />
      </ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M27.4 6.78 L26.26 2.22 L29.11 4.69 L30.44 0.89 L32.34 4.5 L35.19 2.03 L34.81 6.59 Z" fill="#ff7a3d" stroke="#6b3a00" strokeWidth={0.8} strokeLinejoin="round" />
      <Path d={SH_BODY} fill="#6b3a00" stroke="#6b3a00" strokeWidth={1.9} strokeLinejoin="round" />
      <Path d={SH_HEAD} fill="#6b3a00" stroke="#6b3a00" strokeWidth={1.9} strokeLinejoin="round" />
      <Path d={SH_SNOUT} fill="#6b3a00" stroke="#6b3a00" strokeWidth={1.9} strokeLinejoin="round" />
      <Path d={SH_BODY} fill="url(#sh-b)" />
      <Path d={SH_HEAD} fill="url(#sh-b)" />
      <Path d={SH_SNOUT} fill="url(#sh-b)" />
      <G clipPath="url(#sh-c)">
        <Path d="M32.1 11.56 C32.23 11.78 32.64 12.54 32.9 12.87 C33.15 13.21 33.34 13.28 33.64 13.59 C33.94 13.89 34.32 14.09 34.71 14.69 C35.09 15.29 35.68 16.27 35.95 17.2 C36.22 18.12 36.32 19.28 36.32 20.24 C36.31 21.2 36.16 22.05 35.93 22.93 C35.7 23.82 35.4 24.69 34.93 25.54 C34.46 26.39 33.7 27.37 33.11 28.02 C32.51 28.66 31.85 29.01 31.33 29.41 C30.82 29.8 30.27 30.17 30.01 30.36 C29.76 30.56 29.82 30.53 29.78 30.56 L29.78 30.56 C29.78 30.5 29.68 30.53 29.74 30.21 C29.81 29.89 29.94 29.23 30.15 28.65 C30.36 28.08 30.74 27.48 31.01 26.78 C31.28 26.08 31.6 25.22 31.78 24.47 C31.95 23.72 32 23 32.07 22.28 C32.15 21.57 32.19 20.88 32.21 20.16 C32.22 19.43 32.24 18.66 32.16 17.94 C32.08 17.21 31.85 16.42 31.74 15.8 C31.63 15.18 31.5 14.69 31.49 14.22 C31.47 13.76 31.55 13.46 31.65 13.02 C31.75 12.58 32.02 11.81 32.1 11.56 Z" fill="#fff1bd" opacity={0.88} />
        <Path d="M32.91 13.59 Q28.95 15.5 24.55 15.36 M34.76 15.93 Q30.07 18.5 24.75 19.08 M35.6 21.1 Q30 21.76 24.54 20.34 M34.1 25.82 Q29.01 24.95 24.67 22.13 M31.19 28.97 Q27.23 27.66 24.41 24.59" stroke="#b86500" strokeWidth={0.6} strokeLinecap="round" opacity={0.5} fill="none" />
        <Path d="M28.31 31.33 Q25.59 30.65 23.49 28.79 M27.2 32.5 Q25.03 32.74 23.13 31.67 M26.83 33.52 Q25.2 34.48 23.34 34.14 M27.14 34.47 Q26.52 36 24.97 36.58 M28.27 35.41 Q28.62 36.85 27.67 38 M30.01 35.46 Q30.91 36.48 30.51 37.79 M31.88 34.84 Q33.05 35.25 33.18 36.49 M33.1 33.62 Q34.23 33.52 34.67 34.56 M33.59 32.34 Q34.27 31.6 35.09 32.19" stroke="#a85a00" strokeWidth={0.9} strokeLinecap="round" opacity={0.55} fill="none" />
        <Path d="M25.36 13.44h0.01 M25.41 17.18h0.01 M25.5 19.24h0.01 M25.43 20.78h0.01 M25.44 22.57h0.01 M24.95 24.94h0.01 M24.14 27.93h0.01" stroke="#9c5200" strokeWidth={1.0} strokeLinecap="round" opacity={0.55} fill="none" />
        <Path d="M26.62 13.62 C26.64 13.95 26.65 14.98 26.73 15.63 C26.81 16.28 27.01 16.98 27.11 17.52 C27.21 18.06 27.28 18.46 27.31 18.89 C27.35 19.31 27.33 19.63 27.32 20.06 C27.31 20.49 27.29 21.01 27.25 21.47 C27.2 21.94 27.15 22.4 27.06 22.86 C26.97 23.32 26.75 24 26.69 24.23 " stroke="#ffffff" strokeWidth={1.2} strokeLinecap="round" opacity={0.22} fill="none" />
        <Ellipse cx={30.06} cy={5.73} rx={3.23} ry={1.04} fill="#ffffff" opacity={0.32} />
        <Ellipse cx={32.53} cy={10.77} rx={1.8} ry={1.04} fill="#ff7a5a" opacity={0.5} />
      </G>
      <Path d="M29.3 16.28 L25.31 13.43 Q22.46 16.09 24.55 19.32 Z" fill="#ff9d78" stroke="#9a4a10" strokeWidth={0.65} strokeLinejoin="round" opacity={0.9} />
      <Path d="M29.3 16.28 L24.17 14.95 M29.3 16.28 L23.5 16.66 M29.3 16.28 L24.17 18.37" stroke="#9a4a10" strokeWidth={0.35} strokeLinecap="round" opacity={0.55} fill="none" />
      <Path d="M42.98 11.72 L44.4 11.34" stroke="#6b3a00" strokeWidth={0.7} strokeLinecap="round" />
      <Eye x={33.38} y={7.63} r={2.47} iris="#fff1b3" />
    </>
  ),
};

// ───────────────────────── 17 Starfish (yalnızca mağazada satılır) ─────────────────────────
const SF = 'M30.09 3.66 Q32.52 -0.53 33.86 4.12 L35.47 9.7 Q36.45 13.08 39.89 13.82 L45.57 15.04 Q50.3 16.05 46.29 18.77 L41.49 22.02 Q38.57 24 38.93 27.5 L39.53 33.27 Q40.03 38.09 36.21 35.12 L31.63 31.55 Q28.85 29.39 25.63 30.81 L20.32 33.16 Q15.9 35.12 17.54 30.57 L19.52 25.12 Q20.71 21.81 18.36 19.18 L14.49 14.86 Q11.26 11.26 16.09 11.42 L21.9 11.61 Q25.41 11.73 27.18 8.68 Z';
const starfish: Art = {
  // Kuyruğu yok: görünmez bırakılır, yalnızca genel sallanma animasyonu çalışır.
  tail: { bx: 30, cy: 20, tip: 30, spread: 0, fork: 0, fill: 'none', stroke: 'none', opacity: 0 },
  defs: (
    <>
      {grad('sf-b', '#ff9cc8', '#ff5c9d', '#e03a82')}
      <ClipPath id="sf-c"><Path d={SF} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d={SF} fill="url(#sf-b)" stroke="#7d1a4c" strokeWidth={0.95} strokeLinejoin="round" />
      <G clipPath="url(#sf-c)">
        <Ellipse cx={30} cy={18.9} rx={6.82} ry={5.72} fill="#ffb3d3" opacity={0.55} />
        <Path d="M30.4 16.72 L32.08 3.08 M33.24 19.37 L46.74 16.75 M31.6 22.89 L38.27 34.91 M27.75 22.41 L18.37 32.47 M27.01 18.61 L14.55 12.79" stroke="#c2306d" strokeWidth={0.8} strokeLinecap="round" opacity={0.5} fill="none" />
        <Path d="M33.45 10.89h0.01 M28.86 10.33h0.01 M33.38 6.89h0.01 M29.89 6.47h0.01 M39.73 20.46h0.01 M38.85 15.93h0.01 M43.51 19.17h0.01 M42.84 15.71h0.01 M32.57 29.39h0.01 M36.61 27.15h0.01 M34.97 32.59h0.01 M38.05 30.88h0.01 M21.86 25.34h0.01 M25.24 28.49h0.01 M19.56 28.61h0.01 M22.13 31.02h0.01 M22.4 13.91h0.01 M20.45 18.1h0.01 M18.58 12.73h0.01 M17.09 15.92h0.01" stroke="#ffd9e8" strokeWidth={1.65} strokeLinecap="round" opacity={0.9} fill="none" />
        <Path d="M30.91 12.58h0.01 M31.39 8.65h0.01 M31.86 4.82h0.01 M37.34 18.57h0.01 M41.23 17.82h0.01 M45.01 17.08h0.01 M33.63 26.54h0.01 M35.55 30.01h0.01 M37.41 33.37h0.01 M24.9 25.47h0.01 M22.2 28.37h0.01 M19.57 31.18h0.01 M23.22 16.84h0.01 M19.63 15.17h0.01 M16.14 13.54h0.01" stroke="#fff0c4" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      </G>
      <Eye x={26.26} y={19.56} r={2.42} iris="#ffe6f1" />
      <Eye x={33.74} y={19.56} r={2.42} iris="#ffe6f1" />
      <Path d="M28.35 23.96 Q30 25.5 31.65 23.96" stroke="#7d1a4c" strokeWidth={0.7} strokeLinecap="round" fill="none" />
    </>
  ),
};

// ───────────────────────── 18 Shrimp (yalnızca mağazada satılır) ─────────────────────────
const SR_BODY = 'M48.34 14.92 C48.15 14.75 47.59 14.29 47.19 13.89 C46.8 13.49 46.32 12.92 45.99 12.52 C45.66 12.13 45.57 11.85 45.21 11.53 C44.85 11.22 44.42 10.95 43.81 10.62 C43.19 10.3 42.29 9.9 41.52 9.6 C40.74 9.31 40.01 9.08 39.15 8.85 C38.29 8.62 37.38 8.37 36.34 8.22 C35.3 8.06 34 7.89 32.89 7.91 C31.77 7.92 30.66 8.09 29.66 8.3 C28.65 8.51 27.73 8.82 26.84 9.16 C25.95 9.5 25.13 9.88 24.33 10.32 C23.54 10.77 22.75 11.3 22.05 11.83 C21.35 12.37 20.75 12.92 20.15 13.53 C19.56 14.14 18.98 14.84 18.49 15.51 C18.01 16.18 17.6 16.92 17.25 17.58 C16.89 18.24 16.63 18.8 16.37 19.46 C16.1 20.13 15.84 20.92 15.68 21.54 C15.51 22.17 15.43 22.83 15.36 23.2 C15.3 23.58 15.3 23.7 15.28 23.8 A2.3 2.3 0 0 0 19.52 25.6 C19.59 25.48 19.73 25.23 19.94 24.92 C20.14 24.61 20.46 24.1 20.75 23.73 C21.03 23.37 21.29 23.09 21.63 22.74 C21.98 22.38 22.4 21.94 22.8 21.58 C23.2 21.21 23.63 20.83 24.04 20.54 C24.44 20.25 24.81 20.05 25.24 19.83 C25.68 19.6 26.17 19.37 26.63 19.19 C27.08 19.02 27.51 18.89 27.98 18.79 C28.46 18.68 28.96 18.61 29.47 18.57 C29.98 18.52 30.56 18.49 31.03 18.51 C31.5 18.53 31.9 18.58 32.31 18.69 C32.73 18.8 33.01 18.95 33.54 19.17 C34.07 19.38 34.81 19.72 35.47 19.97 C36.13 20.22 36.86 20.46 37.5 20.68 C38.13 20.9 38.58 21.1 39.27 21.3 C39.95 21.5 40.77 21.81 41.62 21.89 C42.47 21.98 43.55 21.97 44.37 21.8 C45.18 21.63 45.95 21.16 46.5 20.87 C47.04 20.58 47.46 20.21 47.66 20.08 A2.6 2.6 0 0 0 48.34 14.92 Z';
const shrimp: Art = {
  tail: { bx: 18, cy: 24.7, tip: 4.8, spread: 7.6, fork: -3.6, fill: '#ff8f70', stroke: '#7a1410', opacity: 0.96, rays: 5, rayColor: '#7a1410' },
  defs: (
    <>
      {grad('sr-b', '#d02d22', '#ff5a3c', '#ffa07a')}
      <ClipPath id="sr-c"><Path d={SR_BODY} /></ClipPath>
    </>
  ),
  body: (
    <>
      <Path d="M48.6 15.9 Q54.6 7.1 59.2 8.9 M48.8 17.1 Q55.8 13.7 59.4 18.9 M47.6 14.7 Q51.2 10.7 54.4 11.5" stroke="#7a1410" strokeWidth={1.25} strokeLinecap="round" fill="none" />
      <Path d="M48.6 15.9 Q54.6 7.1 59.2 8.9 M48.8 17.1 Q55.8 13.7 59.4 18.9 M47.6 14.7 Q51.2 10.7 54.4 11.5" stroke="#ffe3d4" strokeWidth={0.55} strokeLinecap="round" fill="none" />
      <Path d="M43.5 20.7 L41.8 26.3 M40.6 20.3 L38.6 26.1 M37.7 19.9 L35.5 25.5 M34.8 19.5 L32.6 24.9 M29.6 19.3 L28.2 23.3 M25.8 20.5 L24.4 24.3 M22.6 22.9 L21 26.3" stroke="#7a1410" strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Path d="M43.5 20.7 L41.8 26.3 M40.6 20.3 L38.6 26.1 M37.7 19.9 L35.5 25.5 M34.8 19.5 L32.6 24.9 M29.6 19.3 L28.2 23.3 M25.8 20.5 L24.4 24.3 M22.6 22.9 L21 26.3" stroke="#ffc9b3" strokeWidth={0.6} strokeLinecap="round" fill="none" />
      <Path d="M41 12.4 L52.2 11.2 L45.6 14.9 Z" fill="#e8442c" stroke="#7a1410" strokeWidth={0.8} strokeLinejoin="round" />
      <Path d={SR_BODY} fill="url(#sr-b)" stroke="#7a1410" strokeWidth={0.95} strokeLinejoin="round" />
      <G clipPath="url(#sr-c)">
        <Path d="M39.04 21.83 C38.75 21.73 37.92 21.45 37.3 21.23 C36.67 21.02 35.94 20.78 35.29 20.53 C34.64 20.27 33.9 19.93 33.4 19.71 C32.9 19.5 32.67 19.35 32.28 19.23 C31.9 19.12 31.55 19.06 31.1 19.02 C30.65 18.99 30.09 19 29.6 19.04 C29.11 19.07 28.62 19.12 28.16 19.21 C27.71 19.3 27.3 19.41 26.85 19.56 C26.41 19.72 25.92 19.94 25.5 20.14 C25.08 20.35 24.72 20.52 24.31 20.79 C23.91 21.06 23.48 21.42 23.07 21.78 C22.67 22.13 22.24 22.55 21.9 22.9 C21.55 23.24 21.29 23.49 21 23.84 C20.71 24.19 20.3 24.81 20.17 25.01 L20.17 25.01 C20.19 24.76 20.2 24.01 20.29 23.54 C20.39 23.06 20.52 22.65 20.72 22.17 C20.92 21.68 21.19 21.14 21.48 20.63 C21.77 20.11 22.09 19.57 22.45 19.1 C22.8 18.63 23.17 18.21 23.61 17.8 C24.04 17.4 24.54 17 25.06 16.67 C25.57 16.34 26.12 16.05 26.71 15.83 C27.29 15.6 27.92 15.44 28.57 15.34 C29.22 15.24 29.94 15.18 30.59 15.23 C31.24 15.27 31.88 15.38 32.48 15.6 C33.08 15.82 33.6 16.16 34.2 16.57 C34.81 16.98 35.5 17.53 36.11 18.05 C36.72 18.57 37.37 19.05 37.86 19.69 C38.35 20.32 38.84 21.48 39.04 21.83 Z" fill="#ffc2a2" opacity={0.55} />
        <Path d="M31.94 18.61 Q32.85 13.27 31.76 7.97 M29.47 18.57 Q29.12 13.59 26.84 9.16 M27.08 19.03 Q25.8 14.68 22.77 11.3 M24.81 20.07 Q22.95 16.44 19.59 14.13 M22.8 21.58 Q20.61 18.77 17.25 17.58 M21.05 23.35 Q18.88 21.21 15.85 20.87" stroke="#8a1a14" strokeWidth={0.65} strokeLinecap="round" opacity={0.6} fill="none" />
        <Path d="M42.94 12.65 C42.58 12.5 41.5 11.99 40.75 11.71 C40 11.42 39.28 11.2 38.45 10.96 C37.63 10.73 36.75 10.47 35.81 10.3 C34.86 10.13 33.76 9.97 32.78 9.96 C31.8 9.95 30.82 10.07 29.92 10.24 C29.01 10.4 28.16 10.66 27.34 10.95 C26.53 11.23 25.76 11.55 25.03 11.93 C24.29 12.31 23.57 12.76 22.92 13.23 C22.27 13.7 21.68 14.19 21.12 14.73 C20.56 15.27 20.02 15.86 19.55 16.47 C19.08 17.07 18.66 17.73 18.3 18.34 C17.94 18.94 17.64 19.48 17.37 20.09 C17.09 20.69 16.8 21.5 16.64 21.96 C16.48 22.41 16.44 22.67 16.41 22.81 " stroke="#fff3e8" strokeWidth={1.6} strokeLinecap="round" opacity={0.95} fill="none" />
        <Ellipse cx={41} cy={12.3} rx={4.6} ry={1.3} fill="#ffffff" opacity={0.3} />
      </G>
      <Path d="M45.2 14.3 L46.5 12.5" stroke="#7a1410" strokeWidth={1.9} strokeLinecap="round" />
      <Eye x={46.9} y={12} r={2.5} iris="#ffe0a8" />
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
  16: seahorse,
  17: starfish,
  18: shrimp,
  19: arowana,
};