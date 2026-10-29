import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FEEDBACK_URL } from '@/config/links';
import { useGameStore } from '@/store/gameStore';

const MAX_LENGTH = 1000;
const TIMEOUT_MS = 15000;

const GOLD = '#ffd54f';
const GOLD_EDGE = '#c99a14';
const GOLD_TEXT = '#4a3500';
const PANEL_BORDER = 'rgba(255,255,255,0.18)';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

type Status = 'idle' | 'sending' | 'sent';

function CheckIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24">
      <Path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke="#06263d"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

function FeedbackModalBase({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const currentLevel = useGameStore((s) => s.currentLevel);

  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);

  // Her açılışta temiz bir form.
  useEffect(() => {
    if (visible) {
      setMessage('');
      setEmail('');
      setStatus('idle');
      setError(null);
      sendingRef.current = false;
    }
  }, [visible]);

  const send = async () => {
    if (sendingRef.current) return;

    const text = message.trim();
    const mail = email.trim();
    if (!text) {
      setError(t('feedback.errorEmpty'));
      return;
    }
    if (mail && !EMAIL_RE.test(mail)) {
      setError(t('feedback.errorEmail'));
      return;
    }

    sendingRef.current = true;
    setError(null);
    setStatus('sending');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(FEEDBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          message: text,
          ...(mail ? { email: mail } : {}),
          _subject: 'Aquarium Sort geri bildirim',
          app: 'Aquarium Sort',
          version: Constants.expoConfig?.version ?? 'unknown',
          platform: `${Platform.OS} ${Platform.Version}`,
          level: currentLevel,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setStatus('sent');
      if (useGameStore.getState().settings.haptics) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setStatus('idle');
      setError(t('feedback.errorSend'));
    } finally {
      clearTimeout(timer);
      sendingRef.current = false;
    }
  };

  const sending = status === 'sending';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={sending ? undefined : onClose} />

        <View style={styles.card}>
          {status === 'sent' ? (
            <View style={styles.thanks}>
              <View style={styles.thanksBadge}>
                <CheckIcon />
              </View>
              <Text style={styles.title}>{t('feedback.thanksTitle')}</Text>
              <Text style={styles.subtitle}>{t('feedback.thanksBody')}</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnGold,
                  styles.btnStretch,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.btnText}>{t('feedback.close')}</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.form}
            >
              <Text style={styles.title}>{t('feedback.title')}</Text>
              <Text style={styles.subtitle}>{t('feedback.subtitle')}</Text>

              <TextInput
                value={message}
                onChangeText={(v) => {
                  setMessage(v);
                  if (error) setError(null);
                }}
                placeholder={t('feedback.messagePlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={[styles.input, styles.inputMessage]}
                multiline
                maxLength={MAX_LENGTH}
                textAlignVertical="top"
                editable={!sending}
                accessibilityLabel={t('feedback.messagePlaceholder')}
              />
              <Text style={styles.counter}>
                {message.length}/{MAX_LENGTH}
              </Text>

              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (error) setError(null);
                }}
                placeholder={t('feedback.emailPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!sending}
                accessibilityLabel={t('feedback.emailPlaceholder')}
              />

              <Text style={styles.privacyNote}>{t('feedback.privacyNote')}</Text>

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                onPress={send}
                disabled={sending}
                accessibilityRole="button"
                accessibilityState={{ disabled: sending, busy: sending }}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnGold,
                  sending && styles.btnDisabled,
                  pressed && !sending && styles.btnPressed,
                ]}
              >
                {sending && <ActivityIndicator size="small" color={GOLD_TEXT} />}
                <Text style={styles.btnText}>{sending ? t('feedback.sending') : t('feedback.send')}</Text>
              </Pressable>

              <Pressable
                onPress={onClose}
                disabled={sending}
                accessibilityRole="button"
                style={styles.cancel}
              >
                <Text style={[styles.cancelText, sending && styles.cancelDisabled]}>
                  {t('feedback.cancel')}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const FeedbackModal = memo(FeedbackModalBase);
export default FeedbackModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6,28,58,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '100%',
    backgroundColor: 'rgba(11,61,92,0.96)',
    borderWidth: 1.5,
    borderColor: PANEL_BORDER,
    borderRadius: 26,
    padding: 18,
  },
  form: {
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#b0c8d8',
    textAlign: 'center',
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(6,28,58,0.65)',
    borderWidth: 1.5,
    borderColor: PANEL_BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#ffffff',
  },
  inputMessage: {
    minHeight: 120,
    maxHeight: 200,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: -4,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  privacyNote: {
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(176,200,216,0.8)',
    textAlign: 'center',
  },
  error: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffab91',
    textAlign: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 16,
    borderBottomWidth: 4,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  btnGold: {
    backgroundColor: GOLD,
    borderBottomColor: GOLD_EDGE,
  },
  btnStretch: {
    alignSelf: 'stretch',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnPressed: {
    transform: [{ translateY: 3 }],
    opacity: 0.92,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: GOLD_TEXT,
  },
  cancel: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b0c8d8',
  },
  cancelDisabled: {
    opacity: 0.4,
  },

  thanks: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  thanksBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#80cbc4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});