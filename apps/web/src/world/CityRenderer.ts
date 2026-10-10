import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { locationDef } from '@24h/domain';
import type { Anim } from '@24h/protocol';
import { ACTION_ANIM_SECONDS, CLIP_FOR } from './animMap';
import { NavGrid, type NavData, type Vec2 } from './nav';

/** Thông tin một người chơi để dựng nhân vật. Vị trí của người chơi cục bộ do renderer tự điều khiển. */
export interface WorldPlayerInfo {
  id: string;
  name: string;
  avatar: string;
  x: number;
  z: number;
  anim: Anim;
  bot: boolean;
  connected: boolean;
}

export interface CityRendererOptions {
  /** 'low': không khử răng cưa, pixel ratio 1 (máy yếu) */
  quality: 'high' | 'low';
  onGround: (x: number, z: number) => void;
  /** Bấm vào toà nhà: khoá cửa trong nav (vd 'cafe') */
  onBuilding?: (doorKey: string) => void;
  /** Vị trí cục bộ, gọi ~10 lần/giây khi đang di chuyển (để gửi server) */
  onLocalMove?: (x: number, z: number) => void;
  /** Mỗi bước chân của người chơi cục bộ (để phát tiếng bước chân) */
  onStep?: () => void;
}

const CHAR_HEIGHT = 1.6;
const LOCAL_SPEED = 5;
const REMOTE_MAX_SPEED = 8;
const MOVE_SEND_MS = 100;
const BUBBLE_MS = 5500;
/** Đứng trong bán kính này quanh cửa mà đang làm hành vi = đang ở trong toà nhà */
const INSIDE_RADIUS = 2.5;
/** Công viên là ngoài trời: không ẩn nhân vật */
const OUTDOOR_DOORS = new Set(['park']);

interface Actor {
  id: string;
  group: THREE.Group;
  model: THREE.Group | null;
  mixer: THREE.AnimationMixer | null;
  clips: Map<string, THREE.AnimationClip>;
  currentAnim: Anim | null;
  currentAction: THREE.AnimationAction | null;
  label: CSS2DObject;
  nameEl: HTMLDivElement;
  bubbleEl: HTMLDivElement;
  bubbleTimer: number | null;
  shadow: THREE.Mesh;
  pos: Vec2;
  target: Vec2;
  yaw: number;
  info: WorldPlayerInfo;
  /** Hoạt hình hành vi do server đặt (người khác) hoặc do UI đặt (người chơi cục bộ) */
  actionAnim: Anim;
  actionAnimUntil: number;
  /** Khoá cửa của toà nhà đang ở trong (nhân vật được ẩn), hoặc null */
  inside: string | null;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Cảnh thành phố: city.glb + nav + nhân vật. Không phụ thuộc React. */
export class CityRenderer {
  readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labels = new CSS2DRenderer();
  private readonly raycaster = new THREE.Raycaster();
  private readonly ambient = new THREE.HemisphereLight(0xffffff, 0xb8a98f, 1);
  private readonly sun = new THREE.DirectionalLight(0xfff1d6, 1.2);
  private readonly loader = new GLTFLoader();
  private readonly charCache = new Map<string, Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>>();
  private readonly actors = new Map<string, Actor>();
  private readonly clock = new THREE.Clock();
  private readonly buildingMeshes: THREE.Object3D[] = [];
  private readonly nightMaterials: Array<{ mat: THREE.MeshStandardMaterial; kind: 'window' | 'lamp' | 'neon' }> = [];
  private readonly dayColor = new THREE.Color(0xbfe3f2);
  private readonly nightColor = new THREE.Color(0x1b2140);

  private nav: NavGrid | null = null;
  private localId = '';
  private path: Vec2[] = [];
  private onArrive: (() => void) | null = null;
  private lastSend = 0;
  private stepTimer = 0;
  private raf = 0;
  private disposed = false;
  private zoom = 1;
  private readonly camTarget = new THREE.Vector3();
  /** Quỹ đạo camera: góc quay (rad), góc nhìn xuống, khoảng cách */
  private camYaw = Math.PI / 4;
  private readonly camPitch = THREE.MathUtils.degToRad(62);
  private readonly camDist = 27;
  private downAt: { x: number; y: number } | null = null;
  private dragging = false;
  private lastDragX = 0;
  /** Toà nhà: các mesh con và vật liệu riêng (để làm mờ khi che nhân vật) */
  private readonly buildingFade = new Map<string, { root: THREE.Object3D; mats: THREE.Material[]; opacity: number }>();
  /** Bảng hiệu trên cửa mỗi toà nhà: ai đang ở bên trong */
  private readonly signs = new Map<string, { label: CSS2DObject; el: HTMLDivElement; text: string }>();
  /** Người chơi cục bộ đang ở trong toà nhà nào (đến cửa rồi làm hành vi), cho tới khi đi tiếp */
  private localInside: string | null = null;
  private resizeObserver: ResizeObserver;

  constructor(private readonly container: HTMLElement, private readonly opts: CityRendererOptions) {
    this.renderer = new THREE.WebGLRenderer({ antialias: opts.quality === 'high', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(opts.quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.labels.domElement.style.position = 'absolute';
    this.labels.domElement.style.inset = '0';
    this.labels.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labels.domElement);

    this.scene.background = this.dayColor.clone();
    this.scene.fog = new THREE.Fog(this.dayColor.clone(), 70, 150);
    this.sun.position.set(30, 50, 20);
    this.scene.add(this.ambient, this.sun);

    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    this.loader.setDRACOLoader(draco);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
  }

  // ---------- tải cảnh ----------
  async init(): Promise<NavGrid> {
    const [gltf, navData] = await Promise.all([
      this.loader.loadAsync('/models/city.glb'),
      fetch('/models/city_nav.json').then((r) => r.json() as Promise<NavData>),
    ]);
    this.nav = new NavGrid(navData);
    gltf.scene.traverse((o) => {
      if (o.name.startsWith('building_')) {
        this.buildingMeshes.push(o);
        const mats: THREE.Material[] = [];
        o.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh) return;
          // vật liệu riêng cho từng toà nhà: làm mờ toà này không ảnh hưởng toà khác dùng chung bảng màu
          m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.push(x));
        });
        this.buildingFade.set(o.name, { root: o, mats, opacity: 1 });
      }
      if ((o as THREE.Mesh).isMesh) {
        const mats = Array.isArray((o as THREE.Mesh).material) ? ((o as THREE.Mesh).material as THREE.Material[]) : [(o as THREE.Mesh).material as THREE.Material];
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial;
          if (std.name === 'mat_window') this.nightMaterials.push({ mat: std, kind: 'window' });
          else if (std.name === 'mat_lamp') this.nightMaterials.push({ mat: std, kind: 'lamp' });
          else if (std.name === 'mat_neon') this.nightMaterials.push({ mat: std, kind: 'neon' });
        }
      }
    });
    this.scene.add(gltf.scene);
    this.buildSigns(navData);
    this.setClock(8);
    this.camTarget.set(navData.spawn.x, 0, navData.spawn.z);
    this.positionCamera(1);
    this.clock.start();
    this.loop();
    return this.nav;
  }

  private buildSigns(navData: NavData): void {
    for (const [key, door] of Object.entries(navData.doors)) {
      if (OUTDOOR_DOORS.has(key)) continue;
      const el = document.createElement('div');
      el.className = 'hidden max-w-[12rem] px-2.5 py-1 rounded-xl bg-indigo-600/95 text-white text-[11px] font-semibold leading-snug shadow-md text-center';
      const label = new CSS2DObject(el);
      label.position.set(door.x, 3.4, door.z);
      this.scene.add(label);
      this.signs.set(key, { label, el, text: '' });
    }
  }

  /** Cửa gần nhất (toà nhà, không tính ngoài trời) trong INSIDE_RADIUS quanh vị trí */
  private doorNear(pos: Vec2): string | null {
    if (!this.nav) return null;
    for (const [key, d] of Object.entries(this.nav.data.doors)) {
      if (OUTDOOR_DOORS.has(key)) continue;
      if (Math.hypot(d.x - pos.x, d.z - pos.z) <= INSIDE_RADIUS) return key;
    }
    return null;
  }

  /** Ẩn/hiện nhân vật theo việc đang ở trong toà nhà, rồi cập nhật bảng hiệu trên cửa */
  private updateInside(): void {
    const names = new Map<string, string[]>();
    for (const a of this.actors.values()) {
      const isLocal = a.id === this.localId;
      let inside: string | null = null;
      if (isLocal) inside = this.localInside;
      else if (a.info.connected && a.info.anim !== 'idle' && a.info.anim !== 'walk' && a.info.anim !== 'run') inside = this.doorNear(a.pos);
      a.inside = inside;
      if (a.model) a.model.visible = !inside;
      a.shadow.visible = !inside;
      const ring = a.group.getObjectByName('local-ring');
      if (ring) ring.visible = isLocal && !inside;
      a.label.element.style.display = inside ? 'none' : '';
      if (inside) {
        const list = names.get(inside) ?? [];
        list.push(`${isLocal ? '⭐ ' : ''}${a.info.name}`);
        names.set(inside, list);
      }
    }
    for (const [key, sign] of this.signs) {
      const who = names.get(key);
      let text = '';
      if (who) {
        const loc = Object.entries(this.nav?.data.locations ?? {}).find(([, k]) => k === key)?.[0];
        const def = loc ? locationDef(loc as never) : null;
        text = `${def ? `${def.emoji} ${def.name}` : key} · ${who.join(', ')}`;
      }
      if (text === sign.text) continue;
      sign.text = text;
      sign.el.textContent = text;
      sign.el.classList.toggle('hidden', !text);
    }
  }

  /** Thông tin gỡ lỗi về nhân vật (chỉ dùng khi dev / e2e) */
  debugActors(): Array<{ id: string; pos: Vec2; hasModel: boolean; size: number[]; anim: Anim | null; clips: number }> {
    return [...this.actors.values()].map((a) => {
      const box = a.model ? new THREE.Box3().setFromObject(a.model) : null;
      const size = box ? box.getSize(new THREE.Vector3()).toArray().map((n) => Math.round(n * 100) / 100) : [];
      return { id: a.id, pos: { ...a.pos }, hasModel: !!a.model, size, anim: a.currentAnim, clips: a.clips.size };
    });
  }

  getNav(): NavGrid {
    if (!this.nav) throw new Error('CityRenderer chưa init');
    return this.nav;
  }

  // ---------- ngày / đêm ----------
  /** Giờ trong ngày game (0..24): chỉnh trời, ánh sáng, cửa sổ và đèn đường phát sáng */
  setClock(hour: number): void {
    const h = ((hour % 24) + 24) % 24;
    // 0 = ban ngày, 1 = ban đêm; hoàng hôn 18-20h, bình minh 5-7h
    const dusk = smooth(18, 20.5, h);
    const dawn = 1 - smooth(5, 7.5, h);
    const night = h >= 12 ? dusk : dawn;
    const sky = this.dayColor.clone().lerp(this.nightColor, night);
    (this.scene.background as THREE.Color).copy(sky);
    (this.scene.fog as THREE.Fog).color.copy(sky);
    this.ambient.intensity = 1.0 - 0.62 * night;
    this.sun.intensity = 1.25 - 1.0 * night;
    this.sun.color.setHex(night > 0.5 ? 0x9bb0ff : 0xfff1d6);
    for (const { mat, kind } of this.nightMaterials) {
      mat.emissiveIntensity = kind === 'window' ? 0.12 + 1.5 * night : kind === 'lamp' ? 0.05 + 1.6 * night : 0.4 + 1.2 * night;
    }
  }

  // ---------- nhân vật ----------
  private loadChar(avatar: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
    let p = this.charCache.get(avatar);
    if (!p) {
      p = this.loader.loadAsync(`/models/characters/${avatar}.glb`).then((g) => ({ scene: g.scene, animations: g.animations }));
      this.charCache.set(avatar, p);
    }
    return p;
  }

  private makeActor(info: WorldPlayerInfo): Actor {
    const group = new THREE.Group();
    group.position.set(info.x, 0, info.z);
    const nameEl = document.createElement('div');
    nameEl.className = 'px-2 py-0.5 rounded-full bg-white/90 text-[11px] font-bold text-stone-800 shadow whitespace-nowrap';
    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'hidden max-w-[11rem] px-2.5 py-1 mb-1 rounded-xl bg-white text-[11px] text-stone-800 shadow-md border border-stone-200 leading-snug';
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col items-center';
    wrap.append(bubbleEl, nameEl);
    const label = new CSS2DObject(wrap);
    label.position.set(0, CHAR_HEIGHT + 0.35, 0);
    group.add(label);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    group.add(shadow);
    // vòng sáng dưới chân để nhận ra nhân vật của mình
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.78, 28), new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    ring.visible = info.id === this.localId;
    ring.name = 'local-ring';
    group.add(ring);
    this.scene.add(group);

    const actor: Actor = {
      id: info.id,
      group,
      model: null,
      mixer: null,
      clips: new Map(),
      currentAnim: null,
      currentAction: null,
      label,
      nameEl,
      bubbleEl,
      bubbleTimer: null,
      shadow,
      pos: { x: info.x, z: info.z },
      target: { x: info.x, z: info.z },
      yaw: 0,
      info,
      actionAnim: 'idle',
      actionAnimUntil: 0,
      inside: null,
    };
    this.attachModel(actor, info.avatar);
    this.refreshName(actor);
    return actor;
  }

  private async attachModel(actor: Actor, avatar: string): Promise<void> {
    const src = await this.loadChar(avatar);
    if (this.disposed || !this.actors.has(actor.id)) return;
    if (actor.model) actor.group.remove(actor.model);
    const obj = cloneSkinned(src.scene) as THREE.Group;
    const box = new THREE.Box3().setFromObject(obj);
    const h = box.max.y - box.min.y || 1;
    const s = CHAR_HEIGHT / h;
    obj.scale.setScalar(s);
    obj.position.y = -box.min.y * s;
    actor.group.add(obj);
    actor.model = obj;
    actor.mixer = new THREE.AnimationMixer(obj);
    actor.clips = new Map(src.animations.map((c) => [c.name, c]));
    actor.currentAnim = null;
    actor.currentAction = null;
    this.applyAnim(actor, actor.info.anim === 'idle' ? 'idle' : actor.info.anim);
  }

  private refreshName(actor: Actor): void {
    const { info } = actor;
    const prefix = this.localId === info.id ? '⭐ ' : '';
    actor.nameEl.textContent = `${prefix}${info.name}${info.bot ? ' 🤖' : ''}${!info.connected && !info.bot ? ' …' : ''}`;
    actor.nameEl.style.opacity = info.connected || info.bot ? '1' : '0.6';
  }

  private applyAnim(actor: Actor, anim: Anim): void {
    if (!actor.mixer || actor.currentAnim === anim) return;
    const spec = CLIP_FOR[anim] ?? CLIP_FOR.idle;
    const clip = actor.clips.get(spec.clip) ?? actor.clips.get('idle');
    if (!clip) return;
    const next = actor.mixer.clipAction(clip);
    next.reset();
    next.setLoop(spec.hold ? THREE.LoopOnce : THREE.LoopRepeat, spec.hold ? 1 : Infinity);
    next.clampWhenFinished = !!spec.hold;
    next.timeScale = spec.timeScale ?? 1;
    if (actor.currentAction) next.crossFadeFrom(actor.currentAction, 0.2, false);
    next.play();
    actor.currentAction = next;
    actor.currentAnim = anim;
  }

  setLocalPlayer(id: string): void {
    this.localId = id;
    for (const a of this.actors.values()) {
      const ring = a.group.getObjectByName('local-ring');
      if (ring) ring.visible = a.id === id;
    }
    const a = this.actors.get(id);
    if (a) this.refreshName(a);
  }

  /** Đồng bộ danh sách người chơi từ snapshot của server. Người chơi cục bộ không bị kéo vị trí. */
  syncPlayers(list: WorldPlayerInfo[]): void {
    const seen = new Set<string>();
    for (const info of list) {
      seen.add(info.id);
      let actor = this.actors.get(info.id);
      if (!actor) {
        actor = this.makeActor(info);
        this.actors.set(info.id, actor);
      }
      const avatarChanged = actor.info.avatar !== info.avatar;
      actor.info = info;
      if (info.id !== this.localId) actor.target = { x: info.x, z: info.z };
      if (avatarChanged) void this.attachModel(actor, info.avatar);
      this.refreshName(actor);
    }
    for (const [id, actor] of this.actors) {
      if (seen.has(id)) continue;
      this.removeActor(actor);
      this.actors.delete(id);
    }
  }

  private removeActor(actor: Actor): void {
    if (actor.bubbleTimer) window.clearTimeout(actor.bubbleTimer);
    actor.group.remove(actor.label);
    actor.label.element.remove();
    this.scene.remove(actor.group);
    actor.mixer?.stopAllAction();
    actor.shadow.geometry.dispose();
    (actor.shadow.material as THREE.Material).dispose();
  }

  showBubble(playerId: string, text: string): void {
    const a = this.actors.get(playerId);
    if (!a) return;
    a.bubbleEl.textContent = text;
    a.bubbleEl.classList.remove('hidden');
    if (a.bubbleTimer) window.clearTimeout(a.bubbleTimer);
    a.bubbleTimer = window.setTimeout(() => a.bubbleEl.classList.add('hidden'), BUBBLE_MS);
  }

  // ---------- điều khiển người chơi cục bộ ----------
  localPosition(): Vec2 | null {
    const a = this.actors.get(this.localId);
    return a ? { ...a.pos } : null;
  }

  /** Đi bộ tới (x, z) theo lưới đi bộ. Trả false nếu không có đường. */
  walkLocalTo(x: number, z: number, onArrive?: () => void): boolean {
    const a = this.actors.get(this.localId);
    if (!a || !this.nav) return false;
    const path = this.nav.findPath(a.pos, { x, z });
    if (!path) return false;
    this.path = path;
    this.onArrive = onArrive ?? null;
    a.actionAnimUntil = 0;
    this.localInside = null;
    return true;
  }

  /** Đi tới cửa của một khoá trong nav (vd 'cafe') */
  walkLocalToDoor(doorKey: string, onArrive?: () => void): boolean {
    const door = this.nav?.data.doors[doorKey];
    return door ? this.walkLocalTo(door.x, door.z, onArrive) : false;
  }

  /** Phát hoạt hình hành vi cho người chơi cục bộ rồi tự về idle */
  playLocalAnim(anim: Anim, seconds = ACTION_ANIM_SECONDS): void {
    const a = this.actors.get(this.localId);
    if (!a) return;
    a.actionAnim = anim;
    a.actionAnimUntil = performance.now() + seconds * 1000;
    this.localInside = this.doorNear(a.pos);
  }

  /** Dịch tức thì (vd lần đầu vào phòng) */
  teleportLocal(x: number, z: number): void {
    const a = this.actors.get(this.localId);
    if (!a) return;
    a.pos = { x, z };
    a.target = { x, z };
    this.path = [];
    this.camTarget.set(x, 0, z);
  }

  // ---------- vòng lặp ----------
  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, this.clock.getDelta());
    const now = performance.now();

    for (const actor of this.actors.values()) {
      const isLocal = actor.id === this.localId;
      let moving = false;
      let speed = 0;
      if (isLocal) {
        const next = this.path[0];
        if (next) {
          const dx = next.x - actor.pos.x;
          const dz = next.z - actor.pos.z;
          const d = Math.hypot(dx, dz);
          const step = LOCAL_SPEED * dt;
          if (d <= step) {
            actor.pos = { x: next.x, z: next.z };
            this.path.shift();
            if (this.path.length === 0) {
              const cb = this.onArrive;
              this.onArrive = null;
              cb?.();
            }
          } else {
            actor.pos = { x: actor.pos.x + (dx / d) * step, z: actor.pos.z + (dz / d) * step };
            actor.yaw = Math.atan2(dx, dz);
          }
          moving = true;
          speed = LOCAL_SPEED;
          this.stepTimer += dt;
          if (this.stepTimer > 0.38) {
            this.stepTimer = 0;
            this.opts.onStep?.();
          }
          if (now - this.lastSend > MOVE_SEND_MS) {
            this.lastSend = now;
            this.opts.onLocalMove?.(actor.pos.x, actor.pos.z);
          }
        } else if (now - this.lastSend > 1000) {
          // đứng yên: nhắc server vị trí cuối (một lần mỗi giây) để người khác thấy đúng
          this.lastSend = now;
          this.opts.onLocalMove?.(actor.pos.x, actor.pos.z);
        }
      } else {
        const dx = actor.target.x - actor.pos.x;
        const dz = actor.target.z - actor.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.04) {
          speed = Math.min(REMOTE_MAX_SPEED, Math.max(1.5, d * 6));
          const step = Math.min(d, speed * dt);
          actor.pos = { x: actor.pos.x + (dx / d) * step, z: actor.pos.z + (dz / d) * step };
          actor.yaw = Math.atan2(dx, dz);
          moving = true;
        }
      }

      actor.group.position.set(actor.pos.x, 0, actor.pos.z);
      if (actor.model) {
        // xoay mượt về hướng đi
        const cur = actor.model.rotation.y;
        let diff = actor.yaw - cur;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        actor.model.rotation.y = cur + diff * Math.min(1, dt * 12);
      }

      let anim: Anim;
      if (moving) anim = speed > 6 ? 'run' : 'walk';
      else if (isLocal) anim = now < actor.actionAnimUntil ? actor.actionAnim : 'idle';
      else anim = actor.info.anim;
      this.applyAnim(actor, anim);
      actor.mixer?.update(dt);
    }

    // camera bám người chơi cục bộ
    const me = this.actors.get(this.localId);
    if (me) this.camTarget.lerp(new THREE.Vector3(me.pos.x, 0, me.pos.z), Math.min(1, dt * 4));
    this.positionCamera(this.zoom);
    this.updateOcclusion(dt);
    this.updateInside();

    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  };

  private positionCamera(zoom: number): void {
    const d = this.camDist * zoom;
    const cp = Math.cos(this.camPitch);
    this.camera.position.set(this.camTarget.x + Math.sin(this.camYaw) * cp * d, this.camTarget.y + Math.sin(this.camPitch) * d, this.camTarget.z + Math.cos(this.camYaw) * cp * d);
    this.camera.lookAt(this.camTarget);
  }

  /** Toà nhà nằm giữa camera và nhân vật cục bộ thì mờ đi để thấy nhân vật */
  private updateOcclusion(dt: number): void {
    const me = this.actors.get(this.localId);
    if (!me || this.buildingFade.size === 0) return;
    const head = new THREE.Vector3(me.pos.x, 0.9, me.pos.z);
    const dir = head.clone().sub(this.camera.position);
    const dist = dir.length();
    this.raycaster.set(this.camera.position, dir.normalize());
    this.raycaster.far = dist - 0.3;
    const hit = new Set<string>();
    for (const h of this.raycaster.intersectObjects(this.buildingMeshes, true)) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.name.startsWith('building_')) o = o.parent;
      if (o) hit.add(o.name);
    }
    this.raycaster.far = Infinity;
    for (const [name, b] of this.buildingFade) {
      const target = hit.has(name) ? 0.18 : 1;
      b.opacity += (target - b.opacity) * Math.min(1, dt * 8);
      const solid = b.opacity > 0.985;
      for (const m of b.mats) {
        m.transparent = !solid;
        m.opacity = solid ? 1 : b.opacity;
        m.depthWrite = solid;
      }
    }
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- chuột / cảm ứng ----------
  private onPointerDown = (e: PointerEvent): void => {
    this.downAt = { x: e.clientX, y: e.clientY };
    this.dragging = false;
    this.lastDragX = e.clientX;
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
  };

  /** Kéo ngang để xoay camera quanh nhân vật */
  private onPointerMove = (e: PointerEvent): void => {
    const d = this.downAt;
    if (!d) return;
    if (!this.dragging && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) this.dragging = true;
    if (this.dragging) {
      this.camYaw -= (e.clientX - this.lastDragX) * 0.008;
      this.lastDragX = e.clientX;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    const d = this.downAt;
    this.downAt = null;
    if (!d || this.dragging || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return; // kéo chứ không phải bấm
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);

    const hit = this.raycaster.intersectObjects(this.buildingMeshes, true)[0];
    if (hit && this.opts.onBuilding) {
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.name.startsWith('building_')) o = o.parent;
      if (o) {
        this.opts.onBuilding(o.name.slice('building_'.length));
        return;
      }
    }
    const ray = this.raycaster.ray;
    if (Math.abs(ray.direction.y) < 1e-4) return;
    const t = -ray.origin.y / ray.direction.y;
    if (t <= 0) return;
    this.opts.onGround(ray.origin.x + ray.direction.x * t, ray.origin.z + ray.direction.z * t);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.zoom = Math.min(1.5, Math.max(0.5, this.zoom * (e.deltaY > 0 ? 1.08 : 0.92)));
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('wheel', this.onWheel);
    for (const a of this.actors.values()) this.removeActor(a);
    this.actors.clear();
    for (const s of this.signs.values()) {
      this.scene.remove(s.label);
      s.el.remove();
    }
    this.signs.clear();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((x) => x?.dispose());
      }
    });
    this.renderer.dispose();
    el.remove();
    this.labels.domElement.remove();
  }
}
