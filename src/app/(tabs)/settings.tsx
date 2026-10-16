import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGameStore } from '@/store/gameStore';

export default function SettingsScreen() {
  const settings = useGameStore((s) => s.settings);
  const stats = useGameStore((s) => s.stats);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const resetProgress = useGameStore((s) => s.resetProgress);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ayarlar</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Ses</Text>
            <Switch
              value={settings.sound}
              onValueChange={(sound) => updateSettings({ sound })}
              trackColor={{ false: '#37474f', true: '#4fc3f7' }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Titreşim</Text>
            <Switch
              value={settings.haptics}
              onValueChange={(haptics) => updateSettings({ haptics })}
              trackColor={{ false: '#37474f', true: '#4fc3f7' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Oynanan level</Text>
            <Text style={styles.value}>{stats.levelsPlayed}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Toplam hamle</Text>
            <Text style={styles.value}>{stats.totalMoves}</Text>
          </View>
        </View>

        {__DEV__ && (
          <Pressable onPress={resetProgress} style={styles.resetButton}>
            <Text style={styles.resetText}>[Geliştirici] İlerlemeyi sıfırla</Text>
          </Pressable>
        )}
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  label: {
    fontSize: 16,
    color: '#ffffff',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b0c8d8',
  },
  resetButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  resetText: {
    fontSize: 12,
    color: '#ef9a9a',
  },
});