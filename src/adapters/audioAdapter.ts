/**
 * AUDIO ADAPTER (Clean Architecture Lite)
 * Plugs Web Audio API into domain sound cues.
 */

import { SoundCue } from '../domain';

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

  // ───────── Nhạc nền tự tạo (Web Audio, không cần file) ─────────
  private music: {
    out: GainNode;
    filter: BiquadFilterNode;
    timer: number;
    nextChordAt: number;
    chordIdx: number;
    nextNoteAt: number;
  } | null = null;
  private musicNight = false;
  private static readonly MUSIC_VOLUME = 0.05;

  // Tần số (Hz) theo số nửa cung so với A4
  private static note(semi: number): number {
    return 440 * Math.pow(2, semi / 12);
  }

  /** Vòng hợp âm (nửa cung so với A4). Ngày: C - Am - F - G. Đêm: Am - F - C - Em, trầm hơn. */
  private static readonly DAY_CHORDS = [[-21, -17, -14, -9], [-24, -21, -17, -12], [-28, -24, -21, -16], [-26, -22, -19, -14]];
  private static readonly NIGHT_CHORDS = [[-24, -21, -17, -12], [-28, -24, -21, -16], [-33, -29, -26, -21], [-29, -26, -22, -17]];
  /** Thang ngũ cung C (giai điệu) */
  private static readonly PENTA = [3, 5, 7, 10, 12, 15, 17, 19];

  private pad(ctx: AudioContext, dest: AudioNode, freq: number, at: number, dur: number): void {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.18, at + dur * 0.35);
    g.gain.linearRampToValueAtTime(0, at + dur);
    g.connect(dest);
    // Hai dao động lệch nhẹ cho âm dày, ấm
    [-4, 4].forEach((detune) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(g);
      o.start(at);
      o.stop(at + dur + 0.05);
    });
  }

  private pluck(ctx: AudioContext, dest: AudioNode, freq: number, at: number): void {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.22, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, at + 1.6);
    o.connect(g);
    g.connect(dest);
    o.start(at);
    o.stop(at + 1.7);
  }

  /** Lên lịch trước ~1 giây; gọi định kỳ */
  private scheduleMusic(): void {
    const ctx = this.ctx;
    const m = this.music;
    if (!ctx || !m) return;
    const night = this.musicNight;
    const chordLen = night ? 6 : 4.5;
    const horizon = ctx.currentTime + 1.2;
    while (m.nextChordAt < horizon) {
      const chords = night ? AudioAdapter.NIGHT_CHORDS : AudioAdapter.DAY_CHORDS;
      const chord = chords[m.chordIdx % chords.length];
      chord.forEach((s) => this.pad(ctx, m.filter, AudioAdapter.note(s), m.nextChordAt, chordLen + 0.8));
      m.chordIdx++;
      m.nextChordAt += chordLen;
    }
    while (m.nextNoteAt < horizon) {
      // Giai điệu thưa: ban đêm ít nốt và thấp hơn
      if (Math.random() < (night ? 0.35 : 0.55)) {
        const s = AudioAdapter.PENTA[Math.floor(Math.random() * AudioAdapter.PENTA.length)] - (night ? 12 : 0);
        this.pluck(ctx, m.filter, AudioAdapter.note(s), m.nextNoteAt);
      }
      m.nextNoteAt += night ? 1.5 : 0.75;
    }
  }

  /** Bật nhạc nền (gọi sau thao tác đầu tiên của người chơi, vì trình duyệt chặn tự phát). */
  public startMusic(): void {
    const ctx = this.getContext();
    if (!ctx || this.music) return;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.linearRampToValueAtTime(AudioAdapter.MUSIC_VOLUME, ctx.currentTime + 3);
    out.connect(ctx.destination);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.musicNight ? 900 : 2200;
    filter.connect(out);
    const t = ctx.currentTime + 0.1;
    this.music = { out, filter, timer: 0, nextChordAt: t, chordIdx: 0, nextNoteAt: t + 1 };
    this.scheduleMusic();
    this.music.timer = window.setInterval(() => this.scheduleMusic(), 400);
  }

  public stopMusic(): void {
    const ctx = this.ctx;
    const m = this.music;
    if (!ctx || !m) return;
    window.clearInterval(m.timer);
    m.out.gain.cancelScheduledValues(ctx.currentTime);
    m.out.gain.setValueAtTime(m.out.gain.value, ctx.currentTime);
    m.out.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    setTimeout(() => m.out.disconnect(), 800);
    this.music = null;
  }

  /** Đổi sắc thái nhạc theo ngày/đêm (lọc âm êm hơn vào ban đêm). */
  public setMusicNight(night: boolean): void {
    if (night === this.musicNight) return;
    this.musicNight = night;
    const ctx = this.ctx;
    if (ctx && this.music) {
      this.music.filter.frequency.linearRampToValueAtTime(night ? 900 : 2200, ctx.currentTime + 4);
    }
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
