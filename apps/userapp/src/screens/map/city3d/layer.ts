import * as THREE from 'three';
import maplibregl, { type CustomLayerInterface, type Map as MlMap } from 'maplibre-gl';
import { ORIGIN, buildCity, toLocal, type BuildingFeature } from './geometry';
import { Traffic, buildLamps, buildParked, buildTrees, buildYards, buildZebras } from './props';

/**
 * MapLibre ichidagi Three.js qatlami — haqiqiy 3D shahar (binolar, qiya
 * tomlar, masjid gumbazi, daraxtlar, chiroqlar, harakatlanuvchi mashinalar).
 * Sahna mahalliy metrda quriladi va xarita kamerasi bilan bir xil matritsada
 * chiziladi — shuning uchun hammasi aniq koordinatasida turadi.
 */
const BUILDING_KINDS = new Set(['house', 'dom', 'tower', 'mosque', 'school', 'health', 'shop', 'civic', 'industry', 'bld']);

export function createCityLayer(features: any[]): CustomLayerInterface & { dispose(): void } {
  let renderer: THREE.WebGLRenderer | null = null;
  let map: MlMap | null = null;
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  let traffic: Traffic | null = null;
  let last = performance.now();

  // Yorug'lik: osmon/yer + iliq quyosh
  scene.add(new THREE.HemisphereLight('#f4f8ff', '#b7c99a', 1.25));
  const sun = new THREE.DirectionalLight('#fff1d6', 1.7);
  const SUN_DIR = new THREE.Vector3(-0.55, 1, 0.5).normalize();
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  // Yer — faqat soyani ko'rsatadigan shaffof tekislik (MapLibre yeri ustida)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: '#2b3a24', opacity: 0.32 }));
  ground.position.y = 0.04;
  ground.receiveShadow = true;
  scene.add(ground);

  const buildings: BuildingFeature[] = [];
  const trees: { lng: number; lat: number; t: number; s: number }[] = [];
  const roads: { k: string; path: [number, number][] }[] = [];
  const yards: { lng: number; lat: number; t: string; r: number }[] = [];
  for (const f of features) {
    const p = f.properties;
    if (f.geometry.type === 'Polygon' && BUILDING_KINDS.has(p.k)) {
      buildings.push({ k: p.k, h: p.h, v: p.v ?? 0, ring: f.geometry.coordinates[0].map(([lng, lat]: [number, number]) => toLocal(lng, lat)) });
    } else if (p.k === 'tree') {
      const [lng, lat] = f.geometry.coordinates;
      trees.push({ lng, lat, t: p.t, s: p.s });
    } else if (p.k === 'yard') {
      const [lng, lat] = f.geometry.coordinates;
      yards.push({ lng, lat, t: p.t, r: p.r });
    } else if (f.geometry.type === 'LineString' && ['road1', 'road2', 'street'].includes(p.k)) {
      roads.push({ k: p.k, path: f.geometry.coordinates });
    }
  }

  scene.add(buildCity(buildings));
  scene.add(buildTrees(trees));
  scene.add(buildLamps(roads));
  scene.add(buildParked(roads));
  scene.add(buildZebras(roads));
  scene.add(buildYards(yards));
  traffic = new Traffic(roads);
  scene.add(traffic.group);
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== ground) {
      o.castShadow = !o.userData.noShadow;
      o.receiveShadow = true;
    }
  });

  const mc = maplibregl.MercatorCoordinate.fromLngLat([ORIGIN.lng, ORIGIN.lat], 0);
  const s = mc.meterInMercatorCoordinateUnits();
  // mahalliy (x sharq, y yuqori, z janub) metr → Merkator. rotX(90°) va
  // scale(s,-s,s) dan keyin: X=sharq, Y(Merkator, janubga o'sadi)=z, balandlik=y.
  const local = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

  return {
    id: 'city3d',
    type: 'custom',
    renderingMode: '3d',
    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl as WebGLRenderingContext, antialias: true });
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    },
    render(_gl, matrix) {
      if (!renderer || !map) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const animate = map.getZoom() >= 14.5 && !document.hidden;
      if (animate) traffic?.update(dt);
      // Soya kamerasi ko'rinib turgan joyga ergashadi (yaqinda keskin soyalar)
      const c = map.getCenter();
      const [cx, cz] = toLocal(c.lng, c.lat);
      const half = Math.min(700, Math.max(140, 260 * Math.pow(2, 16 - map.getZoom())));
      sun.target.position.set(cx, 0, cz);
      sun.position.set(cx + SUN_DIR.x * 800, SUN_DIR.y * 800, cz + SUN_DIR.z * 800);
      const sc = sun.shadow.camera;
      sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 10; sc.far = 2000;
      sc.updateProjectionMatrix();
      sun.target.updateMatrixWorld();
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix as unknown as number[]).multiply(local);
      renderer.resetState();
      renderer.render(scene, camera);
      if (animate) map.triggerRepaint();
    },
    dispose() {
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((mm) => {
          (mm as THREE.MeshLambertMaterial).map?.dispose();
          mm.dispose();
        });
      });
    },
  };
}
