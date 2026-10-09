/**
 * AUDIO ADAPTER (Clean Architecture Lite)
 * Plugs Web Audio API into domain sound cues.
 */

import { SoundCue } from '../domain';
import { MusicEngine } from './musicEngine';

const SAMPLE_CUES: SoundCue[] = ['temptation', 'healthy', 'neutral', 'sigh', 'night', 'victory', 'defeat', 'event'];

class AudioAdapter {
  private ctx: AudioContext | null = null;
  private buffers: Partial<Record<SoundCue, AudioBuffer>> = {};
  private loading = false;
  public enabled = true;

  /** Tải các mẫu âm thanh (public/sfx/*.mp3). Lỗi thì bỏ qua, dùng âm tổng hợp dự phòng. */
  private loadSamples(ctx: AudioContext): void {
    if (this.loading) return;
    this.loading = true;
    for (const cue of SAMPLE_CUES) {
      fetch(`/sfx/${cue}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((data) => ctx.decodeAudioData(data))
        .then((buf) => {
          this.buffers[cue] = buf;
        })
        .catch(() => {
          // giữ âm tổng hợp
        });
    }
  }

  private playSample(ctx: AudioContext, cue: SoundCue): boolean {
    const buf = this.buffers[cue];
    if (!buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
    return true;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.loadSamples(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private roomBuffers = new Map<string, Promise<AudioBuffer | null>>();

  /**
   * Âm thanh trong phòng 3D (public/sfx/room/<name>.mp3): bước chân, lật sách, nồi, cửa...
   * Tải khi cần lần đầu; lỗi thì im lặng.
   */
  public playRoomSfx(name: string, volume = 0.5): void {
    const ctx = this.getContext();
    if (!ctx) return;
    if (name === 'bark') return this.bark(ctx, volume);
    let buf = this.roomBuffers.get(name);
    if (!buf) {
      buf = fetch(`/sfx/room/${name}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((data) => ctx.decodeAudioData(data))
        .catch(() => null);
      this.roomBuffers.set(name, buf);
    }
    buf.then((b) => {
      if (!b || !this.enabled) return;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = volume;
      src.buffer = b;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    });
  }

  /** "Gâu gâu": hai tiếng sủa ngắn tổng hợp (bộ âm thanh Kenney không có tiếng chó) */
  private bark(ctx: AudioContext, volume: number): void {
    [0, 0.24].forEach((delay) => {
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.linearRampToValueAtTime(480, t + 0.03);
      osc.frequency.exponentialRampToValueAtTime(170, t + 0.14);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      filter.Q.value = 1.2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  // ───────── Nhạc nền tự tạo (xem musicEngine.ts) ─────────
  private music: MusicEngine | null = null;
  private musicNight = false;
  private static readonly MUSIC_VOLUME = 0.22;

  /** Bật nhạc nền (gọi sau thao tác đầu tiên của người chơi, vì trình duyệt chặn tự phát). */
  public startMusic(): void {
    const ctx = this.getContext();
    if (!ctx || this.music) return;
    this.music = new MusicEngine(ctx, AudioAdapter.MUSIC_VOLUME);
    this.music.setNight(this.musicNight);
    this.music.start();
  }

  public stopMusic(): void {
    this.music?.stop();
    this.music = null;
  }

  /** Đổi sắc thái nhạc theo ngày/đêm. */
  public setMusicNight(night: boolean): void {
    if (night === this.musicNight) return;
    this.musicNight = night;
    this.music?.setNight(night);
  }
  /** Khởi tạo âm thanh sớm (gọi sau thao tác đầu tiên của người chơi) để mẫu kịp tải. */
  public prime(): void {
    this.getContext();
  }

  public playCue(cue: SoundCue): void {
    const ctx = this.getContext();
    if (!ctx) return;
    if (this.playSample(ctx, cue)) return;
    const now = ctx.currentTime;

    switch (cue) {
      case 'temptation': {
        // High sparkle chime
        [587.33, 880.0, 1174.66].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.06);
          gain.gain.setValueAtTime(0, now + i * 0.06);
          gain.gain.linearRampToValueAtTime(0.12, now + i * 0.06 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.2);
        });
        break;
      }

      case 'healthy': {
        // Warm grounding chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'defeat':
      case 'sigh': {
        // Descending sigh
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
        break;
      }

      case 'night': {
        // Soft clock bell
        [261.63, 329.63, 392.0].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.08, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.45);
        });
        break;
      }

      case 'victory': {
        // C major victory chord
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.12, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.55);
        });
        break;
      }

      case 'neutral':
      default: {
        // Snappy click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
    }
  }
}

export const audioAdapter = new AudioAdapter();
