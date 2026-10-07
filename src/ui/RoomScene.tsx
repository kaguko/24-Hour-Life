import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PlayerStatsPrimitive } from '../domain';
import { AvatarId } from '../lib/avatars';
import {
  ACTION_VISUALS,
  DEFAULT_VISUAL,
  MOOD_GLOW,
  SKY_KEYS,
  STATION_FACING,
  STATION_POS,
  StationId,
  ActionMood,
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
}

interface SceneApi {
  setAvatar: (id: AvatarId) => void;
  trigger: (actionId: string) => void;
}

const CHAR_HEIGHT = 0.62;
const HOME: [number, number] = STATION_POS.center;
const WALK_SPEED = 2.8;
/** Giờ thức dậy trong cảnh 3D: ngày bắt đầu lúc 07:00 */
const WAKE_HOUR = 7;

function skyColor(hour: number): THREE.Color {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const [h0, c0] = SKY_KEYS[i];
    const [h1, c1] = SKY_KEYS[i + 1];
    if (h >= h0 && h <= h1) {
      const t = (h - h0) / (h1 - h0 || 1);
      return new THREE.Color(c0).lerp(new THREE.Color(c1), t);
    }
  }
  return new THREE.Color(SKY_KEYS[0][1]);
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

const RoomScene: React.FC<RoomSceneProps> = ({ avatarId, stats, hoursUsed, lastAction }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const liveRef = useRef({ stats, hoursUsed });
  const pendingRef = useRef<{ avatar: AvatarId; action: string | null }>({ avatar: avatarId, action: null });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  liveRef.current = { stats, hoursUsed };

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
    const cache = new Map<string, THREE.Group>();
    const getModel = async (url: string) => {
      let g = cache.get(url);
      if (!g) {
        const gltf = await loader.loadAsync(url);
        g = gltf.scene;
        cache.set(url, g);
      }
      return g.clone(true);
    };

    const props: Partial<Record<StationId, THREE.MeshStandardMaterial[]>> = {};
    const addProp = async (name: string, x: number, z: number, rotY: number, station?: StationId) => {
      const obj = await getModel(`/models/arcade/${name}.glb`);
      obj.position.set(x, 0, z);
      obj.rotation.y = rotY;
      const mats = uniqueMaterials(obj);
      if (station) props[station] = [...(props[station] ?? []), ...mats];
      room.add(obj);
    };

    // Nhân vật
    const holder = new THREE.Group();
    holder.position.set(HOME[0], 0, HOME[1]);
    room.add(holder);
    let charModel: THREE.Object3D | null = null;
    let charMats: THREE.MeshStandardMaterial[] = [];

    const loadAvatar = async (id: AvatarId) => {
      const obj = await getModel(`/models/characters/${id}.glb`);
      const box = new THREE.Box3().setFromObject(obj);
      const h = box.max.y - box.min.y || 1;
      const s = CHAR_HEIGHT / h;
      obj.scale.setScalar(s);
      obj.position.y = -box.min.y * s;
      if (charModel) holder.remove(charModel);
      charModel = obj;
      charMats = uniqueMaterials(obj);
      holder.add(obj);
    };

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
    };

    const trigger = (actionId: string) => {
      const v = ACTION_VISUALS[actionId] ?? DEFAULT_VISUAL;
      anim.station = v.station;
      anim.mood = v.mood;
      anim.t = 0;
      anim.actDur = v.mood === 'sleep' ? 1.8 : v.mood === 'work' ? 1.3 : 1.0;
      anim.phase = 'walk';
      anim.glow = 1;
    };

    apiRef.current = { setAvatar: (id) => void loadAvatar(id), trigger };

    // Tải toàn bộ cảnh
    let disposed = false;
    (async () => {
      try {
        const floors: Promise<void>[] = [];
        for (let ix = 0; ix < 5; ix++) {
          for (let iz = 0; iz < 4; iz++) {
            floors.push(addProp('floor', -2 + ix, -1.5 + iz, 0));
          }
        }
        await Promise.all(floors);
        // Tường sau và tường trái
        for (let ix = 0; ix < 5; ix++) {
          await addProp(ix === 3 ? 'wall-window' : 'wall', -2 + ix, -2.3, 0);
        }
        for (let iz = 0; iz < 4; iz++) {
          await addProp(iz === 1 ? 'wall-window' : 'wall', -2.8, -1.5 + iz, Math.PI / 2);
        }
        await addProp('wall-corner', -2.8, -2.3, 0);
        // Đồ trong phòng
        await Promise.all([
          addProp('arcade-machine', -1.75, -1.65, 0, 'arcade'),
          addProp('arcade-machine', -1.15, -1.65, 0, 'arcade'),
          addProp('claw-machine', -0.35, -1.62, 0, 'claw'),
          addProp('vending-machine', 0.55, -1.7, 0, 'vending'),
          addProp('cash-register', 1.5, -1.7, 0, 'register'),
          addProp('dance-machine', 2.0, 0.15, -Math.PI / 2, 'dance'),
          addProp('pinball', -2.0, 0.2, Math.PI / 2, 'pinball'),
          addProp('basketball-game', -2.0, 1.2, Math.PI / 2, 'basketball'),
          addProp('column', 2.35, 1.7, 0),
        ]);
        await loadAvatar(pendingRef.current.avatar);
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
      const halfH = Math.max(2.35, 3.5 / aspect);
      const halfW = halfH * aspect;
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // Vòng lặp
    const clock = new THREE.Clock();
    let raf = 0;
    const tmpColor = new THREE.Color();

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const { stats: st, hoursUsed: used } = liveRef.current;
      const hrs = used + WAKE_HOUR;

      // Ánh sáng theo giờ & chỉ số
      const sky = skyColor(hrs);
      scene.background = sky;
      const daylight = Math.max(0, Math.sin(((hrs - 6) / 12) * Math.PI));
      hemi.intensity = 0.5 + 0.55 * daylight;
      sun.intensity = 0.35 + 1.25 * daylight;
      sun.color.copy(tmpColor.set(0xffffff).lerp(sky, 0.35));
      renderer.toneMappingExposure = 0.62 + 0.5 * (st.energy / 100);

      // Dopamine cao: cả phòng nháy hồng
      const dopa = st.dopamine > 75 ? 0.6 + 0.4 * Math.sin(time * 6) : 0;
      glowLight.color.set(0xff2d95);
      glowLight.position.set(-1.2, 0.9, -1.0);
      glowLight.intensity = dopa * 2.2 + anim.glow * 1.6;
      if (anim.glow > 0 && anim.phase !== 'act') anim.glow = Math.max(0, anim.glow - dt * 1.5);

      room.rotation.y = Math.sin(time * 0.35) * 0.025;

      // Hoạt hình nhân vật
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
          bob = Math.abs(Math.sin(time * 14)) * 0.07;
        } else if (anim.phase === 'walk') {
          anim.phase = 'act';
          anim.t = 0;
        } else {
          anim.phase = 'idle';
        }
      }
      if (anim.phase === 'act') {
        anim.t += dt;
        const face = STATION_FACING[anim.station];
        holder.rotation.y += (face - holder.rotation.y) * Math.min(1, dt * 10);
        if (anim.mood === 'sleep') {
          anim.lie = Math.min(1, anim.lie + dt * 3);
        } else if (anim.mood === 'work') {
          bob = Math.abs(Math.sin(time * 9)) * 0.03;
        } else {
          bob = Math.abs(Math.sin(time * 11)) * 0.1;
        }
        // Món đồ phát sáng
        const pulse = 0.55 + 0.45 * Math.sin(time * 12);
        const mats = props[anim.station];
        if (mats) mats.forEach((m) => { m.emissive.setHex(MOOD_GLOW[anim.mood]); m.emissiveIntensity = pulse * 0.9; });
        if (anim.mood !== 'sleep') anim.glow = Math.max(anim.glow, 0.5);
        if (anim.t >= anim.actDur) {
          if (mats) mats.forEach((m) => { m.emissiveIntensity = 0; });
          anim.phase = anim.station === 'center' ? 'idle' : 'return';
        }
      } else {
        anim.lie = Math.max(0, anim.lie - dt * 3);
        for (const k in props) {
          const mats = props[k as StationId];
          if (mats) mats.forEach((m) => { if (m.emissiveIntensity > 0) m.emissiveIntensity = Math.max(0, m.emissiveIntensity - dt * 3); });
        }
        if (anim.phase === 'idle') {
          // Thở nhẹ, hơi nhún khi năng lượng thấp
          const tired = st.energy < 30;
          bob = (Math.sin(time * (tired ? 1.6 : 2.4)) * 0.5 + 0.5) * (tired ? 0.012 : 0.02);
          holder.rotation.y += (0.6 - holder.rotation.y) * Math.min(1, dt * 3);
        }
      }
      holder.rotation.x = -anim.lie * (Math.PI / 2);
      holder.position.y = bob + anim.lie * 0.1;

      // Tinh thần thấp: nhân vật hơi xám
      if (charMats.length) {
        const gloom = st.mental < 35 ? 0.55 : 1;
        charMats.forEach((m) => m.color.setScalar(gloom));
      }

      renderer.render(scene, camera);
    };
    frame();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
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

  if (failed) return null;

  const clockHours = hoursUsed + WAKE_HOUR;
  const hh = Math.floor(clockHours);
  const mm = Math.round((clockHours - hh) * 60);
  const clock = `${String(hh % 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  return (
    <div
      className="relative w-full h-36 sm:h-52 lg:h-72 rounded-2xl overflow-hidden border border-stone-200 shadow-xs bg-indigo-950"
      role="img"
      aria-label="Căn phòng của bạn: nhân vật di chuyển theo hành vi bạn chọn"
    >
      <div ref={mountRef} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-indigo-200 animate-pulse">
          Đang dựng căn phòng…
        </div>
      )}
      <span className="absolute top-2.5 left-3 px-2 py-1 rounded-lg bg-black/35 text-white text-xs font-semibold tabular-nums backdrop-blur-xs">
        {clock}
      </span>
    </div>
  );
};

export default RoomScene;
