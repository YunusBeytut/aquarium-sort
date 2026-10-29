import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

// Yetenek hakkı bitince açılan pencere: video izle ya da inciyle al.
type Props = {
  visible: boolean;
  name: string; // "Geri al" / "Kavanoz"
  amount: number; // her seferinde verilen hak
  price: number; // inci bedeli
  pearls: number;
  adReady: boolean;
  notice?: string | null;
  onWatch: () => void;
  onBuy: () => void;
  onClose: () => void;
};

export function BoosterRefillModal({
  visible,
  name,
  amount,
  price,
  pearls,
  adReady,
  notice,
  onWatch,
  onBuy,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const canBuy = pearls >= price;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('refill.title', { name })}</Text>
          <Text style={styles.sub}>{t('refill.sub')}</Text>

          <Pressable
            onPress={onWatch}
            disabled={!adReady}
            style={[styles.btn, styles.watch, !adReady && styles.off]}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>{t('refill.watch', { amount })}</Text>
          </Pressable>

          <Pressable
            onPress={onBuy}
            disabled={!canBuy}
            style={[styles.btn, styles.buy, !canBuy && styles.off]}
            accessibilityRole="button"
          >
            <Text style={[styles.btnText, { color: '#4a3500' }]}>
              {t('refill.buy', { count: price, amount })}
            </Text>
          </Pressable>

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
            <Text style={styles.closeText}>{t('refill.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,14,34,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0d3b7a',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 20,
    gap: 12,
    alignItems: 'stretch',
  },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center', marginBottom: 4 },
  btn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4 },
  watch: { backgroundColor: '#5fd6a8', borderBottomColor: '#2a9a72' },
  buy: { backgroundColor: '#ffd54f', borderBottomColor: '#c99a14' },
  off: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#06304d' },
  notice: { color: '#ffcc80', fontSize: 13, textAlign: 'center' },
  close: { alignSelf: 'center', paddingVertical: 4 },
  closeText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700' },
});