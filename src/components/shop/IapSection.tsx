import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { SoundManager } from '@/audio/SoundManager';
import { PearlIcon } from '@/components/aquarium/EggArt';
import {
  NO_ADS_PRODUCT,
  PEARL_PACKS,
  buyItem,
  initPurchases,
  loadStoreItems,
  restorePurchases,
  type StoreItem,
} from '@/purchases';
import { useGameStore } from '@/store/gameStore';

const COLORS = {
  gold: '#ffd54f',
  goldEdge: '#c99a14',
  goldText: '#4a3500',
  panel: 'rgba(6,28,58,0.62)',
  panelBorder: 'rgba(255,255,255,0.16)',
  soft: '#b0c8d8',
};

const PACK_IDS = Object.keys(PEARL_PACKS).sort((a, b) => PEARL_PACKS[a] - PEARL_PACKS[b]);

function PriceButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.btn,
        disabled && styles.btnDisabled,
        pressed && styles.btnPressed,
      ]}
    >
      <Text style={[styles.btnText, disabled && styles.btnTextDisabled]}>{label}</Text>
    </Pressable>
  );
}

export function IapSection() {
  const { t } = useTranslation();
  const noAds = useGameStore((s) => s.noAds);
  const hapticsEnabled = useGameStore((s) => s.settings.haptics);

  const [items, setItems] = useState<Record<string, StoreItem>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (await initPurchases()) {
        const list = await loadStoreItems();
        if (alive) setItems(list);
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const buy = async (item: StoreItem) => {
    if (busy) return;
    setBusy(true);
    setNote('');
    const result = await buyItem(item);
    setBusy(false);
    if (result === 'ok') {
      if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      SoundManager.play('helperUse');
      setNote(t('iap.thanks'));
    } else if (result === 'pending') {
      setNote(t('iap.pending'));
    } else if (result === 'error') {
      setNote(t('iap.error'));
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    setNote('');
    const ok = await restorePurchases();
    setBusy(false);
    setNote(ok ? t('iap.restored') : t('iap.restoreError'));
  };

  if (loading) return <ActivityIndicator color="#ffffff" />;

  const packs = PACK_IDS.filter((id) => items[id]);
  const noAdsItem = items[NO_ADS_PRODUCT];
  // Mağaza kullanılamıyorsa (anahtar yok, çevrimdışı) bölüm hiç görünmez.
  if (packs.length === 0 && !noAdsItem) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('iap.title')}</Text>

      <View style={styles.packRow}>
        {packs.map((id) => (
          <View key={id} style={styles.pack}>
            <PearlIcon size={30} />
            <Text style={styles.packAmount}>{PEARL_PACKS[id]}</Text>
            <PriceButton label={items[id].priceString} disabled={busy} onPress={() => buy(items[id])} />
          </View>
        ))}
      </View>

      {noAdsItem && (
        <View style={styles.noAdsCard}>
          <View style={styles.noAdsInfo}>
            <Text style={styles.noAdsName}>{t('iap.noAds')}</Text>
            <Text style={styles.noAdsSub}>{noAds ? t('iap.noAdsActive') : t('iap.noAdsSub')}</Text>
          </View>
          {!noAds && (
            <PriceButton
              label={noAdsItem.priceString}
              disabled={busy}
              onPress={() => buy(noAdsItem)}
            />
          )}
        </View>
      )}

      {note !== '' && <Text style={styles.note}>{note}</Text>}

      <Pressable onPress={restore} disabled={busy} accessibilityRole="button">
        <Text style={styles.restore}>{t('iap.restore')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0,20,50,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  packRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pack: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  packAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  noAdsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: COLORS.panel,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noAdsInfo: {
    flex: 1,
  },
  noAdsName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  noAdsSub: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.soft,
  },
  btn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 84,
    borderRadius: 14,
    borderBottomWidth: 4,
    paddingHorizontal: 10,
    backgroundColor: COLORS.gold,
    borderBottomColor: COLORS.goldEdge,
  },
  btnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  btnPressed: {
    transform: [{ translateY: 3 }],
    opacity: 0.92,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.goldText,
  },
  btnTextDisabled: {
    color: 'rgba(255,255,255,0.42)',
  },
  note: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
    textAlign: 'center',
  },
  restore: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.soft,
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: 6,
  },
});