import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FishSprite } from '@/components/puzzle/FishSprite';
import { PuzzleBackground } from '@/components/puzzle/PuzzleBackground';
import fishData from '@/data/fish.json';
import { getUnlockedFish } from '@/data';
import { bonusPercent } from '@/game/rewards';
import type { FishDef, Rarity } from '@/game/types';
import { useGameStore } from '@/store/gameStore';

const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b0bec5',
  rare: '#4fc3f7',
  epic: '#ba68c8',
  legendary: '#ffd54f',
};

const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

const GOLD = '#ffd54f';
const AQUA = '#4fc3f7';
const SPECIAL = '#ff80ab';
const PANEL = 'rgba(6,28,58,0.58)';

// Izgara sütun sayısı sabittir (FlatList numColumns çalışırken değişemez).
const COLUMNS = 3;
const GAP = 10;

type Filter = 'all' | Rarity;
type Spacer = { id: number; spacer: true };
type Item = FishDef | Spacer;

const isSpacer = (item: Item): item is Spacer => 'spacer' in item;
const isStoreOnly = (f: FishDef) => (f as FishDef & { storeOnly?: boolean }).storeOnly === true;

// Mağazaya özel canlılar: normal ızgaradan ayrı, en altta gösterilir.
const SPECIAL_FISH: FishDef[] = (fishData as unknown as FishDef[]).filter(isStoreOnly);

// ---------------------------------------------------------------------------
// Balık kartı. Çok sayıda balık olacağı için memo: yalnızca kendi verisi değişince yeniden çizilir.
// ---------------------------------------------------------------------------

const FishCard = memo(function FishCard({
  fish,
  owned,
  special = false,
}: {
  fish: FishDef;
  owned: boolean;
  special?: boolean;
}) {
  const { t } = useTranslation();
  const color = special ? SPECIAL : RARITY_COLOR[fish.rarity];
  const label = special ? t('collection.special') : t(`rarity.${fish.rarity}`);

  return (
    <View
      style={[
        styles.card,
        special && styles.cardSpecial,
        owned ? { borderColor: `${color}aa` } : styles.cardLocked,
      ]}
      accessible
      accessibilityLabel={
        owned
          ? `${t('collection.a11yOwned', { name: fish.name, label })}${
              fish.bonusPct > 0 ? t('collection.a11yBonus', { pct: fish.bonusPct }) : ''
            }`
          : t('collection.a11yLocked', { label })
      }
    >
      <View style={styles.iconArea}>
        <View
          style={[
            styles.iconBackdrop,
            owned && styles.iconBackdropOwned,
            owned && special && styles.iconBackdropSpecial,
          ]}
        />
        {owned ? (
          <FishSprite id={fish.id} width={56} animated={false} />
        ) : (
          <Text style={styles.unknownMark}>?</Text>
        )}
      </View>

      <Text style={[styles.name, !owned && styles.nameLocked]} numberOfLines={1}>
        {owned ? fish.name : special ? t('collection.inStore') : t('collection.unknown')}
      </Text>

      <Text style={[styles.rarity, { color }]}>{label}</Text>

      <View style={[styles.bonusPill, special && styles.bonusPillSpecial, (!owned || fish.bonusPct === 0) && styles.bonusPillHidden]}>
        <Text style={[styles.bonusText, special && { color: SPECIAL }]}>
          {t('common.plusPercent', { pct: fish.bonusPct })}
        </Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Ekran
// ---------------------------------------------------------------------------

export default function CollectionScreen() {
  const { t } = useTranslation();
  const currentLevel = useGameStore((s) => s.currentLevel);
  const ownedFish = useGameStore((s) => s.ownedFish);

  const [filter, setFilter] = useState<Filter>('all');

  // Ana ızgara: mağazaya özel canlılar hariç.
  const fishList = useMemo(
    () => getUnlockedFish(currentLevel).filter((f) => !isStoreOnly(f)),
    [currentLevel]
  );
  const ownedCount = useMemo(
    () => fishList.filter((f) => (ownedFish[f.id] ?? 0) > 0).length,
    [fishList, ownedFish]
  );
  // Bonus, özel canlıları da kapsar.
  const bonus = useMemo(
    () => bonusPercent(ownedFish, [...fishList, ...SPECIAL_FISH]),
    [ownedFish, fishList]
  );
  const progress = fishList.length > 0 ? Math.min(1, ownedCount / fishList.length) : 0;

  const specialOwned = useMemo(
    () => SPECIAL_FISH.filter((f) => (ownedFish[f.id] ?? 0) > 0).length,
    [ownedFish]
  );

  // Filtrelenmiş liste, son satırdaki boşluk kadar görünmez kartla tamamlanır
  // (yoksa son satırdaki kartlar genişleyip yamuk görünür).
  const data = useMemo<Item[]>(() => {
    const list: Item[] = fishList.filter((f) => filter === 'all' || f.rarity === filter);
    const remainder = list.length % COLUMNS;
    if (remainder !== 0) {
      for (let i = 0; i < COLUMNS - remainder; i++) list.push({ id: -(i + 1), spacer: true });
    }
    return list;
  }, [fishList, filter]);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('collection.title')}</Text>
        <View style={styles.bonusBadge}>
          <Text style={styles.bonusBadgeLabel}>{t('collection.bonus')}</Text>
          <Text style={styles.bonusBadgeValue}>{t('common.plusPercent', { pct: bonus })}</Text>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{t('collection.fish')}</Text>
          <Text style={styles.progressCount}>
            {ownedCount}/{fishList.length}
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <View style={styles.chips}>
        {(['all', ...RARITY_ORDER] as Filter[]).map((key) => {
          const selected = filter === key;
          const color = key === 'all' ? AQUA : RARITY_COLOR[key];
          return (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                selected ? { backgroundColor: color, borderColor: color } : null,
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {key === 'all' ? t('collection.all') : t(`rarity.${key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const footer =
    SPECIAL_FISH.length > 0 ? (
      <View style={styles.specialSection}>
        <View style={styles.specialHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.specialTitle}>{t('collection.specialTitle')}</Text>
            <Text style={styles.specialSub}>{t('collection.specialSub')}</Text>
          </View>
          <Text style={styles.specialCount}>
            {specialOwned}/{SPECIAL_FISH.length}
          </Text>
        </View>

        <View style={styles.specialRow}>
          {SPECIAL_FISH.map((f) => (
            <FishCard key={f.id} fish={f} owned={(ownedFish[f.id] ?? 0) > 0} special />
          ))}
          {/* Son satırı tamamla ki kartlar ana ızgarayla aynı genişlikte kalsın */}
          {SPECIAL_FISH.length % COLUMNS !== 0
            ? Array.from({ length: COLUMNS - (SPECIAL_FISH.length % COLUMNS) }).map((_, i) => (
                <View key={`sp-${i}`} style={styles.spacer} />
              ))
            : null}
        </View>
      </View>
    ) : null;

  return (
    <View style={styles.root}>
      <PuzzleBackground />

      <SafeAreaView style={styles.container} edges={['top']}>
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={<Text style={styles.empty}>{t('collection.emptyFilter')}</Text>}
          renderItem={({ item }) =>
            isSpacer(item) ? (
              <View style={styles.spacer} />
            ) : (
              <FishCard fish={item} owned={(ownedFish[item.id] ?? 0) > 0} />
            )
          }
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={9}
          windowSize={7}
          removeClippedSubviews
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b3d5c',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: GAP,
  },
  row: {
    gap: GAP,
  },

  header: {
    gap: 14,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0,20,50,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: PANEL,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  bonusBadgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b0c8d8',
  },
  bonusBadgeValue: {
    fontSize: 17,
    fontWeight: '900',
    color: GOLD,
  },

  progressBlock: {
    gap: 7,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0,20,50,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '800',
    color: GOLD,
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(6,28,58,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: AQUA,
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: PANEL,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  chipTextSelected: {
    color: '#06263d',
  },

  card: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    backgroundColor: PANEL,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
  },
  cardSpecial: {
    backgroundColor: 'rgba(60,18,56,0.55)',
    borderColor: 'rgba(255,128,171,0.35)',
  },
  cardLocked: {
    backgroundColor: 'rgba(6,28,58,0.38)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  spacer: {
    flex: 1,
  },
  iconArea: {
    width: '100%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackdrop: {
    position: 'absolute',
    width: 62,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconBackdropOwned: {
    backgroundColor: 'rgba(79,195,247,0.16)',
  },
  iconBackdropSpecial: {
    backgroundColor: 'rgba(255,128,171,0.2)',
  },
  unknownMark: {
    fontSize: 26,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.35)',
  },
  name: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  nameLocked: {
    color: 'rgba(255,255,255,0.45)',
  },
  rarity: {
    fontSize: 11,
    fontWeight: '700',
  },
  bonusPill: {
    marginTop: 2,
    backgroundColor: 'rgba(255,213,79,0.16)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bonusPillSpecial: {
    backgroundColor: 'rgba(255,128,171,0.18)',
  },
  bonusPillHidden: {
    opacity: 0,
  },
  bonusText: {
    fontSize: 11,
    fontWeight: '800',
    color: GOLD,
  },

  specialSection: {
    marginTop: 18,
    gap: 12,
    padding: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(40,10,50,0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,128,171,0.3)',
  },
  specialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  specialTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: SPECIAL,
    textShadowColor: 'rgba(0,20,50,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  specialSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d7b8cc',
  },
  specialCount: {
    fontSize: 15,
    fontWeight: '800',
    color: GOLD,
  },
  specialRow: {
    flexDirection: 'row',
    gap: GAP,
  },

  empty: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 14,
    color: '#b0c8d8',
  },
});