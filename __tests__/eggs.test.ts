import { PITY_LIMIT } from '../src/game/economy';
import { rollEgg, rollRarity } from '../src/game/eggs';
import { FishDef, Rarity } from '../src/game/types';

function fish(id: number, rarity: Rarity): FishDef {
    return {
        id,
        name: `fish${id}`,
        rarity,
        biome: 'reef',
        bonusPct: 1,
        template: 'round',
        palette: { body: '#000', accent: '#fff' },
    };
}

const defs: FishDef[] = [
    fish(0, 'common'),
    fish(1, 'common'),
    fish(2, 'rare'),
    fish(3, 'epic'),
    fish(4, 'legendary'),
];

function seededRng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('eggs', () => {
    test('rollRarity eşikleri', () => {
        expect(rollRarity('normal', 0, () => 0.0)).toBe('common');
        expect(rollRarity('normal', 0, () => 0.69)).toBe('common');
        expect(rollRarity('normal', 0, () => 0.71)).toBe('rare');
        expect(rollRarity('normal', 0, () => 0.95)).toBe('epic');
        expect(rollRarity('normal', 0, () => 0.995)).toBe('legendary');
    });

    test('pity dolunca epic veya legendary garantili', () => {
        const rng = seededRng(7);
        for (let i = 0; i < 200; i++) {
            const r = rollRarity('normal', PITY_LIMIT, rng);
            expect(['epic', 'legendary']).toContain(r);
        }
    });

    test('pity: epic/legendary çıkınca sıfırlanır, çıkmazsa artar', () => {
        const common = rollEgg('normal', 5, 0, {}, defs, () => 0.0)!;
        expect(common.fish.rarity).toBe('common');
        expect(common.pity).toBe(6);

        const epic = rollEgg('normal', 5, 0, {}, defs, () => 0.95)!;
        expect(epic.fish.rarity).toBe('epic');
        expect(epic.pity).toBe(0);
    });

    test('yeni balık duplicate inci vermez', () => {
        const r = rollEgg('normal', 0, 0, {}, defs, () => 0.0)!;
        expect(r.isNew).toBe(true);
        expect(r.duplicatePearls).toBe(0);
    });

    test('tekrar gelen balık inciye çevrilir', () => {
        const r = rollEgg('normal', 0, 0, { 0: 1, 1: 1 }, defs, () => 0.0)!;
        expect(r.isNew).toBe(false);
        expect(r.duplicatePearls).toBe(20);
    });

    test('istenen nadirlikte balık yoksa en yakın nadirliğe düşer', () => {
        const onlyCommon = [fish(0, 'common')];
        const r = rollEgg('rare', 0, 0, {}, onlyCommon, () => 0.99)!;
        expect(r.fish.id).toBe(0);
    });

    test('tekrar serisi dolunca normal yumurta yeni balık verir', () => {
        const owned = { 0: 1 };
        const r = rollEgg('normal', 0, 2, owned, defs, () => 0.0)!;
        expect(r.isNew).toBe(true);
        expect(r.dupStreak).toBe(0);
    });

    test('tekrar balık seriyi artırır', () => {
        const r = rollEgg('normal', 0, 0, { 0: 1, 1: 1 }, defs, () => 0.0)!;
        expect(r.isNew).toBe(false);
        expect(r.dupStreak).toBe(1);
    });

    test('nadir yumurta sahip olunmayan balığı seçer', () => {
        const r = rollEgg('rare', 0, 0, { 0: 1, 1: 1, 2: 1 }, defs, () => 0.0)!;
        expect(r.isNew).toBe(true);
    });

    test('mağazaya özel balık yumurta havuzuna girmez', () => {
        const pool = [fish(0, 'common'), { ...fish(9, 'common'), storeOnly: true }];
        for (let i = 0; i < 50; i++) {
            const r = rollEgg('normal', 0, 0, {}, pool, seededRng(i))!;
            expect(r.fish.id).toBe(0);
        }
    });

    test('boş havuzda null döner', () => {
        expect(rollEgg('normal', 0, 0, {}, [], () => 0.5)).toBeNull();
    });

    test('uzun vadede oranlar beklenene yakındır (normal yumurta)', () => {
        const rng = seededRng(123);
        const counts: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
        const n = 20000;
        for (let i = 0; i < n; i++) counts[rollRarity('normal', 0, rng)]++;
        expect(counts.common / n).toBeGreaterThan(0.67);
        expect(counts.common / n).toBeLessThan(0.73);
        expect(counts.rare / n).toBeGreaterThan(0.22);
        expect(counts.rare / n).toBeLessThan(0.26);
    });
});