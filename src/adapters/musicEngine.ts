/**
 * NHẠC NỀN TỰ TẠO (Web Audio, không cần file)
 * Bộ sequencer 8 bước/ô nhịp: trống (kick, snare, hi-hat), bass, arpeggio + giai điệu, pad.
 * Ngày: C - Am - F - G, 104 BPM, tươi. Đêm: Am - F - C - Em, 78 BPM, lofi êm.
 */

const note = (semi: number) => 440 * Math.pow(2, semi / 12); // nửa cung so với A4

// Hợp âm (nửa cung so với A4), bè thấp
const DAY_CHORDS = [[-21, -17, -14], [-24, -21, -17], [-28, -24, -21], [-26, -22, -19]];
const NIGHT_CHORDS = [[-24, -21, -17], [-28, -24, -21], [-33, -29, -26], [-29, -26, -22]];

/** Arpeggio: chỉ số nốt trong hợp âm (3 = nốt gốc quãng tám trên) cho 8 bước; -1 = nghỉ */
const ARP_A = [0, 1, 2, 3, 2, 1, 2, 1];
const ARP_B = [3, -1, 2, 1, 0, -1, 1, 2];

/** Giai điệu chính (nửa cung so với A4, quanh C5) cho 4 ô nhịp x 8 bước; null = nghỉ */
const MELODY: (number | null)[][] = [
  [7, null, 10, null, 12, 10, 7, null],
  [3, null, 7, null, 5, 3, 0, null],
  [0, null, 3, 5, 7, null, 5, null],
  [2, null, 5, null, 7, 10, 7, null],
];

const DAY = { bpm: 104, chords: DAY_CHORDS, lead: 24, cutoff: 3200 };
const NIGHT = { bpm: 78, chords: NIGHT_CHORDS, lead: 12, cutoff: 1300 };

export class MusicEngine {
  private out: GainNode;
  private filter: BiquadFilterNode;
  private noise: AudioBuffer;
  private timer = 0;
  private nextStepAt: number;
  private step = 0;
  private night = false;

  constructor(private ctx: AudioContext, volume: number) {
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0, ctx.currentTime);
    this.out.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2);
    this.out.connect(ctx.destination);
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = DAY.cutoff;
    this.filter.connect(this.out);
    // Nhiễu trắng cho snare / hi-hat
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.nextStepAt = ctx.currentTime + 0.1;
  }

  start(): void {
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), 100);
  }

  stop(): void {
    window.clearInterval(this.timer);
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(() => this.out.disconnect(), 800);
  }

  setNight(night: boolean): void {
    this.night = night;
    this.filter.frequency.linearRampToValueAtTime((night ? NIGHT : DAY).cutoff, this.ctx.currentTime + 3);
  }

  /** Lên lịch các bước trong ~0.3 giây tới */
  private schedule(): void {
    const horizon = this.ctx.currentTime + 0.3;
    while (this.nextStepAt < horizon) {
      this.playStep(this.step, this.nextStepAt);
      const cfg = this.night ? NIGHT : DAY;
      this.nextStepAt += 60 / cfg.bpm / 2; // nốt móc đơn
      this.step++;
    }
  }

  private playStep(step: number, t: number): void {
    const cfg = this.night ? NIGHT : DAY;
    const night = this.night;
    const s = step % 8;
    const bar = Math.floor(step / 8);
    const chord = cfg.chords[bar % 4];
    const stepLen = 60 / cfg.bpm / 2;
    // Đoạn 8 ô nhịp: 4 ô đầu chỉ arpeggio, 4 ô sau thêm giai điệu chính
    const phrase = Math.floor(bar / 4) % 2;

    // Pad đầu mỗi ô nhịp
    if (s === 0) chord.forEach((n) => this.pad(note(n + 12), t, stepLen * 8.5, night ? 0.05 : 0.04));

    // Trống
    if (night) {
      if (s === 0 || s === 5) this.kick(t, 0.5);
      if (s === 4) this.snare(t, 0.12);
      if (s % 2 === 1) this.hat(t, 0.05);
    } else {
      if (s === 0 || s === 4 || (s === 7 && bar % 2 === 1)) this.kick(t, 0.7);
      if (s === 2 || s === 6) this.snare(t, 0.18);
      this.hat(t, s % 2 === 1 ? 0.07 : 0.035);
    }

    // Bass: nốt gốc, nhịp nảy
    const root = chord[0] - 12;
    if (night ? s === 0 || s === 4 : s === 0 || s === 3 || s === 6) this.bass(note(root), t, stepLen * (night ? 3 : 2));

    // Arpeggio
    const arp = (bar % 2 === 0 ? ARP_A : ARP_B)[s];
    if (arp >= 0 && (!night || s % 2 === 0)) {
      const n = arp === 3 ? chord[0] + 12 : chord[arp];
      this.pluck(note(n + cfg.lead), t, night ? 0.06 : 0.07, 'triangle', stepLen * 2);
    }

    // Giai điệu chính ở nửa sau của đoạn
    if (phrase === 1) {
      const m = MELODY[bar % 4][s];
      if (m !== null) this.pluck(note(m + (night ? -12 : 0)), t, night ? 0.08 : 0.1, 'square', stepLen * 1.6);
    }
  }

  private env(t: number, peak: number, attack: number, decay: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.filter);
    return g;
  }

  private pad(freq: number, t: number, dur: number, vol: number): void {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(this.filter);
    [-6, 6].forEach((detune) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }

  private pluck(freq: number, t: number, vol: number, type: OscillatorType, dur: number): void {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(this.env(t, vol, 0.01, dur));
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private bass(freq: number, t: number, dur: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    o.connect(lp);
    lp.connect(this.env(t, 0.16, 0.01, dur));
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number, vol: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g);
    g.connect(this.out); // không qua lọc để kick luôn rõ
    o.start(t);
    o.stop(t + 0.3);
  }

  private noiseHit(t: number, vol: number, type: BiquadFilterType, freq: number, decay: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(f);
    f.connect(g);
    g.connect(this.out);
    src.start(t);
    src.stop(t + decay + 0.02);
  }

  private snare(t: number, vol: number): void {
    this.noiseHit(t, vol, 'bandpass', 1800, 0.16);
  }

  private hat(t: number, vol: number): void {
    this.noiseHit(t, vol, 'highpass', 7000, 0.05);
  }
}
