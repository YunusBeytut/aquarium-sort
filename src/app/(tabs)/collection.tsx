import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FishSprite } from '@/components/puzzle/FishSprite';
import { getUnlockedFish } from '@/data';
import { bonusPercent } from '@/game/rewards';
import type { Rarity } from '@/game/types';
import { useGameStore } from '@/store/gameStore';

const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b0bec5',
  rare: '#4fc3f7',
  epic: '#ba68c8',
  legendary: '#ffd54f',
};

export default function CollectionScreen() {
  const currentLevel = useGameStore((s) => s.currentLevel);
  const ownedFish = useGameStore((s) => s.ownedFish);

  const fishList = getUnlockedFish(currentLevel);
  const ownedCount = fishList.filter((f) => (ownedFish[f.id] ?? 0) > 0).length;
  const bonus = bonusPercent(ownedFish, fishList);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Koleksiyon</Text>
          <Text style={styles.summary}>
            {ownedCount}/{fishList.length}  ·  bonus +%{bonus}
          </Text>
        </View>

        <View style={styles.grid}>
          {fishList.map((fish) => {
            const owned = (ownedFish[fish.id] ?? 0) > 0;
            return (
              <View key={fish.id} style={styles.fishCard}>
                <View style={styles.fishIcon}>
                  {owned ? (
                    <FishSprite id={fish.id} width={56} animated={false} />
                  ) : (
                    <View style={styles.fishUnknown}>
                      <Text style={styles.fishUnknownText}>?</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.fishName} numberOfLines={1}>
                  {owned ? fish.name : '???'}
                </Text>
                <Text style={[styles.fishRarity, { color: RARITY_COLOR[fish.rarity] }]}>
                  {fish.rarity}
                </Text>
                {owned && <Text style={styles.fishBonus}>+%{fish.bonusPct}</Text>}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b3d5c',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  summary: {
    fontSize: 14,
    color: '#b0c8d8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fishCard: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 3,
  },
  fishIcon: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fishUnknown: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#37474f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fishUnknownText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#90a4ae',
  },
  fishName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  fishRarity: {
    fontSize: 11,
  },
  fishBonus: {
    fontSize: 11,
    color: '#b0c8d8',
  },
});