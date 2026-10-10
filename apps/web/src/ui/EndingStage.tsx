import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EndingPrimitive } from '@24h/domain';
import { AvatarId } from '../lib/avatars';
import { StationId } from '../lib/roomStations';

/** Món đồ đặt cạnh nhân vật: gắn với hành vi người chơi làm nhiều nhất */
const STATION_PROP: Partial<Record<StationId, { url: string; scale: number; height?: number }>> = {
  arcade: { url: '/models/arcade/arcade-machine.glb', scale: 1 },
  vending: { url: '/models/arcade/vending-machine.glb', scale: 1 },
  claw: { url: '/models/arcade/claw-machine.glb', scale: 1 },
  dance: { url: '/models/arcade/dance-machine.glb', scale: 1 },
  basketball: { url: '/models/arcade/basketball-game.glb', scale: 1 },
  register: { url: '/models/arcade/cash-register.glb', scale: 1 },
  bed: { url: '/models/furniture/bedSingle.glb', scale: 0.75 },
  desk: { url: '/models/furniture/desk.glb', scale: 0.75 },
  kitchen: { url: '/models/furniture/kitchenStove.glb', scale: 0.75 },
  sofa: { url: '/models/furniture/loungeSofa.glb', scale: 0.75 },
  music: { url: '/models/furniture/speaker.glb', scale: 0.75 },
  trash: { url: '/models/furniture/trashcan.glb', scale: 0.75 },
  outside: { url: '/models/furniture/coatRackStanding.glb', scale: 0.75 },
  pet: { url: '/models/pets/animal-dog.glb', scale: 1, height: 0.3 },
};

/** Dáng nhân vật theo kết cục (hoạt hình có sẵn trong mô hình Kenney) */
function endingClip(ending: EndingPrimitive): { name: string; once: boolean } {
  if (ending.outcome === 'burnout') return { name: 'die', once: true }; // gục xuống
  if (ending.outcome === 'bankrupt') return { name: 'emote-no', once: false }; // lắc đầu
  return ending.score >= 70 ? { name: 'jump', once: false } : { name: 'emote-yes', once: false };
}

export interface EndingStageHandle {
  /** Ảnh PNG (data URL) của sân khấu hiện tại, dùng cho ảnh chia sẻ */
  snapshot: () => string | null;
}

interface EndingStageProps {
  ending: EndingPrimitive;
  avatarId: AvatarId;
  /** Món đồ của hành vi làm nhiều nhất (không có thì chỉ có nhân vật) */
  station: StationId | null;
  /** Không dựng được 3D (máy không hỗ trợ WebGL hoặc lỗi tải): cho phép quay về ảnh PNG */
  onFailed?: () => void;
}

const CHAR_HEIGHT = 0.62;

const EndingStage = forwardRef<EndingStageHandle, EndingStageProps>(({ ending, avatarId, station, onFailed }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const renderNowRef = useRef<() => void>(() => {});
  const [failed, setFailedState] = useState(false);
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;
  const setFailed = (v: boolean) => {
    setFailedState(v);
    if (v) onFailedRef.current?.();
  };

  useImperativeHandle(ref, () => ({
    snapshot: () => {
      const r = rendererRef.current;
      if (!r) return null;
      renderNowRef.current();
      try {
        return r.domElement.toDataURL('image/png');
      } catch {
        return null;
      }
    },
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      // Nền trong suốt để thấy gradient của thẻ kết cục; giữ buffer để chụp ảnh chia sẻ
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      setFailed(true);
      return;
    }
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
    camera.position.set(1.15, 1.0, 2.6);
    camera.lookAt(0.1, 0.32, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8888aa, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2, 3, 2.5);
    scene.add(key);

    // Bóng mềm dưới chân
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 40),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0.1, 0.001, 0);
    scene.add(shadow);

    const loader = new GLTFLoader();
    let mixer: THREE.AnimationMixer | null = null;
    const extraMixers: THREE.AnimationMixer[] = [];
    let disposed = false;

    // Nhân vật
    loader
      .loadAsync(`/models/characters/${avatarId}.glb`)
      .then((gltf) => {
        if (disposed) return;
        const obj = gltf.scene;
        const box = new THREE.Box3().setFromObject(obj);
        const s = CHAR_HEIGHT / (box.max.y - box.min.y || 1);
        obj.scale.setScalar(s);
        obj.position.set(-0.12, -box.min.y * s, 0.1);
        obj.rotation.y = 0.35;
        scene.add(obj);
        mixer = new THREE.AnimationMixer(obj);
        const { name, once } = endingClip(ending);
        const clip = gltf.animations.find((c) => c.name === name) ?? gltf.animations.find((c) => c.name === 'idle');
        if (clip) {
          const action = mixer.clipAction(clip);
          if (once) {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          action.play();
        }
      })
      .catch(() => setFailed(true));

    // Món đồ đặc trưng
    const prop = station ? STATION_PROP[station] : undefined;
    if (prop) {
      loader
        .loadAsync(prop.url)
        .then((gltf) => {
          if (disposed) return;
          const inner = gltf.scene;
          const box = new THREE.Box3().setFromObject(inner);
          const c = box.getCenter(new THREE.Vector3());
          const s = prop.height ? prop.height / (box.max.y - box.min.y || 1) : prop.scale;
          inner.scale.setScalar(s);
          inner.position.set(-c.x * s, -box.min.y * s, -c.z * s);
          const g = new THREE.Group();
          g.add(inner);
          g.position.set(0.42, 0, -0.25);
          g.rotation.y = -0.5;
          scene.add(g);
          if (gltf.animations.length) {
            // Chú chó: dùng hoạt hình riêng
            const petMixer = new THREE.AnimationMixer(inner);
            const idle = gltf.animations.find((a) => a.name === (ending.outcome === 'survived' ? 'gesture-positive' : 'idle'));
            if (idle) petMixer.clipAction(idle).play();
            extraMixers.push(petMixer);
          }
        })
        .catch(() => {
          // không có món đồ cũng không sao
        });
    }
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    const clock = new THREE.Clock();
    let raf = 0;
    renderNowRef.current = () => renderer.render(scene, camera);
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      mixer?.update(dt);
      extraMixers.forEach((m) => m.update(dt));
      renderer.render(scene, camera);
    };
    frame();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
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
      rendererRef.current = null;
    };
  }, [ending, avatarId, station]);

  if (failed) return null;
  return <div ref={mountRef} className="w-full h-full" aria-hidden />;
});

EndingStage.displayName = 'EndingStage';
export default EndingStage;
