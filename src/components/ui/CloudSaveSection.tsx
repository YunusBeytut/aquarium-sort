import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  deleteCloudAccount,
  signInWithGoogle,
  signOutCloud,
  useCloudUser,
} from '@/services/cloudSave';

// Ayarlar ekranına eklenen "Google ile bağla" kartı.
export function CloudSaveSection() {
  const { t } = useTranslation();
  const user = useCloudUser();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      console.warn('[cloudSave]', err.code, err.message);
      const base = t('cloud.error', { defaultValue: 'Something went wrong. Check your connection and try again.' });
      // Geçici teşhis: hata kodu başlıkta kesilmesin diye mesaj kısmında gösterilir.
      Alert.alert(base, `${err.code ?? ''} ${err.message ?? ''}`.trim() || undefined);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      t('cloud.deleteTitle', { defaultValue: 'Delete account?' }),
      t('cloud.deleteBody', {
        defaultValue: 'Your cloud save and account will be deleted. Progress on this device stays.',
      }),
      [
        { text: t('cloud.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('cloud.delete', { defaultValue: 'Delete' }),
          style: 'destructive',
          onPress: () => void run(deleteCloudAccount),
        },
      ]
    );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('cloud.title', { defaultValue: 'Save your progress' })}</Text>
      <Text style={styles.hint}>
        {user
          ? t('cloud.signedInAs', { name: user.email ?? user.displayName ?? '', defaultValue: 'Signed in as {{name}}' })
          : t('cloud.hint', { defaultValue: 'Link your Google account to keep your progress on a new phone.' })}
      </Text>

      {user ? (
        <View style={styles.row}>
          <Pressable
            disabled={busy}
            onPress={() => void run(signOutCloud)}
            style={({ pressed }) => [styles.btn, styles.btnGold, pressed && styles.pressed, busy && styles.dim]}
          >
            <Text style={styles.btnGoldText}>{t('cloud.signOut', { defaultValue: 'Sign out' })}</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={confirmDelete}
            style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed, busy && styles.dim]}
          >
            <Text style={styles.btnGhostText}>{t('cloud.deleteAccount', { defaultValue: 'Delete account' })}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          disabled={busy}
          onPress={() => void run(signInWithGoogle)}
          style={({ pressed }) => [styles.btn, styles.btnAqua, pressed && styles.pressed, busy && styles.dim]}
        >
          <Text style={styles.btnAquaText}>{t('cloud.signIn', { defaultValue: 'Sign in with Google' })}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    backgroundColor: 'rgba(6,28,58,0.62)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 22,
    padding: 14,
  },
  title: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  hint: { fontSize: 12, lineHeight: 16, color: '#b0c8d8' },
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  btnAqua: { backgroundColor: '#4fc3f7', borderBottomColor: '#1f8fc0' },
  btnAquaText: { fontSize: 15, fontWeight: '900', color: '#06263d' },
  btnGold: { backgroundColor: '#ffd54f', borderBottomColor: '#c99a14' },
  btnGoldText: { fontSize: 15, fontWeight: '900', color: '#4a3500' },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.14)', borderBottomColor: 'rgba(255,255,255,0.07)' },
  btnGhostText: { fontSize: 14, fontWeight: '800', color: '#ffab91' },
  pressed: { transform: [{ translateY: 3 }], opacity: 0.92 },
  dim: { opacity: 0.5 },
});