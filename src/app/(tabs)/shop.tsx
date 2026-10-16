import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EggModal } from '@/components/aquarium/EggModal';
import { EGG_PRICE } from '@/game/economy';
import type { EggResult } from '@/game/eggs';
import type { EggKind } from '@/game/types';
import { useGameStore } from '@/store/gameStore';

const EGG_LABEL: Record<EggKind, string> = {
  normal: 'Normal yumurta',
  rare: 'Nadir yumurta',
};

export default function ShopScreen() {
  const pearls = useGameStore((s) => s.pearls);
  const eggs = useGameStore((s) => s.eggs);
  const openEgg = useGameStore((s) => s.openEgg);
  const buyEgg = useGameStore((s) => s.buyEgg);

  const [lastEgg, setLastEgg] = useState<EggResult | null>(null);
  const [openedKind, setOpenedKind] = useState<EggKind>('normal');

  const handleOpen = (kind: EggKind) => {
    const result = openEgg(kind);
    if (result) {
      setOpenedKind(kind);
      setLastEgg(result);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mağaza</Text>
          <View style={styles.pearlPill}>
            <Text style={styles.pearlValue}>{pearls}</Text>
            <Text style={styles.pearlLabel}>inci</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Yumurtalar</Text>
        {(['normal', 'rare'] as EggKind[]).map((kind) => (
          <View key={kind} style={styles.eggRow}>
            <View style={styles.eggInfo}>
              <Text style={styles.eggName}>{EGG_LABEL[kind]}</Text>
              <Text style={styles.eggCount}>Sahip olunan: {eggs[kind]}</Text>
            </View>
            <Pressable
              style={[styles.smallButton, eggs[kind] <= 0 && styles.disabled]}
              disabled={eggs[kind] <= 0}
              onPress={() => handleOpen(kind)}
            >
              <Text style={styles.smallButtonText}>Aç</Text>
            </Pressable>
            <Pressable
              style={[styles.smallButton, pearls < EGG_PRICE[kind] && styles.disabled]}
              disabled={pearls < EGG_PRICE[kind]}
              onPress={() => buyEgg(kind)}
            >
              <Text style={styles.smallButtonText}>Al {EGG_PRICE[kind]}</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Dekorlar</Text>
        <View style={styles.soon}>
          <Text style={styles.soonText}>Yakında</Text>
        </View>
      </ScrollView>

      <EggModal
        visible={!!lastEgg}
        kind={openedKind}
        result={lastEgg}
        eggsLeft={eggs[openedKind]}
        onClose={() => setLastEgg(null)}
        onOpenAnother={() => handleOpen(openedKind)}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  pearlPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pearlValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  pearlLabel: {
    fontSize: 12,
    color: '#b0c8d8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 6,
  },
  eggRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
  },
  eggInfo: {
    flex: 1,
  },
  eggName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  eggCount: {
    fontSize: 12,
    color: '#b0bec5',
    marginTop: 2,
  },
  smallButton: {
    backgroundColor: '#7fdbff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b3d5c',
  },
  disabled: {
    opacity: 0.35,
  },
  soon: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  soonText: {
    fontSize: 14,
    color: '#90a4ae',
  },
});