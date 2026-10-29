import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { SoundManager } from '@/audio/SoundManager';
import { PuzzleBackground } from '@/components/puzzle/PuzzleBackground';
import { CloudSaveSection } from '@/components/ui/CloudSaveSection';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { PRIVACY_POLICY_URL } from '@/config/links';
import { useGameStore } from '@/store/gameStore';

const AQUA = '#4fc3f7';
const OFF = 'rgba(255,255,255,0.4)';
const PANEL = 'rgba(6,28,58,0.58)';
const PANEL_BORDER = 'rgba(255,255,255,0.16)';

// ---------------------------------------------------------------------------
// İkonlar (açıkken mavi, kapalıyken sönük)
// ---------------------------------------------------------------------------

function SoundIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M4 9v6h4l5 4V5L8 9H4z" fill={color} />
      <Path d="M16 9a4 4 0 0 1 0 6" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M18.5 6.5a8 8 0 0 1 0 11" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function MusicIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M9 18V6l10-2v12" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx="7" cy="18" r="2.6" fill={color} />
      <Circle cx="17" cy="16" r="2.6" fill={color} />
    </Svg>
  );
}

function VibrateIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x="8" y="3.5" width="8" height="17" rx="2.2" fill="none" stroke={color} strokeWidth={2} />
      <Path d="M4 8v8M20 8v8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ChatIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M8 10h8M8 13h5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M9 12l2 2 4-4"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Bileşenler
// ---------------------------------------------------------------------------

function SettingRow({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: (color: string) => ReactNode;
  label: string;
  hint: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    // Satırın tamamı dokunulabilir: sadece küçük anahtarı hedeflemek gerekmez.
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      style={styles.row}
    >
      <View style={[styles.iconTile, value && styles.iconTileOn]}>{icon(value ? AQUA : OFF)}</View>
      <View style={styles.rowTexts}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: 'rgba(255,255,255,0.18)', true: AQUA }}
        thumbColor="#ffffff"
        ios_backgroundColor="rgba(255,255,255,0.18)"
      />
    </Pressable>
  );
}

// Bir sayfaya ya da pencereye götüren satır (anahtarsız).
function LinkRow({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: (color: string) => ReactNode;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.iconTile, styles.iconTileOn]}>{icon(AQUA)}</View>
      <View style={styles.rowTexts}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <ChevronIcon />
    </Pressable>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ekran
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useGameStore((s) => s.settings);
  const stats = useGameStore((s) => s.stats);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const resetProgress = useGameStore((s) => s.resetProgress);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const version = Constants.expoConfig?.version;

  // Uygulama içi tarayıcıda açılır; olmazsa sistem tarayıcısına düşer.
  const openPrivacy = async () => {
    try {
      await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
    } catch {
      void Linking.openURL(PRIVACY_POLICY_URL);
    }
  };

  // Açarken küçük bir örnek verilir: kullanıcı ne açtığını hemen duyar/hisseder.
  const setSound = (sound: boolean) => {
    updateSettings({ sound });
    if (sound) SoundManager.play('helperUse');
  };
  const setMusic = (music: boolean) => updateSettings({ music });
  const setHaptics = (haptics: boolean) => {
    updateSettings({ haptics });
    if (haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.root}>
      <PuzzleBackground />

      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{t('settings.title')}</Text>

          <CloudSaveSection />

          <View style={styles.panel}>
            <SettingRow
              icon={(c) => <SoundIcon color={c} />}
              label={t('settings.sound')}
              hint={t('settings.soundHint')}
              value={settings.sound}
              onChange={setSound}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={(c) => <MusicIcon color={c} />}
              label={t('settings.music')}
              hint={t('settings.musicHint')}
              value={settings.music}
              onChange={setMusic}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={(c) => <VibrateIcon color={c} />}
              label={t('settings.haptics')}
              hint={t('settings.hapticsHint')}
              value={settings.haptics}
              onChange={setHaptics}
            />
          </View>

          <View style={styles.panel}>
            <LinkRow
              icon={(c) => <ChatIcon color={c} />}
              label={t('settings.feedback')}
              hint={t('settings.feedbackHint')}
              onPress={() => setFeedbackOpen(true)}
            />
            <View style={styles.divider} />
            <LinkRow
              icon={(c) => <ShieldIcon color={c} />}
              label={t('settings.privacy')}
              hint={t('settings.privacyHint')}
              onPress={openPrivacy}
            />
          </View>

          <View style={styles.statsRow}>
            <StatTile value={stats.levelsPlayed} label={t('settings.levelsPlayed')} />
            <StatTile value={stats.totalMoves} label={t('settings.totalMoves')} />
          </View>

          {version ? <Text style={styles.version}>{t('settings.version', { v: version })}</Text> : null}

          {__DEV__ && (
            <Pressable onPress={resetProgress} style={styles.resetButton}>
              <Text style={styles.resetText}>{'[Geliştirici] İlerlemeyi sıfırla'}</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>

      <FeedbackModal visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
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
    gap: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0,20,50,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  panel: {
    backgroundColor: PANEL,
    borderWidth: 1.5,
    borderColor: PANEL_BORDER,
    borderRadius: 24,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  iconTileOn: {
    backgroundColor: 'rgba(79,195,247,0.16)',
  },
  rowTexts: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  hint: {
    fontSize: 12,
    color: '#b0c8d8',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: PANEL,
    borderWidth: 1.5,
    borderColor: PANEL_BORDER,
    borderRadius: 20,
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffd54f',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b0c8d8',
  },

  version: {
    alignSelf: 'center',
    fontSize: 12,
    color: 'rgba(176,200,216,0.7)',
  },

  resetButton: {
    alignSelf: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(239,154,154,0.4)',
    backgroundColor: 'rgba(239,154,154,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef9a9a',
  },
});