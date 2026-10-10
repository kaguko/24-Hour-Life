import * as THREE from 'three';
import { MASCOT_POS, MASCOT_STAGE_TOP, MOOD_TAG, type MascotLine, type MascotMood } from './mascot';

const MOODS: MascotMood[] = ['lockedin', 'win', 'cooked', 'loss', 'rizz'];
/** Cỡ sticker trong cảnh (m) và độ cao Blob lơ lửng phía trên bục */
const SIZE = 2.9;
export const MASCOT_HOVER = MASCOT_STAGE_TOP + 1.55;
const SPARKLES = 26;
/** Vùng HUD (px) mà bong bóng tránh: thanh trên cùng và dock biểu cảm dưới đáy */
const TOP_SAFE = 112;
const BOTTOM_SAFE = 58;
const EDGE = 8;

const easeOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const p = Math.min(1, Math.max(0, x)) - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
};

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/**
 * Blob trong thành phố: sticker linh vật lơ lửng trên bục, có hào quang đổi màu theo nét mặt, vòng sóng và tia sáng,
 * cùng bong bóng lời nói có thanh đếm thời gian. Dùng ảnh sticker có sẵn (public/stickers) nên giống hệt linh vật ở các màn khác.
 */
export class MascotActor {
  readonly group = new THREE.Group();
  private readonly sprite: THREE.Sprite;
  private readonly aura: THREE.Sprite;
  private readonly rings: THREE.Mesh[] = [];
  private readonly sparkles: THREE.Points;
  private readonly sparkleSeeds: Float32Array;
  private readonly glow = glowTexture();
  private readonly textures = new Map<MascotMood, THREE.Texture>();
  private mood: MascotMood = 'win';
  private moodAt = -1e9;
  private bounceAt = -1e9;
  private readonly tailEl: HTMLDivElement;
  private readonly tagEl: HTMLSpanElement;
  private readonly quoteEl: HTMLParagraphElement;
  private readonly byEl: HTMLDivElement;
  private readonly barEl: HTMLDivElement;
  private readonly bubble: HTMLDivElement;
  private readonly root: HTMLDivElement;

  /** `host`: lớp phủ DOM của cảnh (CSS2D). Bong bóng tự bố trí trong host: nằm trên đầu Blob, lật xuống dưới khi hết chỗ, luôn nằm gọn trong khung. */
  constructor(private readonly scene: THREE.Scene, private readonly host: HTMLElement) {
    this.group.position.set(MASCOT_POS.x, 0, MASCOT_POS.z);

    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false }));
    this.sprite.renderOrder = 12;
    this.sprite.position.y = MASCOT_HOVER;
    this.sprite.scale.set(SIZE, SIZE, 1);

    this.aura = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.glow, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, fog: false })
    );
    this.aura.renderOrder = 11;
    this.aura.position.y = MASCOT_HOVER - 0.1;
    this.aura.scale.set(6, 6, 1);

    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.72, 0.84, 56),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = MASCOT_STAGE_TOP + 0.03;
      this.rings.push(ring);
      this.group.add(ring);
    }

    const pos = new Float32Array(SPARKLES * 3);
    this.sparkleSeeds = new Float32Array(SPARKLES * 3);
    for (let i = 0; i < SPARKLES; i++) {
      this.sparkleSeeds[i * 3] = Math.random() * 6.283;
      this.sparkleSeeds[i * 3 + 1] = Math.random();
      this.sparkleSeeds[i * 3 + 2] = 0.55 + Math.random() * 0.75;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.sparkles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.2, map: this.glow, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false })
    );
    this.sparkles.renderOrder = 13;
    this.sparkles.frustumCulled = false;

    // bong bóng lời nói (tự bố trí bằng layout(), không dùng CSS2DObject vì hiệu ứng vào cảnh sẽ ghi đè transform của nó)
    this.root = document.createElement('div');
    this.root.className = 'absolute left-0 top-0 pointer-events-none will-change-transform';
    this.root.style.transform = 'translate(-9999px,-9999px)';
    this.bubble = document.createElement('div');
    this.bubble.className = 'relative w-[17.5rem] max-w-[calc(100vw-1.5rem)] px-3.5 pt-2.5 pb-3 rounded-2xl bg-[#100c2b]/92 text-white border border-amber-300/50 shadow-[0_18px_40px_-12px_rgba(0,0,0,.8)] backdrop-blur-md';
    const head = document.createElement('div');
    head.className = 'flex items-center justify-between gap-2 mb-1.5';
    this.tagEl = document.createElement('span');
    this.tagEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider';
    const name = document.createElement('span');
    name.className = 'text-[11px] font-extrabold text-amber-200';
    name.textContent = 'Blob · Triết gia của phố';
    head.append(this.tagEl, name);
    this.quoteEl = document.createElement('p');
    this.quoteEl.className = 'text-[13px] leading-snug font-semibold text-white';
    this.byEl = document.createElement('div');
    this.byEl.className = 'mt-1.5 text-[11px] font-bold text-amber-200/90';
    const track = document.createElement('div');
    track.className = 'mt-2 h-1 rounded-full bg-white/12 overflow-hidden';
    this.barEl = document.createElement('div');
    this.barEl.className = 'h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500';
    track.append(this.barEl);
    this.tailEl = document.createElement('div');
    this.tailEl.className = 'absolute w-3 h-3 rotate-45 bg-[#100c2b] border-solid border-amber-300/50';
    this.bubble.append(head, this.quoteEl, this.byEl, track, this.tailEl);
    this.bubble.style.visibility = 'hidden';
    this.root.append(this.bubble);
    host.append(this.root);

    this.group.add(this.aura, this.sprite, this.sparkles);
    scene.add(this.group);

    const loader = new THREE.TextureLoader();
    for (const m of MOODS) {
      loader.load(`/stickers/${m}.png`, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        this.textures.set(m, tex);
        if (m === this.mood) this.applyMood();
      });
    }
    this.applyMood();
  }

  private applyMood(): void {
    const tex = this.textures.get(this.mood);
    const mat = this.sprite.material;
    if (tex && mat.map !== tex) {
      mat.map = tex;
      mat.needsUpdate = true;
    }
    const color = MOOD_TAG[this.mood].color;
    (this.aura.material as THREE.SpriteMaterial).color.setHex(color);
    (this.sparkles.material as THREE.PointsMaterial).color.setHex(color);
    for (const r of this.rings) (r.material as THREE.MeshBasicMaterial).color.setHex(color);
  }

  /** Blob nói một câu: đổi nét mặt, nảy lên, hiện bong bóng và chạy thanh đếm `ms` mili giây */
  say(line: MascotLine, ms: number): void {
    if (line.mood !== this.mood) {
      this.mood = line.mood;
      this.applyMood();
      this.moodAt = performance.now();
    }
    this.bounce();
    const tag = MOOD_TAG[line.mood];
    this.tagEl.className = `px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${tag.css}`;
    this.tagEl.textContent = `${tag.emoji} ${tag.label}`;
    this.quoteEl.textContent = `“${line.quote}”`;
    this.byEl.textContent = line.theme === 'greeting' ? '— Blob' : `— ${line.author}`;
    this.bubble.style.visibility = 'visible';
    this.bubble.classList.remove('anim-pop');
    void this.bubble.offsetWidth; // chạy lại hiệu ứng vào cảnh
    this.bubble.classList.add('anim-pop');
    this.barEl.style.transition = 'none';
    this.barEl.style.width = '100%';
    void this.barEl.offsetWidth;
    this.barEl.style.transition = `width ${ms}ms linear`;
    this.barEl.style.width = '0%';
  }

  bounce(): void {
    this.bounceAt = performance.now();
  }

  /** Điểm trong cảnh dùng để bấm chọn Blob */
  pickPoint(): THREE.Vector3 {
    return new THREE.Vector3(this.group.position.x, MASCOT_HOVER, this.group.position.z);
  }

  update(now: number): void {
    const t = now / 1000;
    const since = now - this.moodAt;
    const pop = since < 520 ? 0.5 + 0.5 * easeOutBack(since / 520) : 1;
    const bt = (now - this.bounceAt) / 1000;
    const jump = bt < 0.8 ? Math.abs(Math.sin(bt * Math.PI * 2.4)) * 0.6 * Math.exp(-bt * 2.4) : 0;
    const squash = 1 + Math.sin(t * 4.2) * 0.025;
    this.sprite.position.y = MASCOT_HOVER + Math.sin(t * 2.1) * 0.1 + jump;
    this.sprite.scale.set((SIZE * pop) / squash, SIZE * pop * squash, 1);
    this.aura.position.y = this.sprite.position.y - 0.1;
    (this.aura.material as THREE.SpriteMaterial).opacity = 0.5 + 0.14 * Math.sin(t * 3);
    const s = 6 + 0.35 * Math.sin(t * 2.4);
    this.aura.scale.set(s, s, 1);

    const [steady, wave] = this.rings;
    steady.scale.setScalar(1 + 0.05 * Math.sin(t * 3));
    (steady.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.15 * Math.sin(t * 3);
    const phase = (t % 2.4) / 2.4;
    wave.scale.setScalar(1 + phase * 1.9);
    (wave.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.5;

    const arr = this.sparkles.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < SPARKLES; i++) {
      const a = this.sparkleSeeds[i * 3] + t * 0.5;
      const k = (this.sparkleSeeds[i * 3 + 1] + t * 0.18 * this.sparkleSeeds[i * 3 + 2]) % 1;
      const r = 0.9 + this.sparkleSeeds[i * 3 + 2] * 0.9;
      arr.setXYZ(i, Math.cos(a) * r, MASCOT_STAGE_TOP + 0.2 + k * 3.2, Math.sin(a) * r);
    }
    arr.needsUpdate = true;
  }

  /** Đặt bong bóng theo vị trí Blob trên màn hình (gọi mỗi khung hình sau khi camera đã đặt) */
  layout(camera: THREE.Camera): void {
    const W = this.host.clientWidth;
    const H = this.host.clientHeight;
    if (!W || !H || this.bubble.style.visibility === 'hidden') return;
    const toScreen = (x: number, y: number, z: number) => {
      const v = new THREE.Vector3(x, y, z).project(camera);
      return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, behind: v.z > 1 };
    };
    const px = this.group.position.x;
    const pz = this.group.position.z;
    const top = toScreen(px, this.sprite.position.y + SIZE * 0.5 + 0.15, pz);
    const bottom = toScreen(px, this.sprite.position.y - SIZE * 0.5, pz);
    const bw = this.bubble.offsetWidth;
    const bh = this.bubble.offsetHeight;
    const gap = 12;
    const offscreen = top.behind || top.x < -40 || top.x > W + 40 || top.y < -80 || bottom.y > H + 80;
    let y = top.y - bh - gap;
    let below = false;
    if (y < TOP_SAFE && bottom.y + gap + bh <= H - BOTTOM_SAFE) {
      y = bottom.y + gap;
      below = true;
    }
    y = Math.max(EDGE, Math.min(H - bh - EDGE, y));
    const x = Math.max(EDGE, Math.min(W - bw - EDGE, top.x - bw / 2));
    const tailX = Math.max(18, Math.min(bw - 18, top.x - x));
    this.tailEl.style.display = offscreen ? 'none' : 'block';
    this.tailEl.style.left = `${tailX - 6}px`;
    if (below) {
      this.tailEl.style.top = '-6px';
      this.tailEl.style.bottom = '';
      this.tailEl.style.borderWidth = '1px 0 0 1px';
    } else {
      this.tailEl.style.bottom = '-6px';
      this.tailEl.style.top = '';
      this.tailEl.style.borderWidth = '0 1px 1px 0';
    }
    this.root.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.root.remove();
    for (const tex of this.textures.values()) tex.dispose();
    this.glow.dispose();
    this.sprite.material.dispose();
    (this.aura.material as THREE.Material).dispose();
    for (const r of this.rings) {
      r.geometry.dispose();
      (r.material as THREE.Material).dispose();
    }
    this.sparkles.geometry.dispose();
    (this.sparkles.material as THREE.Material).dispose();
  }
}
