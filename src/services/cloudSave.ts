import {
  GoogleAuthProvider,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithCredential,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import { deleteDoc, doc, getDoc, getFirestore, setDoc } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import i18n from 'i18next';
import { useEffect, useState } from 'react';
import { Alert, AppState } from 'react-native';

import type { PlayerState } from '@/game/types';
import { restorePurchases } from '@/purchases';
import { STATE_VERSION, initialPlayer, useGameStore } from '@/store/gameStore';
import { mmkvStorage } from '@/store/persist';

// Firebase Authentication > Google > Web SDK configuration'daki Web client ID (gizli değildir).
const WEB_CLIENT_ID = '746730133159-c3t9i3dq5d2enq9bikm2vrm7542i7hgk.apps.googleusercontent.com';
const LINKED_KEY = 'cloud-linked-uid';
const DEBOUNCE_MS = 5000;

// Buluta giden alanlar. Ayarlar cihaza özel kalır, noAds'ın kaynağı RevenueCat'tir.
type Synced = Omit<PlayerState, 'settings' | 'noAds'>;
type CloudDoc = { data: Synced; updatedAt: number };

const tr = (key: string, defaultValue: string, opts?: Record<string, unknown>) =>
  String(i18n.t(key, { defaultValue, ...opts }));

function pick(s: PlayerState): Synced {
  return {
    version: s.version,
    currentLevel: s.currentLevel,
    pearls: s.pearls,
    ownedFish: s.ownedFish,
    ownedDecor: s.ownedDecor,
    selectedBackground: s.selectedBackground,
    selectedAccessories: s.selectedAccessories,
    eggs: s.eggs,
    food: s.food,
    boosters: s.boosters,
    tutorialDone: s.tutorialDone,
    daily: s.daily,
    stats: s.stats,
    pity: s.pity,
    dupStreak: s.dupStreak,
  };
}

const fishCount = (p: Synced) => Object.keys(p.ownedFish ?? {}).length;
// İlerleme puanı: önce level, sonra balık sayısı.
const score = (p: Synced) => p.currentLevel * 1000 + fishCount(p);
const isFresh = (p: Synced) => p.currentLevel <= 1 && fishCount(p) === 0 && p.stats.levelsPlayed === 0;
const isValid = (p: unknown): p is Synced =>
  !!p && typeof (p as Synced).currentLevel === 'number' && typeof (p as Synced).pearls === 'number';

// Firebase'in tür adı sürümler arasında değiştiği için dönüş tipinden çıkarılır.
export type CloudUser = NonNullable<ReturnType<typeof getAuth>['currentUser']>;

const userRef = (uid: string) => doc(getFirestore(), 'users', uid);

let uid: string | null = null;
let enabled = false; // çakışma çözülmeden buluta yazılmaz
let resolving = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastSent = '';

async function push() {
  if (!uid) return;
  const data = pick(useGameStore.getState());
  const json = JSON.stringify(data);
  if (json === lastSent) return;
  try {
    await setDoc(userRef(uid), { data, updatedAt: Date.now() });
    lastSent = json;
  } catch {
    // Çevrimdışı ya da geçici hata: sonraki değişiklikte yeniden denenir.
  }
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void push(), DEBOUNCE_MS);
}

async function flush() {
  if (!enabled || !uid) return;
  if (timer) clearTimeout(timer);
  timer = null;
  await push();
}

function stop() {
  enabled = false;
  if (timer) clearTimeout(timer);
  timer = null;
}

function askWhich(cloudLevel: number, localLevel: number): Promise<'cloud' | 'local'> {
  return new Promise((resolve) => {
    const cloudBtn = {
      text: tr('cloud.useCloud', 'Use cloud save'),
      onPress: () => resolve('cloud'),
    };
    const localBtn = {
      text: tr('cloud.useLocal', 'Use this device'),
      onPress: () => resolve('local'),
    };
    Alert.alert(
      tr('cloud.conflictTitle', 'Two saves found'),
      tr('cloud.conflictBody', 'Cloud save: Level {{cloud}}\nThis device: Level {{local}}\n\nThe one you don\'t pick will be overwritten.', {
        cloud: cloudLevel,
        local: localLevel,
      }),
      cloudLevel >= localLevel ? [cloudBtn, localBtn] : [localBtn, cloudBtn],
      { cancelable: false }
    );
  });
}

function applyCloud(data: Synced) {
  const cur = useGameStore.getState();
  useGameStore.setState({
    ...initialPlayer,
    ...data,
    version: STATE_VERSION,
    settings: cur.settings,
    noAds: cur.noAds,
  });
  lastSent = JSON.stringify(pick(useGameStore.getState()));
}

// Giriş yapılınca ya da uygulama açılınca çalışır: yerel ve bulut kaydı karşılaştırır.
async function resolve(forUid: string) {
  if (resolving) return;
  resolving = true;
  enabled = false;
  try {
    if (!useGameStore.persist.hasHydrated()) {
      await new Promise<void>((done) => {
        const off = useGameStore.persist.onFinishHydration(() => {
          off();
          done();
        });
      });
    }

    const snap = await getDoc(userRef(forUid));
    const cloud = snap.exists() ? (snap.data() as CloudDoc) : null;
    const local = pick(useGameStore.getState());
    const linked = (await mmkvStorage.getItem(LINKED_KEY)) === forUid;

    if (cloud && isValid(cloud.data) && cloud.data.version > STATE_VERSION) {
      Alert.alert(
        tr('cloud.updateTitle', 'Update needed'),
        tr('cloud.updateBody', 'Your cloud save was made with a newer version. Update the game to sync.')
      );
      return;
    }

    let useLocal = true;
    if (cloud && isValid(cloud.data)) {
      const cs = score(cloud.data);
      const ls = score(local);
      if (isFresh(local)) useLocal = false;
      else if (cs === ls || (linked && ls > cs)) useLocal = true;
      else useLocal = (await askWhich(cloud.data.currentLevel, local.currentLevel)) === 'local';

      if (!useLocal) applyCloud(cloud.data);
    }

    uid = forUid;
    enabled = true;
    if (useLocal) {
      lastSent = '';
      await push();
    }
    await mmkvStorage.setItem(LINKED_KEY, forUid);
    // Reklam kaldırma gibi satın alımlar Google Play hesabından geri yüklenir.
    void restorePurchases();
  } catch {
    // Çevrimdışı olabilir: uygulama öne gelince tekrar denenir.
  } finally {
    resolving = false;
  }
}

// GoogleSignin yalnızca bir kez yapılandırılır; giriş öncesi de güvenle çağrılabilir.
let googleConfigured = false;
function configureGoogle() {
  if (googleConfigured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  googleConfigured = true;
}

let started = false;

// Uygulama açılışında bir kez çağır (ana ekranda initPurchases'ın yanında).
export function initCloudSave() {
  if (started) return;
  started = true;
  configureGoogle();

  onAuthStateChanged(getAuth(), (user) => {
    if (user) {
      uid = user.uid;
      void resolve(user.uid);
    } else {
      uid = null;
      stop();
    }
  });

  useGameStore.subscribe(() => {
    if (enabled) schedule();
  });

  AppState.addEventListener('change', (state) => {
    if (state === 'background' || state === 'inactive') void flush();
    else if (state === 'active' && uid && !enabled) void resolve(uid);
  });
}

async function googleCredential() {
  configureGoogle();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (res.type !== 'success' || !res.data.idToken) return null;
  return GoogleAuthProvider.credential(res.data.idToken);
}

// İptal edilirse false döner.
export async function signInWithGoogle(): Promise<boolean> {
  const cred = await googleCredential();
  if (!cred) return false;
  await signInWithCredential(getAuth(), cred);
  return true;
}

export async function signOutCloud() {
  await flush();
  stop();
  try {
    await GoogleSignin.signOut();
  } catch {
    // Zaten çıkış yapılmış olabilir.
  }
  await firebaseSignOut(getAuth());
}

// Buluttaki kaydı ve hesabı siler. Yerel ilerleme cihazda kalır.
export async function deleteCloudAccount(): Promise<boolean> {
  const user = getAuth().currentUser;
  if (!user) return false;
  const cred = await googleCredential();
  if (!cred) return false;
  stop();
  await reauthenticateWithCredential(user, cred);
  await deleteDoc(userRef(user.uid));
  await deleteUser(user);
  try {
    await GoogleSignin.signOut();
  } catch {
    // Önemsiz.
  }
  return true;
}

export function useCloudUser(): CloudUser | null {
  const [user, setUser] = useState<CloudUser | null>(() => getAuth().currentUser);
  useEffect(() => onAuthStateChanged(getAuth(), setUser), []);
  return user;
}