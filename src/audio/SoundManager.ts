import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

import { useGameStore } from '@/store/gameStore';

// Bu dosya src/audio/SoundManager.ts içindeyse sesler src/assets/sounds altında olduğu için yol ../assets/sounds olur.
const SOURCES = {
  fishLand: require('../assets/sounds/fish_land.mp3'),
  jarComplete: require('../assets/sounds/jar_complete.mp3'),
  levelComplete: require('../assets/sounds/level_complete.mp3'),
  helperUse: require('../assets/sounds/helper_use.mp3'),
  noMoves: require('../assets/sounds/no_moves.mp3'),
  invalidMove: require('../assets/sounds/invalid_move.mp3'),
  chest: require('../assets/sounds/chest.mp3'),
  heartPop: require('../assets/sounds/heart_pop.mp3'),
  clam: require('../assets/sounds/clam.mp3'),
} as const;

const MUSIC_SOURCE = require('../assets/sounds/music_loop.mp3');

export type SoundName = keyof typeof SOURCES;

// Her sesin kendi seviyesi (0-1). Dinleyip dengelemek için burayı oynat.
const VOLUMES: Record<SoundName, number> = {
  fishLand: 0.1,
  jarComplete: 0.4,
  levelComplete: 0.7,
  helperUse: 0.5,
  noMoves: 0.5,
  invalidMove: 0.3,
  chest: 0.5,
  heartPop: 1, // dosya zaten %50 kısılmış; ayar buradan yapılır
  clam: 0.5,
};

// Arka plan müziği seviyesi (0-1). Efektlerin altında kalsın diye düşük tutulur.
const MUSIC_VOLUME = 0.2;

// Aynı sesin art arda en sık ne kadar sürede bir çalabileceği (ms).
// Oyuncu çok hızlı dokunsa da sesler üst üste binip rahatsız etmesin.
const MIN_GAP_MS: Record<SoundName, number> = {
  fishLand: 140,
  jarComplete: 300,
  levelComplete: 800,
  helperUse: 200,
  noMoves: 1500,
  invalidMove: 250,
  chest: 200,
  heartPop: 100, // 3 kalp ~144 ms arayla çıkar, hepsi çalsın
  clam: 200,
};

// Art arda hızlı dokunuşlarda sesin kesilmemesi için her ses için 2 oynatıcı.
const POOL_SIZE = 2;

class SoundManagerImpl {
  private pools: Partial<Record<SoundName, AudioPlayer[]>> = {};
  private cursor: Partial<Record<SoundName, number>> = {};
  private lastPlayed: Partial<Record<SoundName, number>> = {};
  private music: AudioPlayer | null = null;
  private enabled = true; // ses efektleri (Ayarlar > Ses)
  private musicEnabled = true; // arka plan müziği (Ayarlar > Müzik)
  private appActive = AppState.currentState === 'active';
  private adPlaying = false; // tam ekran reklam açıkken müzik çalmaz
  private loaded = false;
  private initPromise: Promise<void> | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private appStateSub: NativeEventSubscription | null = null;

  /**
   * Birden fazla yerden çağrılsa da yükleme yalnızca bir kez yapılır.
   * Ayarlar (ses/müzik) ve uygulamanın arka plana gitmesi burada otomatik takip edilir.
   */
  init(): Promise<void> {
    if (!this.initPromise) this.initPromise = this.load();
    return this.initPromise;
  }

  private async load() {
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
    } catch (e) {
      console.warn('[SoundManager] audio mode ayarlanamadı', e);
    }

    (Object.keys(SOURCES) as SoundName[]).forEach((name) => {
      const players: AudioPlayer[] = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        try {
          const player = createAudioPlayer(SOURCES[name]);
          player.volume = VOLUMES[name];
          players.push(player);
        } catch (e) {
          console.warn(`[SoundManager] ${name} yüklenemedi`, e);
        }
      }
      this.pools[name] = players;
      this.cursor[name] = 0;
    });

    try {
      const music = createAudioPlayer(MUSIC_SOURCE);
      music.loop = true;
      music.volume = MUSIC_VOLUME;
      this.music = music;
    } catch (e) {
      console.warn('[SoundManager] müzik yüklenemedi', e);
    }

    this.loaded = true;

    // Ayarlar: ilk değer + sonraki değişiklikler (hangi ekranda olursan ol).
    const applySettings = (settings: { sound: boolean; music?: boolean }) => {
      this.enabled = settings.sound;
      this.musicEnabled = settings.music !== false;
      this.syncMusic();
    };
    applySettings(useGameStore.getState().settings);
    this.unsubscribeStore = useGameStore.subscribe((state, prev) => {
      if (state.settings !== prev.settings) applySettings(state.settings);
    });

    // Uygulama arka plana gidince müzik durur, geri gelince devam eder.
    this.appStateSub = AppState.addEventListener('change', (status: AppStateStatus) => {
      this.appActive = status === 'active';
      this.syncMusic();
    });
    this.appActive = AppState.currentState === 'active';
    this.syncMusic();
  }

  /** Tam ekran reklam açılınca çağrılır: müzik reklam bitene kadar durur. */
  pauseForAd() {
    this.adPlaying = true;
    this.syncMusic();
  }

  /** Reklam kapanınca çağrılır: müzik ayarlara göre kaldığı yerden devam eder. */
  resumeAfterAd() {
    this.adPlaying = false;
    this.syncMusic();
  }

  /** Müziği mevcut duruma (ayar + uygulama ön planda mı + reklam açık mı) göre çalar ya da durdurur. */
  private syncMusic() {
    const music = this.music;
    if (!music || !this.loaded) return;
    try {
      if (this.musicEnabled && this.appActive && !this.adPlaying) {
        if (!music.playing) music.play();
      } else if (music.playing) {
        music.pause();
      }
    } catch (e) {
      console.warn('[SoundManager] müzik durumu ayarlanamadı', e);
    }
  }

  /** Ses efektleri aç/kapa. (Ayarlar store'u üzerinden otomatik de güncellenir.) */
  setEnabled(value: boolean) {
    this.enabled = value;
  }

  isEnabled() {
    return this.enabled;
  }

  /** Müzik aç/kapa. (Ayarlar store'u üzerinden otomatik de güncellenir.) */
  setMusicEnabled(value: boolean) {
    this.musicEnabled = value;
    this.syncMusic();
  }

  play(name: SoundName) {
    if (!this.enabled || !this.loaded) return;
    const pool = this.pools[name];
    if (!pool || pool.length === 0) return;

    const now = Date.now();
    const last = this.lastPlayed[name] ?? 0;
    if (now - last < MIN_GAP_MS[name]) return;
    this.lastPlayed[name] = now;

    const index = this.cursor[name] ?? 0;
    this.cursor[name] = (index + 1) % pool.length;
    const player = pool[index];

    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      console.warn(`[SoundManager] ${name} çalınamadı`, e);
    }
  }

  /** Uygulama kapanırken ya da gerekirse kaynakları serbest bırakır. */
  release() {
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    this.appStateSub?.remove();
    this.appStateSub = null;

    try {
      this.music?.release();
    } catch {}
    this.music = null;

    (Object.keys(this.pools) as SoundName[]).forEach((name) => {
      this.pools[name]?.forEach((p) => {
        try {
          p.release();
        } catch {}
      });
    });
    this.pools = {};
    this.cursor = {};
    this.loaded = false;
    this.initPromise = null;
  }
}

export const SoundManager = new SoundManagerImpl();