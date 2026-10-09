import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ActionPrimitive, PlayerStatsPrimitive, SleepTiming, sleepAdviceNow } from '../domain';
import { AvatarId } from '../lib/avatars';
import {
  ACTION_EMOTE,
  ACTION_VISUALS,
  DEFAULT_VISUAL,
  MOOD_GLOW,
  SKY_KEYS,
  STATION_FACING,
  STATION_LABEL,
  STATION_Y,
  STATION_POS,
  STATION_SFX,
  StationId,
  ActionMood,
  stationOf,
} from '../lib/roomStations';

export interface RoomAction {
  id: string;
  /** Tăng mỗi lần chọn hành vi, để cùng một hành vi lặp lại vẫn kích hoạt hiệu ứng */
  n: number;
}

interface RoomSceneProps {
  avatarId: AvatarId;
  stats: PlayerStatsPrimitive;
  hoursUsed: number;
  lastAction: RoomAction | null;
  /** Dồn nhiều dopamine nhanh trong ngày: phòng nháy hồng cảnh báo */
  crashRisk: boolean;
  /** Lần đầu chơi: chỉ vào một món đồ và nhắc "chạm vào đây" */
  coach?: boolean;
  /** Hết ngày: phòng tối, nhân vật lên giường ngủ và nằm yên đến sáng */
  sleeping?: boolean;
  /** Danh sách hành vi để chọn trực tiếp bằng cách bấm vào đồ trong phòng */
  actions?: ActionPrimitive[];
  hoursRemaining?: number;
  onSelectAction?: (actionId: string) => void;
  /** Hành vi nào đang bị khóa và vì sao */
  lockReasons?: Record<string, string>;
  /** Nhãn thói quen của từng hành vi */
  habitTags?: Record<string, string>;
  /** Phát âm thanh trong phòng (bước chân, đồ vật, cửa) */
  onSound?: (name: string, volume?: number) => void;
}

interface Picked {
  station: StationId;
  x: number;
  y: number;
}

interface SceneApi {
  setAvatar: (id: AvatarId) => void;
  trigger: (actionId: string) => void;
}

/** Chỉ số hiện ngay trong phòng (thu gọn) */
const ROOM_STATS: Array<{ key: keyof PlayerStatsPrimitive; icon: string; bar: string }> = [
  { key: 'energy', icon: '⚡', bar: 'bg-amber-400' },
  { key: 'mental', icon: '🧠', bar: 'bg-sky-400' },
  { key: 'willpower', icon: '🛡️', bar: 'bg-indigo-400' },
  { key: 'dopamine', icon: '✨', bar: 'bg-pink-400' },
  { key: 'social', icon: '👥', bar: 'bg-emerald-400' },
];

/** Nhãn nhịp sinh học hiện trong menu giường (null = bình thường, không cần nhắc) */
const SLEEP_TIP: Partial<Record<SleepTiming, { text: string; tone: string }>> = {
  day: { text: '☀️ Đang là ban ngày: ngủ lúc này chỉ hiệu quả ~60%', tone: 'text-amber-700' },
  twilight: { text: '🌗 Hơi lệch giờ: hiệu quả ~80%', tone: 'text-amber-700' },
  evening_nap: { text: '🌆 Chợp mắt chiều tối: kém hiệu quả, tối khó ngủ', tone: 'text-amber-700' },
  midday_nap: { text: '🌤 Giờ trưa: chợp mắt lúc này rất tốt', tone: 'text-emerald-700' },
  night: { text: '🌙 Đúng giờ ngủ đêm', tone: 'text-indigo-700' },
};

const formatMoney =(k: number) => (Math.abs(k) >= 1000 ? `${(k / 1000).toFixed(1)}tr` : `${Math.round(k)}k`);

interface FloatDelta {
  id: number;
  text: string;
  good: boolean;
  slot: number;
}

/** Hoạt hình có sẵn trong mô hình Kenney mini-characters */
type Clip = 'idle' | 'walk' | 'sit' | 'die' | 'interact-right' | 'jump' | 'emote-yes' | 'crouch' | 'pick-up';

/** Dáng nhân vật khi đang làm hành vi tại một điểm đến */
function actClip(mood: ActionMood, station: StationId): Clip {
  if (mood === 'sleep') return 'die'; // nằm xuống
  if (mood === 'work') return 'sit';
  if (station === 'desk' || station === 'sofa') return 'sit';
  if (station === 'music') return 'emote-yes';
  if (station === 'trash') return 'pick-up';
  if (station === 'pet') return mood === 'fast' ? 'interact-right' : 'crouch';
  if (station === 'kitchen') return 'interact-right';
  if (station === 'basketball') return 'jump';
  if (station === 'dance') return 'emote-yes';
  if (mood === 'fast') return 'interact-right';
  if (mood === 'slow') return 'sit';
  return 'emote-yes';
}

const CHAR_HEIGHT = 0.62;
const HOME: [number, number] = STATION_POS.center;
const WALK_SPEED = 2.8;
/** Giờ thức dậy trong cảnh 3D: ngày bắt đầu lúc 07:00 */
const WAKE_HOUR = 7;

const SKY_A = new THREE.Color();
const SKY_B = new THREE.Color();

/** Ghi màu bầu trời theo giờ vào `out` (không tạo đối tượng mới mỗi khung hình). */
function skyColor(hour: number, out: THREE.Color): THREE.Color {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const [h0, c0] = SKY_KEYS[i];
    const [h1, c1] = SKY_KEYS[i + 1];
    if (h >= h0 && h <= h1) {
      const t = (h - h0) / (h1 - h0 || 1);
      return out.copy(SKY_A.set(c0)).lerp(SKY_B.set(c1), t);
    }
  }
  return out.set(SKY_KEYS[0][1]);
}

function uniqueMaterials(root: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const mats: THREE.MeshStandardMaterial[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.material) {
      const m = (mesh.material as THREE.MeshStandardMaterial).clone();
      mesh.material = m;
      mats.push(m);
    }
  });
  return mats;
}

const RoomScene: React.FC<RoomSceneProps> = ({
  avatarId,
  stats,
  hoursUsed,
  lastAction,
  crashRisk,
  actions = [],
  hoursRemaining = 0,
  onSelectAction,
  lockReasons = {},
  habitTags = {},
  onSound,
  coach = false,
  sleeping = false,
}) => {
  const soundRef = useRef(onSound);
  soundRef.current = onSound;
  const [picked, setPicked] = useState<Picked | null>(null);
  const [hovered, setHovered] = useState<StationId | null>(null);
  const interactive = !!onSelectAction && actions.length > 0;
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;

  // Số bay lên khi chỉ số đổi
  const [deltas, setDeltas] = useState<FloatDelta[]>([]);
  const prevStatsRef = useRef(stats);
  const deltaIdRef = useRef(0);
  useEffect(() => {
    const prev = prevStatsRef.current;
    prevStatsRef.current = stats;
    if (prev === stats) return;
    const fresh: FloatDelta[] = [];
    for (const s of ROOM_STATS) {
      const d = Math.round(stats[s.key] - prev[s.key]);
      if (d !== 0) fresh.push({ id: ++deltaIdRef.current, text: `${s.icon} ${d > 0 ? '+' : ''}${d}`, good: d > 0, slot: fresh.length });
    }
    const dm = Math.round(stats.money - prev.money);
    if (dm !== 0) fresh.push({ id: ++deltaIdRef.current, text: `💰 ${dm > 0 ? '+' : '-'}${formatMoney(Math.abs(dm))}`, good: dm > 0, slot: fresh.length });
    if (!fresh.length) return;
    setDeltas((cur) => [...cur, ...fresh]);
    const ids = new Set(fresh.map((f) => f.id));
    setTimeout(() => setDeltas((cur) => cur.filter((f) => !ids.has(f.id))), 1700);
  }, [stats]);
  const mountRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const petBubbleRef = useRef<HTMLDivElement>(null);
  const huskyBubbleRef = useRef<HTMLDivElement>(null);
  const coachRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const liveRef = useRef({ stats, hoursUsed, crashRisk, sleeping, coachOn: false });
  const pendingRef = useRef<{ avatar: AvatarId; action: string | null }>({ avatar: avatarId, action: null });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  liveRef.current = { stats, hoursUsed, crashRisk, sleeping, coachOn: coach && !picked && interactive };

  // Dựng cảnh một lần
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3, 3, 2, -2, 0.1, 50);
    camera.position.set(4.2, 3.7, 5.2);
    camera.lookAt(0, 0.15, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x6b6b8a, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(3, 5, 2.5);
    scene.add(sun);
    const glowLight = new THREE.PointLight(0xff2d95, 0, 3.2, 1.6);
    glowLight.position.set(0, 0.8, 0);
    scene.add(glowLight);

    const room = new THREE.Group();
    scene.add(room);

    const loader = new GLTFLoader();
    // Lưu promise (không phải kết quả) để các lần gọi song song cùng một file chỉ tải một lần
    const cache = new Map<string, Promise<THREE.Group>>();
    const getModel = async (url: string) => {
      let g = cache.get(url);
      if (!g) {
        g = loader.loadAsync(url).then((gltf) => gltf.scene);
        cache.set(url, g);
      }
      return (await g).clone(true);
    };

    const props: Partial<Record<StationId, THREE.MeshStandardMaterial[]>> = {};
    const addProp = async (name: string, x: number, z: number, rotY: number, station?: StationId) => {
      const obj = await getModel(`/models/arcade/${name}.glb`);
      obj.position.set(x, 0, z);
      obj.rotation.y = rotY;
      const mats = uniqueMaterials(obj);
      if (station) {
        props[station] = [...(props[station] ?? []), ...mats];
        obj.traverse((o) => { o.userData.station = station; });
      }
      room.add(obj);
    };

    // Đồ nội thất Kenney Furniture Kit: gốc ở góc mô hình, nên căn giữa và thu nhỏ cho hợp nhân vật
    const FURNITURE_SCALE = 0.75;
    const addFurniture = async (name: string, x: number, z: number, rotY: number, station?: StationId, y = 0, scale = FURNITURE_SCALE) => {
      const inner = await getModel(`/models/furniture/${name}.glb`);
      const box = new THREE.Box3().setFromObject(inner);
      const c = box.getCenter(new THREE.Vector3());
      inner.position.set(-c.x, -box.min.y, -c.z);
      const obj = new THREE.Group();
      obj.add(inner);
      obj.scale.setScalar(scale);
      obj.position.set(x, y, z);
      obj.rotation.y = rotY;
      const mats = uniqueMaterials(obj);
      if (station) {
        props[station] = [...(props[station] ?? []), ...mats];
        obj.traverse((o) => { o.userData.station = station; });
      }
      room.add(obj);
      return mats;
    };

    // Đèn ban đêm: đèn cây (vàng ấm) và màn hình máy tính (xanh nhạt) tự bật khi trời tối
    const lampLight = new THREE.PointLight(0xffb866, 0, 3.6, 1.4);
    lampLight.position.set(2.3, 0.7, 1.0);
    room.add(lampLight);
    const screenLight = new THREE.PointLight(0x9fd0ff, 0, 1.4, 1.6);
    screenLight.position.set(-0.6, 0.45, 1.65);
    room.add(screenLight);
    // Điểm neo cho vòng tròn hướng dẫn (trên mặt bàn học)
    const coachAnchor = new THREE.Object3D();
    coachAnchor.position.set(-0.6, 0.42, 1.55);
    room.add(coachAnchor);
    let lampMats: THREE.MeshStandardMaterial[] = [];
    let screenMats: THREE.MeshStandardMaterial[] = [];
    let lampOn = 0;

    // Chó cưng (Kenney Cube Pets): có hoạt hình riêng, phản ứng khi được vuốt ve / bị chọc
    const PET_HEIGHT = 0.3;
    const petGroup = new THREE.Group();
    let petMixer: THREE.AnimationMixer | null = null;
    const petClips = new Map<string, THREE.AnimationAction>();
    let petCurrent: THREE.AnimationAction | null = null;
    const petPlay = (name: string) => {
      const next = petClips.get(name);
      if (!next || next === petCurrent) return;
      next.reset().fadeIn(0.25).play();
      petCurrent?.fadeOut(0.25);
      petCurrent = next;
    };
    const addPet = async () => {
      const gltf = await loader.loadAsync('/models/pets/animal-dog.glb');
      const inner = gltf.scene;
      const box = new THREE.Box3().setFromObject(inner);
      const c = box.getCenter(new THREE.Vector3());
      const s = PET_HEIGHT / (box.max.y - box.min.y || 1);
      inner.position.set(-c.x * s, -box.min.y * s, -c.z * s);
      inner.scale.setScalar(s);
      const pet = petGroup;
      pet.add(inner);
      pet.position.set(0.78, 0, -0.4);
      pet.rotation.y = -Math.PI / 2;
      const mats = uniqueMaterials(pet);
      props.pet = [...(props.pet ?? []), ...mats];
      pet.traverse((o) => { o.userData.station = 'pet'; });
      room.add(pet);
      petMixer = new THREE.AnimationMixer(inner);
      gltf.animations.forEach((clip) => petClips.set(clip.name, petMixer!.clipAction(clip)));
      petPlay('idle');
    };

    // Husky mập (cùng mô hình chó Kenney, nhuộm xám-trắng, thân to ngang): đi khắp phòng cho sinh động
    /** Các khoảng sàn trống husky đi qua lại (tránh đồ đạc) */
    const HUSKY_SPOTS: Array<[number, number]> = [
      [-0.3, 1.1], [0.35, 1.15], [-0.45, 0.3], [-0.6, -0.35], [0.1, -0.6], [1.05, -0.35], [0.3, 0.4], [-0.2, -0.1],
    ];
    const husky = new THREE.Group();
    const huskyClips = new Map<string, THREE.AnimationAction>();
    let huskyMixer: THREE.AnimationMixer | null = null;
    let huskyCurrent: THREE.AnimationAction | null = null;
    const huskyState = { target: 1, wait: 1.5, angryUntil: -10, onChair: false, barkAgainAt: 0 };
    /** Ghế máy tính (x, z, độ cao mặt ghế) và chỗ nhảy xuống khi bị giành ghế */
    const HUSKY_SEAT: [number, number, number] = [-0.6, 1.9, 0.2];
    const HUSKY_HOP: [number, number] = [-0.15, 1.45];
    const huskyPlay = (name: string) => {
      const next = huskyClips.get(name);
      if (!next || next === huskyCurrent) return;
      next.reset().fadeIn(0.3).play();
      huskyCurrent?.fadeOut(0.3);
      huskyCurrent = next;
    };
    const addHusky = async () => {
      const gltf = await loader.loadAsync('/models/pets/animal-dog.glb');
      const inner = gltf.scene;
      const box = new THREE.Box3().setFromObject(inner);
      const c = box.getCenter(new THREE.Vector3());
      const s = (PET_HEIGHT * 1.15) / (box.max.y - box.min.y || 1);
      inner.position.set(-c.x * s * 1.4, -box.min.y * s, -c.z * s * 1.4);
      inner.scale.set(s * 1.4, s, s * 1.4);
      inner.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const mat = (m.material as THREE.MeshStandardMaterial).clone();
        // Đổi bộ lông nâu thành xám-trắng kiểu husky: vùng sáng -> trắng, vùng tối -> xám xanh (mắt, mũi vẫn tối)
        mat.onBeforeCompile = (sh) => {
          sh.fragmentShader = sh.fragmentShader.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
            float hl = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            diffuseColor.rgb = hl < 0.08 ? diffuseColor.rgb : mix(vec3(0.32, 0.37, 0.45), vec3(0.96), smoothstep(0.18, 0.42, hl));`
          );
        };
        mat.customProgramCacheKey = () => 'husky';
        m.material = mat;
      });
      husky.add(inner);
      husky.position.set(HUSKY_SPOTS[0][0], 0, HUSKY_SPOTS[0][1]);
      room.add(husky);
      huskyMixer = new THREE.AnimationMixer(inner);
      gltf.animations.forEach((clip) => huskyClips.set(clip.name, huskyMixer!.clipAction(clip)));
      huskyPlay('idle');
    };
    /** Xoay mượt về hướng góc a (đi đường ngắn nhất quanh vòng tròn) */
    const turnHusky = (a: number, k: number) => {
      const d = Math.atan2(Math.sin(a - husky.rotation.y), Math.cos(a - husky.rotation.y));
      husky.rotation.y += d * Math.min(1, k);
    };
    /**
     * Đi lang thang giữa các khoảng sàn trống; bị nhân vật đang đi đụng phải thì đứng lại sủa.
     * Trả về true khi đang tức giận (để hiện bong bóng).
     */
    const updateHusky = (
      dt: number,
      time: number,
      charX: number,
      charZ: number,
      charWalking: boolean,
      /** Trời tối: husky chiếm ghế máy tính */
      night: boolean,
      /** Nhân vật đang đến / đang dùng bàn máy tính */
      deskTaken: boolean
    ): '' | 'angry' | 'pc' => {
      if (!huskyMixer) return '';
      huskyMixer.update(dt);
      const angry = time < huskyState.angryUntil;
      const cdx = charX - husky.position.x;
      const cdz = charZ - husky.position.z;

      // Đang ngồi máy tính mà bị giành ghế: nhảy xuống, quay sang sủa
      if (huskyState.onChair && deskTaken) {
        huskyState.onChair = false;
        husky.position.set(HUSKY_HOP[0], 0, HUSKY_HOP[1]);
        huskyState.angryUntil = time + 2.6;
        huskyState.barkAgainAt = time + 1.2;
        huskyState.wait = 2;
        soundRef.current?.('bark', 0.4);
      }
      if (huskyState.barkAgainAt && time > huskyState.barkAgainAt) {
        huskyState.barkAgainAt = 0;
        soundRef.current?.('bark', 0.4);
      }
      // Ngồi trên ghế bấm máy tính đến khi trời sáng
      if (huskyState.onChair) {
        if (!night) {
          huskyState.onChair = false;
          husky.position.set(HUSKY_HOP[0], 0, HUSKY_HOP[1]);
        } else {
          husky.rotation.z = 0;
          husky.position.y = HUSKY_SEAT[2] + Math.abs(Math.sin(time * 9)) * 0.008; // gõ phím rung rung
          turnHusky(Math.PI, dt * 6);
          huskyPlay('idle');
          return 'pc';
        }
      }

      if (!angry && !huskyState.onChair && charWalking && time > huskyState.angryUntil + 1.2 && Math.hypot(cdx, cdz) < 0.3) {
        huskyState.angryUntil = time + 1.8;
        soundRef.current?.('bark', 0.35);
      }
      if (time < huskyState.angryUntil) {
        husky.rotation.z = 0;
        turnHusky(Math.atan2(cdx, cdz), dt * 10);
        huskyPlay('gesture-negative');
        return 'angry';
      }

      // Tối rồi và bàn đang trống: tới ghế máy tính
      if (night && !deskTaken) {
        const dx = HUSKY_SEAT[0] - husky.position.x;
        const dz = HUSKY_SEAT[1] - husky.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.03) {
          huskyState.onChair = true;
          husky.position.set(HUSKY_SEAT[0], HUSKY_SEAT[2], HUSKY_SEAT[1]);
          return 'pc';
        }
        const step = Math.min(dist, 0.4 * dt);
        husky.position.x += (dx / dist) * step;
        husky.position.z += (dz / dist) * step;
        turnHusky(Math.atan2(dx, dz), dt * 8);
        husky.rotation.z = Math.sin(time * 8) * 0.04;
        huskyPlay('walk');
        return '';
      }
      if (huskyState.wait > 0) {
        huskyState.wait -= dt;
        husky.rotation.z = 0;
        huskyPlay('idle');
        return '';
      }
      const [gx, gz] = HUSKY_SPOTS[huskyState.target];
      const dx = gx - husky.position.x;
      const dz = gz - husky.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.02) {
        // Tới nơi: nghỉ một lúc rồi chọn chỗ khác
        let next = huskyState.target;
        while (next === huskyState.target) next = Math.floor(Math.random() * HUSKY_SPOTS.length);
        huskyState.target = next;
        huskyState.wait = 1 + Math.random() * 3;
        return '';
      }
      // Đi chậm, lạch bạch
      const step = Math.min(dist, 0.3 * dt);
      husky.position.x += (dx / dist) * step;
      husky.position.z += (dz / dist) * step;
      turnHusky(Math.atan2(dx, dz), dt * 8);
      husky.rotation.z = Math.sin(time * 8) * 0.04;
      huskyPlay('walk');
      return '';
    };

    // Nhân vật
    const holder = new THREE.Group();
    holder.position.set(HOME[0], 0, HOME[1]);
    room.add(holder);
    let charModel: THREE.Object3D | null = null;
    let charMats: THREE.MeshStandardMaterial[] = [];
    let mixer: THREE.AnimationMixer | null = null;
    let clips = new Map<string, THREE.AnimationAction>();
    let currentClip: THREE.AnimationAction | null = null;
    let currentName: Clip | null = null;

    const play = (name: Clip, fade = 0.25) => {
      if (name === currentName) return;
      const next = clips.get(name);
      if (!next) return;
      next.reset();
      if (name === 'die') {
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
      }
      next.fadeIn(fade).play();
      currentClip?.fadeOut(fade);
      currentClip = next;
      currentName = name;
    };

    const charCache = new Map<string, { scene: THREE.Group; animations: THREE.AnimationClip[] }>();
    const loadAvatar = async (id: AvatarId) => {
      const url = `/models/characters/${id}.glb`;
      let src = charCache.get(url);
      if (!src) {
        const gltf = await loader.loadAsync(url);
        src = { scene: gltf.scene, animations: gltf.animations };
        charCache.set(url, src);
      }
      const obj = cloneSkinned(src.scene) as THREE.Group;
      mixer?.stopAllAction();
      mixer = new THREE.AnimationMixer(obj);
      clips = new Map(src.animations.map((c) => [c.name, mixer!.clipAction(c)]));
      currentClip = null;
      currentName = null;
      play(anim.phase === 'walk' || anim.phase === 'return' ? 'walk' : 'idle', 0);
      const box = new THREE.Box3().setFromObject(obj);
      const h = box.max.y - box.min.y || 1;
      const s = CHAR_HEIGHT / h;
      obj.scale.setScalar(s);
      obj.position.y = -box.min.y * s;
      if (charModel) holder.remove(charModel);
      charModel = obj;
      charMats = uniqueMaterials(obj);
      obj.traverse((o) => { o.userData.station = 'center'; });
      holder.add(obj);
    };

    // Bấm vào đồ vật / nhân vật trong phòng để chọn hành vi
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hoverStation: StationId | null = null;
    const stationAt = (e: PointerEvent | MouseEvent): StationId | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      for (const hit of raycaster.intersectObject(room, true)) {
        const s = hit.object.userData.station as StationId | undefined;
        if (s) return s;
      }
      return null;
    };
    /** Chạm trượt (đồ nhỏ trên điện thoại): chọn món đồ gần điểm chạm nhất trong bán kính cho phép */
    const anchor = new THREE.Vector3();
    const nearestStation = (e: MouseEvent, maxPx: number): StationId | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      let best: StationId | null = null;
      let bestD = maxPx;
      for (const id of Object.keys(props) as StationId[]) {
        const [x, z] = id === 'outside' ? [0.12, 1.8] : STATION_POS[id];
        anchor.set(x, 0.3, z);
        room.localToWorld(anchor).project(camera);
        const d = Math.hypot((anchor.x + 1) / 2 * rect.width - (e.clientX - rect.left), (1 - anchor.y) / 2 * rect.height - (e.clientY - rect.top));
        if (d < bestD) { bestD = d; best = id; }
      }
      // Nhân vật
      holder.getWorldPosition(anchor);
      anchor.y += CHAR_HEIGHT / 2;
      anchor.project(camera);
      const dc = Math.hypot((anchor.x + 1) / 2 * rect.width - (e.clientX - rect.left), (1 - anchor.y) / 2 * rect.height - (e.clientY - rect.top));
      if (dc < bestD) best = 'center';
      return best;
    };
    const onMove = (e: PointerEvent) => {
      if (!interactiveRef.current || e.pointerType === 'touch') return;
      const s = stationAt(e);
      if (s !== hoverStation) {
        hoverStation = s;
        setHovered(s);
        renderer.domElement.style.cursor = s ? 'pointer' : 'default';
      }
    };
    const onLeave = () => {
      hoverStation = null;
      setHovered(null);
    };
    const onClick = (e: MouseEvent) => {
      if (!interactiveRef.current) return;
      // Ngón tay to hơn con trỏ chuột: cho phép chạm lệch nhiều hơn
      const s = stationAt(e) ?? nearestStation(e, lastPointer === 'touch' ? 52 : 24);
      const rect = mount.getBoundingClientRect();
      setPicked(s ? { station: s, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
    };
    let lastPointer = 'mouse';
    const onDown = (e: PointerEvent) => { lastPointer = e.pointerType; };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    renderer.domElement.addEventListener('click', onClick);

    // Trạng thái hoạt hình
    const anim = {
      phase: 'idle' as 'idle' | 'walk' | 'act' | 'return',
      station: 'center' as StationId,
      mood: 'neutral' as ActionMood,
      t: 0,
      actDur: 1,
      lie: 0,
      facing: 0.6,
      glow: 0,
      actionId: '',
    };

    const trigger = (actionId: string) => {
      const v = ACTION_VISUALS[actionId] ?? DEFAULT_VISUAL;
      anim.station = v.station;
      anim.actionId = actionId;
      afterUntil = 0;
      anim.mood = v.mood;
      anim.t = 0;
      anim.actDur = v.station === 'outside' ? 2.4 : v.mood === 'sleep' ? 2.6 : v.mood === 'work' || v.mood === 'slow' ? 2.0 : 1.4;
      holder.visible = true;
      anim.phase = 'walk';
      anim.glow = 1;
    };

    apiRef.current = { setAvatar: (id) => void loadAvatar(id), trigger };

    // Tải toàn bộ cảnh
    let disposed = false;
    (async () => {
      try {
        // Tải mọi thứ song song: sàn, tường, đồ đạc, nhân vật
        const shell: Promise<void>[] = [];
        for (let ix = 0; ix < 5; ix++) {
          for (let iz = 0; iz < 4; iz++) {
            shell.push(addProp('floor', -2 + ix, -1.5 + iz, 0));
          }
        }
        // Tường sau và tường trái
        for (let ix = 0; ix < 5; ix++) {
          shell.push(addProp(ix === 3 ? 'wall-window' : 'wall', -2 + ix, -2.3, 0));
        }
        for (let iz = 0; iz < 4; iz++) {
          shell.push(addProp(iz === 1 ? 'wall-window' : 'wall', -2.8, -1.5 + iz, Math.PI / 2));
        }
        shell.push(addProp('wall-corner', -2.8, -2.3, 0));
        // Đồ trong phòng
        await Promise.all([
          ...shell,
          loadAvatar(pendingRef.current.avatar),
          addProp('arcade-machine', -1.75, -1.65, 0, 'arcade'),
          addProp('arcade-machine', -1.15, -1.65, 0, 'arcade'),
          addProp('claw-machine', -0.35, -1.62, 0, 'claw'),
          addProp('vending-machine', 0.55, -1.7, 0, 'vending'),
          addProp('cash-register', 1.5, -1.7, 0, 'register'),
          addProp('dance-machine', 2.0, 0.15, -Math.PI / 2, 'dance'),
          addProp('pinball', -2.0, 0.2, Math.PI / 2),
          addProp('basketball-game', -2.0, 1.2, Math.PI / 2, 'basketball'),
          // Góc sinh hoạt
          addFurniture('rugRound', 0, 0.35, 0),
          addFurniture('bedSingle', 1.2, 1.55, Math.PI / 2, 'bed'),
          addFurniture('desk', -0.6, 1.55, 0, 'desk'),
          addFurniture('computerScreen', -0.6, 1.5, 0, 'desk', 0.285).then((m) => { screenMats = m; }),
          addFurniture('chairDesk', -0.6, 1.88, Math.PI, 'desk'),
          addFurniture('kitchenStove', 2.25, -0.9, -Math.PI / 2, 'kitchen'),
          addFurniture('pottedPlant', -2.3, 1.95, 0),
          addFurniture('lampRoundFloor', 2.3, 1.0, 0).then((m) => { lampMats = m; }),
          addFurniture('loungeSofa', -1.25, 0.75, Math.PI / 2, 'sofa'),
          addFurniture('speaker', 0.98, 0.85, -Math.PI / 2, 'music'),
          addFurniture('trashcan', -2.3, -0.75, 0, 'trash'),
          addFurniture('rugDoormat', 0.12, 1.8, 0, 'outside', 0, 1.4),
          addFurniture('coatRackStanding', 0.42, 1.95, 0, 'outside'),
          addPet(),
          addHusky(),
        ]);
        if (disposed) return;
        if (pendingRef.current.action) trigger(pendingRef.current.action);
        setReady(true);
      } catch {
        if (!disposed) setFailed(true);
      }
    })();

    // Kích thước
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      const aspect = w / h;
      // Màn hình hẹp (điện thoại): phóng to hơn một chút, chấp nhận cắt bớt mép tường ngoài cùng
      const fitW = w < 640 ? 3.15 : 3.5;
      const halfH = Math.max(2.1, fitW / aspect);
      const halfW = halfH * aspect;
      camera.left = -halfW;
      camera.right = halfW;
      // Điện thoại: dịch khung nhìn để căn phòng nằm giữa khung (không sát mép trên)
      const offY = w < 640 ? halfH * 0.16 : 0;
      camera.top = halfH + offY;
      camera.bottom = -halfH + offY;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // Vòng lặp
    const clock = new THREE.Clock();
    let raf = 0;
    const tmpColor = new THREE.Color();
    const skyNow = new THREE.Color();
    scene.background = skyNow;
    let sinceRender = 0;
    let lift = 0;
    let afterUntil = 0;
    let lastStep = 0;
    let stepIdx = 0;
    const headPos = new THREE.Vector3();
    /** Đặt bong bóng emoji (phần tử HTML) phía trên một vật trong cảnh; text rỗng thì ẩn. */
    const placeBubble = (el: HTMLDivElement | null, obj: THREE.Object3D, above: number, text: string) => {
      if (!el) return;
      if (!text) {
        el.style.opacity = '0';
        return;
      }
      obj.getWorldPosition(headPos);
      headPos.y += above;
      headPos.project(camera);
      const x = ((headPos.x + 1) / 2) * mount.clientWidth;
      const y = ((1 - headPos.y) / 2) * mount.clientHeight;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      if (el.textContent !== text) el.textContent = text;
      el.style.opacity = '1';
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const delta = clock.getDelta();
      // Giới hạn ~30 khung/giây: đủ mượt cho cảnh này và tiết kiệm pin
      sinceRender += delta;
      if (sinceRender < 1 / 30) return;
      const dt = Math.min(sinceRender, 0.08);
      sinceRender = 0;
      const time = clock.elapsedTime;
      const { stats: st, hoursUsed: used, crashRisk: risk, sleeping: asleep, coachOn } = liveRef.current;
      // Hết 24h không quay về 07:00 sáng; lúc ngủ qua đêm cố định 01:00 (tối)
      const hrs = asleep ? 25 : Math.min(used, 23.9) + WAKE_HOUR;

      // Ánh sáng theo giờ & chỉ số
      const sky = skyColor(hrs, skyNow);
      const daylight = Math.max(0, Math.sin(((hrs - 6) / 12) * Math.PI));
      hemi.intensity = 0.2 + 0.85 * daylight;
      sun.intensity = 0.08 + 1.52 * daylight;
      // Trời tối thì đèn bật dần lên
      const lampGoal = daylight < 0.35 ? 1 - daylight / 0.35 : 0;
      lampOn += (lampGoal - lampOn) * Math.min(1, dt * 2);
      lampLight.intensity = lampOn * 2.6;
      screenLight.intensity = lampOn * 1.1;
      lampMats.forEach((m) => { m.emissive.setHex(0xffd28a); m.emissiveIntensity = lampOn * 0.9; });
      if (!(anim.phase === 'act' && anim.station === 'desk')) {
        screenMats.forEach((m) => { m.emissive.setHex(0x9fd0ff); m.emissiveIntensity = lampOn * 0.35; });
      }
      sun.color.copy(tmpColor.set(0xffffff).lerp(sky, 0.35));
      renderer.toneMappingExposure = 0.62 + 0.5 * (st.energy / 100);

      // Dopamine cao: cả phòng nháy hồng
      const dopa = risk ? 0.6 + 0.4 * Math.sin(time * 6) : 0;
      glowLight.color.set(0xff2d95);
      glowLight.position.set(-1.2, 0.9, -1.0);
      glowLight.intensity = dopa * 2.2 + anim.glow * 1.6;
      if (anim.glow > 0 && anim.phase !== 'act') anim.glow = Math.max(0, anim.glow - dt * 1.5);

      room.rotation.y = Math.sin(time * 0.35) * 0.025;

      // Hoạt hình nhân vật: dùng clip có sẵn trong mô hình; không có clip thì nhún bằng code
      const animated = clips.size > 0;
      mixer?.update(dt);
      petMixer?.update(dt);
      const huskyMood = updateHusky(
        dt,
        time,
        holder.position.x,
        holder.position.z,
        holder.visible && (anim.phase === 'walk' || anim.phase === 'return'),
        hrs >= 19,
        anim.station === 'desk' && (anim.phase === 'walk' || anim.phase === 'act')
      );
      const petBusy = anim.phase === 'act' && anim.station === 'pet';
      petPlay(petBusy ? (anim.mood === 'fast' ? 'gesture-negative' : 'gesture-positive') : 'idle');
      const target = STATION_POS[anim.station];
      let bob = 0;
      if (anim.phase === 'walk' || anim.phase === 'return') {
        const goal = anim.phase === 'walk' ? target : HOME;
        const dx = goal[0] - holder.position.x;
        const dz = goal[1] - holder.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.04) {
          const step = Math.min(dist, WALK_SPEED * dt);
          holder.position.x += (dx / dist) * step;
          holder.position.z += (dz / dist) * step;
          holder.rotation.y = Math.atan2(dx, dz);
          if (animated) play('walk');
          else bob = Math.abs(Math.sin(time * 14)) * 0.07;
          // Tiếng bước chân
          if (holder.visible && time - lastStep > 0.34) {
            lastStep = time;
            stepIdx = (stepIdx % 3) + 1;
            soundRef.current?.(`step${stepIdx}`, 0.22);
          }
        } else if (anim.phase === 'walk') {
          anim.phase = 'act';
          anim.t = 0;
          if (animated) play(actClip(anim.mood, anim.station));
          if (anim.station === 'outside') {
            // Ra khỏi phòng: khuất bóng trong lúc đi dạo
            holder.visible = false;
            soundRef.current?.('door-close', 0.45);
          } else {
            const sfx = STATION_SFX[anim.station];
            if (sfx) soundRef.current?.(sfx, 0.5);
          }
        } else {
          anim.phase = 'idle';
        }
      }
      if (anim.phase === 'act') {
        anim.t += dt;
        const face = STATION_FACING[anim.station];
        holder.rotation.y += (face - holder.rotation.y) * Math.min(1, dt * 10);
        if (animated) {
          // Dáng đã do clip đảm nhận
        } else if (anim.mood === 'sleep') {
          anim.lie = Math.min(1, anim.lie + dt * 3);
        } else if (anim.mood === 'work') {
          bob = Math.abs(Math.sin(time * 9)) * 0.03;
        } else {
          bob = Math.abs(Math.sin(time * 11)) * 0.1;
        }
        // Món đồ phát sáng
        const pulse = 0.55 + 0.45 * Math.sin(time * 12);
        const mats = props[anim.station];
        // Ngủ qua đêm: giường không nhấp nháy, nhân vật nằm yên đến sáng
        const overnight = asleep && anim.station === 'bed';
        if (mats) mats.forEach((m) => { m.emissive.setHex(MOOD_GLOW[anim.mood]); m.emissiveIntensity = overnight ? 0 : pulse * 0.9; });
        if (anim.mood !== 'sleep') anim.glow = Math.max(anim.glow, 0.5);
        if (anim.t >= anim.actDur && !overnight) {
          if (mats) mats.forEach((m) => { m.emissiveIntensity = 0; });
          anim.phase = anim.station === 'center' ? 'idle' : 'return';
          afterUntil = time + 2.2; // pha "sau khi làm xong"
          if (!holder.visible) {
            holder.visible = true;
            soundRef.current?.('door-open', 0.45);
          }
          if (animated) play(anim.phase === 'return' ? 'walk' : 'idle', 0.4);
        }
      } else {
        anim.lie = Math.max(0, anim.lie - dt * 3);
        for (const k in props) {
          const mats = props[k as StationId];
          if (mats) mats.forEach((m) => { if (m.emissiveIntensity > 0) m.emissiveIntensity = Math.max(0, m.emissiveIntensity - dt * 3); });
        }
        // Rê chuột: món đồ sáng nhẹ để báo "bấm được"
        const hoverMats = hoverStation ? props[hoverStation] : undefined;
        if (hoverMats) hoverMats.forEach((m) => { m.emissive.setHex(0xfff3c4); m.emissiveIntensity = 0.35; });
        if (anim.phase === 'idle') {
          // Thở nhẹ; năng lượng thấp thì ngồi thụp xuống
          const tired = st.energy < 30;
          if (animated) play(tired ? 'crouch' : 'idle', 0.4);
          else bob = (Math.sin(time * (tired ? 1.6 : 2.4)) * 0.5 + 0.5) * (tired ? 0.012 : 0.02);
          holder.rotation.y += (0.6 - holder.rotation.y) * Math.min(1, dt * 3);
        }
      }
      holder.rotation.x = -anim.lie * (Math.PI / 2);
      // Nằm lên giường: nâng nhân vật lên mặt giường
      const liftGoal = anim.phase === 'act' ? STATION_Y[anim.station] ?? 0 : 0;
      lift += (liftGoal - lift) * Math.min(1, dt * 8);
      holder.position.y = bob + anim.lie * 0.1 + lift;

      // Tinh thần thấp: nhân vật hơi xám
      if (charMats.length) {
        const gloom = st.mental < 35 ? 0.55 : 1;
        charMats.forEach((m) => m.color.setScalar(gloom));
      }

      // Bong bóng biểu cảm trên đầu nhân vật
      const emote = ACTION_EMOTE[anim.actionId];
      let face = '';
      if (!holder.visible) face = '';
      else if (anim.phase === 'act' && emote) face = emote[0];
      else if (time < afterUntil && emote) face = emote[1];
      else if (anim.phase === 'idle') {
        // Đứng yên: thỉnh thoảng lộ tâm trạng theo chỉ số
        const mood =
          st.energy < 30 ? '🥱'
          : st.willpower < 35 ? '😩'
          : st.mental < 35 ? '😔'
          : st.energy >= 70 && st.mental >= 70 && st.willpower >= 70 ? '😄'
          : '';
        if (mood && time % 7 < 2.2 && !coachOn) face = mood;
      }
      placeBubble(bubbleRef.current, holder, CHAR_HEIGHT + 0.22 + lift, face);

      // Chó cưng cũng có cảm xúc: thích được vuốt ve, bực khi bị chọc
      let petFace = '';
      if (anim.station === 'pet') {
        const teased = anim.mood === 'fast';
        if (anim.phase === 'act') petFace = teased ? '😠' : '😍';
        else if (time < afterUntil) petFace = teased ? '😒' : '🐾';
      }
      placeBubble(petBubbleRef.current, petGroup, PET_HEIGHT + 0.2, petFace);
      placeBubble(huskyBubbleRef.current, husky, PET_HEIGHT * 1.15 + 0.2, huskyMood === 'angry' ? '😠 Gâu gâu!' : huskyMood === 'pc' && time % 6 < 2.5 ? '💻' : '');

      // Hướng dẫn lần đầu: vòng tròn nhấp nháy trên bàn học
      const coachEl = coachRef.current;
      if (coachEl) {
        if (coachOn && anim.phase === 'idle') {
          coachAnchor.getWorldPosition(headPos);
          headPos.project(camera);
          const x = ((headPos.x + 1) / 2) * mount.clientWidth;
          const y = ((1 - headPos.y) / 2) * mount.clientHeight;
          coachEl.style.transform = `translate(${x}px, ${y}px)`;
          coachEl.style.opacity = '1';
        } else {
          coachEl.style.opacity = '0';
        }
      }

      renderer.render(scene, camera);
    };
    frame();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      renderer.domElement.removeEventListener('click', onClick);
      apiRef.current = null;
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const mat = mesh.material as THREE.Material | THREE.Material[];
          (Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // Đổi nhân vật
  useEffect(() => {
    pendingRef.current.avatar = avatarId;
    apiRef.current?.setAvatar(avatarId);
  }, [avatarId]);

  // Hành vi mới
  useEffect(() => {
    if (!lastAction) return;
    pendingRef.current.action = lastAction.id;
    apiRef.current?.trigger(lastAction.id);
  }, [lastAction]);

  // Hết ngày: lên giường ngủ (nằm yên đến khi sleeping tắt, sáng hôm sau tự dậy)
  useEffect(() => {
    if (!sleeping) return;
    setPicked(null);
    const t = setTimeout(() => apiRef.current?.trigger('sleep_deep'), 300);
    return () => clearTimeout(t);
  }, [sleeping]);

  if (failed) return null;

  const clockHours = hoursUsed + WAKE_HOUR;
  const hh = Math.floor(clockHours);
  const mm = Math.round((clockHours - hh) * 60);
  const clock = `${String(hh % 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  const pickedActions = picked ? actions.filter((a) => stationOf(a.id) === picked.station) : [];
  // Giữ menu trong khung phòng
  const menuW = 240;
  const menuLeft = picked ? Math.max(8, Math.min(picked.x - menuW / 2, (mountRef.current?.clientWidth ?? menuW) - menuW - 8)) : 0;

  return (
    <div className="space-y-2">
    <div
      className="relative w-full h-[19rem] sm:h-80 lg:h-[32rem] rounded-3xl overflow-hidden border-2 border-white/60 shadow-xl ring-1 ring-black/10 bg-indigo-950 touch-manipulation"
      aria-label="Căn phòng của bạn: bấm vào đồ vật hoặc nhân vật để chọn hành vi"
    >
      <div ref={mountRef} className="absolute inset-0" />
      {/* Viền tối nhẹ + ánh sáng mềm trên cùng cho cảm giác "màn hình game" */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(10,8,40,0.38) 100%), linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 22%)',
        }}
      />
      {/* Biểu cảm nhân vật: vị trí cập nhật mỗi khung hình theo đầu nhân vật */}
      <div
        ref={bubbleRef}
        aria-hidden
        className="absolute left-0 top-0 pointer-events-none select-none px-1.5 py-0.5 rounded-full bg-white/95 shadow-md text-lg sm:text-xl leading-none transition-opacity duration-200 after:content-[''] after:absolute after:left-1/2 after:-bottom-1 after:-translate-x-1/2 after:border-x-4 after:border-t-4 after:border-x-transparent after:border-t-white/95"
        style={{ opacity: 0 }}
      />
      {/* Hướng dẫn lần đầu: vị trí cập nhật mỗi khung hình theo bàn học */}
      <div ref={coachRef} aria-hidden className="absolute left-0 top-0 pointer-events-none transition-opacity duration-300" style={{ opacity: 0 }}>
        <span className="absolute -left-5 -top-5 w-10 h-10 rounded-full border-2 border-amber-300 animate-ping" />
        <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-amber-300/50 border-2 border-amber-200" />
        <span className="absolute left-1/2 -top-14 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-amber-300 text-stone-900 text-[11px] font-bold shadow-md animate-bounce">
          👆 Chạm vào đây để học bài
        </span>
      </div>
      <div
        ref={petBubbleRef}
        aria-hidden
        className="absolute left-0 top-0 pointer-events-none select-none px-1 py-0.5 rounded-full bg-white/95 shadow-md text-base sm:text-lg leading-none transition-opacity duration-200 after:content-[''] after:absolute after:left-1/2 after:-bottom-1 after:-translate-x-1/2 after:border-x-4 after:border-t-4 after:border-x-transparent after:border-t-white/95"
        style={{ opacity: 0 }}
      />
      <div
        ref={huskyBubbleRef}
        aria-hidden
        className="absolute left-0 top-0 pointer-events-none select-none whitespace-nowrap px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-300 shadow-md text-[11px] sm:text-xs font-extrabold text-rose-700 leading-none transition-opacity duration-200"
        style={{ opacity: 0 }}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-indigo-200 animate-pulse">
          Đang dựng căn phòng…
        </div>
      )}
      <span className="absolute top-2.5 left-3 px-2 py-1 rounded-lg bg-black/35 text-white text-xs font-semibold tabular-nums backdrop-blur-xs">
        {sleeping ? '🌙' : clock}
      </span>
      {(stats.willpower < 35 || crashRisk) && (
        <span className="absolute top-10 left-3 max-w-[45%] px-2 py-1 rounded-lg bg-rose-600/85 text-white text-[10px] font-semibold leading-snug animate-pulse pointer-events-none">
          {stats.willpower < 35 ? '⚠️ Ý chí cạn: cám dỗ trông hấp dẫn hơn thật' : '⚠️ Quá nhiều dopamine nhanh: sáng mai dễ sụp'}
        </span>
      )}

      {/* Chỉ số thu gọn trong phòng */}
      <div className="hidden sm:block absolute top-2.5 right-3 w-32 px-2 py-1.5 rounded-lg bg-black/35 backdrop-blur-xs space-y-1 pointer-events-none">
        {ROOM_STATS.map((s) => {
          const v = Math.max(0, Math.min(100, stats[s.key]));
          return (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="text-[10px] w-3.5 text-center">{s.icon}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className={`h-full ${s.bar} ${v < 25 ? 'animate-pulse' : ''} transition-[width] duration-500`} style={{ width: `${v}%` }} />
              </div>
              <span className="text-[10px] text-white tabular-nums w-5 text-right">{Math.round(v)}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[10px] w-3.5 text-center">💰</span>
          <span className={`text-[10px] font-semibold tabular-nums ${stats.money < 0 ? 'text-rose-300' : 'text-white'}`}>{formatMoney(stats.money)}</span>
        </div>
      </div>

      {/* Số bay lên khi chỉ số đổi */}
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 pointer-events-none">
        {deltas.map((d) => (
          <span
            key={d.id}
            className={`animate-float-up absolute whitespace-nowrap text-xs font-bold px-1.5 py-0.5 rounded-md ${d.good ? 'bg-emerald-500/85 text-white' : 'bg-rose-500/85 text-white'}`}
            style={{ left: (d.slot % 3) * 56 - 84, top: Math.floor(d.slot / 3) * 22, animationDelay: `${d.slot * 70}ms`, opacity: 0 }}
          >
            {d.text}
          </span>
        ))}
      </div>

      {/* Thanh 24h: phần ngày đã dùng */}
      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/30 pointer-events-none">
        <div className="h-full bg-gradient-to-r from-amber-300 via-sky-300 to-indigo-400 transition-[width] duration-500" style={{ width: `${Math.min(100, (hoursUsed / 24) * 100)}%` }} />
      </div>

      {interactive && ready && !picked && !coach && !sleeping && (
        <span className="absolute bottom-3.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black/40 text-white text-[11px] backdrop-blur-xs pointer-events-none whitespace-nowrap">
          {hovered ? (
            STATION_LABEL[hovered]
          ) : (
            <>
              <span className="sm:hidden">👆 Chạm đồ vật để hành động</span>
              <span className="hidden sm:inline">👆 Bấm vào đồ vật hoặc nhân vật để hành động</span>
            </>
          )}
        </span>
      )}
      {picked && (
        <div
          className="absolute z-10 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg border border-stone-200 p-2 max-h-[85%] overflow-y-auto"
          style={{ width: menuW, left: menuLeft, top: 8 }}
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
            <span className="text-xs font-bold text-stone-900">{STATION_LABEL[picked.station]}</span>
            <button onClick={() => setPicked(null)} className="text-stone-400 hover:text-stone-800 text-sm px-2 py-1 -my-1" aria-label="Đóng">
              ✕
            </button>
          </div>
          {coach && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mb-1.5 leading-snug">
              Mỗi hành vi tốn vài giờ trong 24h và làm thay đổi chỉ số. Chọn một hành vi để bắt đầu!
            </p>
          )}
          {pickedActions.length === 0 && <p className="text-xs text-stone-500 px-1 py-2">Chưa có hành vi nào ở đây.</p>}
          {pickedActions.map((a) => {
            const locked = lockReasons[a.id];
            const tooLong = a.hours > hoursRemaining || !!locked;
            const tone =
              a.dopaminePathway === 'fast' ? 'border-l-pink-400' : a.category === 'work' ? 'border-l-amber-400' : a.category === 'rest' ? 'border-l-sky-400' : 'border-l-emerald-400';
            return (
              <button
                key={a.id}
                disabled={tooLong}
                title={a.description}
                onClick={() => {
                  onSelectAction?.(a.id);
                  setPicked(null);
                }}
                className={`w-full text-left px-2 py-2.5 sm:py-1.5 mb-1 rounded-lg border-l-4 ${tone} bg-stone-50 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between gap-2`}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-stone-800 leading-snug">{a.title}</span>
                  {locked && <span className="block text-[10px] mt-0.5 text-stone-500">🔒 {locked}</span>}
                  {!locked && habitTags[a.id] && (
                    <span className={`block text-[10px] mt-0.5 ${habitTags[a.id].startsWith('⚠️') ? 'text-amber-700' : 'text-emerald-700'}`}>{habitTags[a.id]}</span>
                  )}
                  {a.category === 'rest' && (() => {
                    const tip = SLEEP_TIP[sleepAdviceNow(a.id, hoursUsed).timing];
                    return tip ? <span className={`block text-[10px] mt-0.5 ${tip.tone}`}>{tip.text}</span> : null;
                  })()}
                </span>
                <span className="text-[11px] font-semibold text-stone-500 tabular-nums shrink-0">{a.hours}h</span>
              </button>
            );
          })}
        </div>
      )}
    </div>

    {/* Điện thoại: chỉ số nằm dưới phòng để không che đồ vật */}
    <div className="sm:hidden grid grid-cols-6 gap-1 px-2 py-1.5 rounded-xl bg-stone-900/90 text-white">
      {ROOM_STATS.map((s) => {
        const v = Math.max(0, Math.min(100, stats[s.key]));
        return (
          <div key={s.key} className="flex flex-col items-center gap-0.5 min-w-0">
            <span className="text-[11px] leading-none">
              {s.icon} <span className="tabular-nums font-semibold">{Math.round(v)}</span>
            </span>
            <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
              <div className={`h-full ${s.bar} ${v < 25 ? 'animate-pulse' : ''} transition-[width] duration-500`} style={{ width: `${v}%` }} />
            </div>
          </div>
        );
      })}
      <div className="flex flex-col items-center justify-center min-w-0">
        <span className={`text-[11px] leading-none font-semibold tabular-nums ${stats.money < 0 ? 'text-rose-300' : ''}`}>💰{formatMoney(stats.money)}</span>
      </div>
    </div>
    </div>
  );
};

export default RoomScene;
