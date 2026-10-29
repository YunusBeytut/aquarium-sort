import type { EggKind } from '@/game/types';

export type DailyReward = {
  pearls?: number;
  food?: number;
  booster?: { kind: 'undo' | 'extraJar' | 'hint'; n: number };
  egg?: EggKind;
};

export type DailyData = { lastClaim: string; streak: number };

export const DAILY_CYCLE = 7;

// 7 günlük döngü; 7. günden sonra başa döner. Miktarları ekonomine göre ayarla.
export const DAILY_REWARDS: DailyReward[] = [
  { pearls: 50 },
  { food: 5 },
  { pearls: 100 },
  { booster: { kind: 'hint', n: 1 } },
  { pearls: 150 },
  { food: 10 },
  { egg: 'normal' },
];

// Cihazın yerel takvimine göre gün anahtarı (YYYY-MM-DD).
export function dayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// Bugün ödül henüz alınmamışsa serinin hangi adımdan devam edeceği.
// Dün alındıysa seri sürer; gün kaçırıldıysa sıfırlanmaz, yalnızca bir adım geri düşer.
export function effectiveStreak(daily: DailyData, today: string = dayKey()): number {
  if (!daily.lastClaim) return 0;
  const gap = dayNumber(today) - dayNumber(daily.lastClaim);
  return gap <= 1 ? daily.streak : Math.max(0, daily.streak - 1);
}

// Arayüz için özet: pos = bugünün ödül sırası (0-6), streak = gösterilecek seri.
export function getDailyView(daily: DailyData, today: string = dayKey()) {
  const claimedToday = daily.lastClaim === today;
  const base = claimedToday ? Math.max(0, daily.streak - 1) : effectiveStreak(daily, today);
  return {
    claimedToday,
    pos: base % DAILY_CYCLE,
    streak: claimedToday ? daily.streak : base,
  };
}
