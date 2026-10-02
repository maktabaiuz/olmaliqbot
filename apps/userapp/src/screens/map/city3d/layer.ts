import * as THREE from 'three';
import maplibregl, { type CustomLayerInterface, type Map as MlMap } from 'maplibre-gl';
import { ORIGIN, buildCity, toLocal, type BuildingFeature } from './geometry';
import { Traffic, buildLamps, buildTrees } from './props';

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
  const sun = new THREE.DirectionalLight('#fff1d6', 1.6);
  sun.position.set(-0.6, 1, 0.45);
  scene.add(sun);

  const buildings: BuildingFeature[] = [];
  const trees: { lng: number; lat: number; t: number; s: number }[] = [];
  const roads: { k: string; path: [number, number][] }[] = [];
  for (const f of features) {
    const p = f.properties;
    if (f.geometry.type === 'Polygon' && BUILDING_KINDS.has(p.k)) {
      buildings.push({ k: p.k, h: p.h, v: p.v ?? 0, ring: f.geometry.coordinates[0].map(([lng, lat]: [number, number]) => toLocal(lng, lat)) });
    } else if (p.k === 'tree') {
      const [lng, lat] = f.geometry.coordinates;
      trees.push({ lng, lat, t: p.t, s: p.s });
    } else if (f.geometry.type === 'LineString' && ['road1', 'road2', 'street'].includes(p.k)) {
      roads.push({ k: p.k, path: f.geometry.coordinates });
    }
  }

  scene.add(buildCity(buildings));
  scene.add(buildTrees(trees));
  scene.add(buildLamps(roads));
  traffic = new Traffic(roads);
  scene.add(traffic.group);

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
    },
    render(_gl, matrix) {
      if (!renderer || !map) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const animate = map.getZoom() >= 14.5 && !document.hidden;
      if (animate) traffic?.update(dt);
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
