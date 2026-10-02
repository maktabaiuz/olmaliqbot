import * as THREE from 'three';
import { BAY_W, FLOOR_H, DOM_STYLES, HOUSE_STYLES, domFacade, houseFacade, plainFacade } from './facades';

/**
 * OSM bino konturlaridan haqiqiy 3D geometriya (2026-10).
 * Koordinatalar: mahalliy metr — x = sharq, y = yuqori, z = janub
 * (ORIGIN atrofida). Bir xil materialli hamma narsa bitta BufferGeometry'ga
 * birlashtiriladi — 1 900+ bino bir necha "draw call"da chiziladi.
 */
export const ORIGIN = { lng: 69.5986, lat: 40.8447 };
const M_LAT = 111320;
const M_LNG = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);
export const toLocal = (lng: number, lat: number): [number, number] => [(lng - ORIGIN.lng) * M_LNG, -(lat - ORIGIN.lat) * M_LAT];

type Ring = [number, number][]; // [x, z]

class Batch {
  pos: number[] = [];
  uv: number[] = [];
  nor: number[] = [];
  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, ua: number[], ub: number[], uc: number[]) {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const [p, u] of [[a, ua], [b, ub], [c, uc]] as [THREE.Vector3, number[]][]) {
      this.pos.push(p.x, p.y, p.z);
      this.uv.push(u[0], u[1]);
      this.nor.push(n.x, n.y, n.z);
    }
  }
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u0: number, u1: number, v0: number, v1: number) {
    this.tri(a, b, c, [u0, v0], [u1, v0], [u1, v1]);
    this.tri(a, c, d, [u0, v0], [u1, v1], [u0, v1]);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    return g;
  }
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function signedArea(r: Ring) {
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return a / 2;
}

/** Devorlar: tashqariga qaragan, UV metrda (deraza oralig'i × qavat). */
function walls(b: Batch, ring: Ring, h0: number, h1: number, bayW: number, floorH: number) {
  const r = signedArea(ring) > 0 ? ring : [...ring].reverse();
  let u = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const [x1, z1] = r[i];
    const [x2, z2] = r[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.2) continue;
    // Har devorda butun sondagi deraza bo'lsin
    const bays = Math.max(1, Math.round(len / bayW));
    b.quad(V(x2, h0, z2), V(x1, h0, z1), V(x1, h1, z1), V(x2, h1, z2), u + bays, u, h0 / floorH, h1 / floorH);
    u += bays;
  }
}

/** Tekis tom (botiq konturlar ham to'g'ri — ShapeUtils triangulyatsiyasi). */
function flatRoof(b: Batch, ring: Ring, y: number) {
  const pts = ring.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, z));
  if (pts.length < 3) return;
  const tris = THREE.ShapeUtils.triangulateShape(pts, []);
  for (const [i, j, k] of tris) {
    const a = V(pts[i].x, y, pts[i].y);
    const c = V(pts[j].x, y, pts[j].y);
    const d = V(pts[k].x, y, pts[k].y);
    // yuqoriga qaragan normal bo'lishi uchun tartibni tekshiramiz
    const n = new THREE.Vector3().subVectors(c, a).cross(new THREE.Vector3().subVectors(d, a));
    if (n.y >= 0) b.tri(a, c, d, [a.x / 4, a.z / 4], [c.x / 4, c.z / 4], [d.x / 4, d.z / 4]);
    else b.tri(a, d, c, [a.x / 4, a.z / 4], [d.x / 4, d.z / 4], [c.x / 4, c.z / 4]);
  }
}

/** Qiya (ikki nishabli) tom — eng uzun devor yo'nalishidagi yo'naltirilgan to'rtburchak ustida. */
function gableRoof(roof: Batch, gable: Batch, ring: Ring, y: number) {
  let best = 0;
  let ang = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const dx = ring[i + 1][0] - ring[i][0];
    const dz = ring[i + 1][1] - ring[i][1];
    const l = Math.hypot(dx, dz);
    if (l > best) {
      best = l;
      ang = Math.atan2(dz, dx);
    }
  }
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [x, z] of ring) {
    const u = x * ca + z * sa;
    const v = -x * sa + z * ca;
    minU = Math.min(minU, u); maxU = Math.max(maxU, u);
    minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  }
  const o = 0.45; // tom chiqib turishi
  minU -= o; maxU += o; minV -= o; maxV += o;
  const w = maxV - minV;
  const rise = Math.min(3.2, Math.max(1.4, w * 0.32));
  const midV = (minV + maxV) / 2;
  const P = (u: number, v: number, yy: number) => V(u * ca - v * sa, yy, u * sa + v * ca);
  const a = P(minU, minV, y), b = P(maxU, minV, y), c = P(maxU, midV, y + rise), d = P(minU, midV, y + rise);
  const e = P(minU, maxV, y), f = P(maxU, maxV, y);
  const L = (maxU - minU) / 2;
  roof.quad(a, b, c, d, 0, L, 0, 1.6);
  roof.quad(f, e, d, c, 0, L, 0, 1.6);
  // uchburchak peshtoqlar
  gable.tri(e, a, d, [0, 0], [w / BAY_W, 0], [w / BAY_W / 2, rise / FLOOR_H]);
  gable.tri(b, f, c, [0, 0], [w / BAY_W, 0], [w / BAY_W / 2, rise / FLOOR_H]);
}

function centroid(r: Ring): [number, number] {
  let x = 0, z = 0;
  const n = r.length - 1;
  for (let i = 0; i < n; i++) { x += r[i][0]; z += r[i][1]; }
  return [x / n, z / n];
}

export interface BuildingFeature {
  k: string;
  h: number;
  v: number;
  ring: Ring;
}

const ROOF_COLORS: Record<string, string[]> = {
  house: ['#b8452f', '#8f3b2c', '#4f8a5a', '#3f73a3', '#9a6b4a'],
  dom: ['#8f949c', '#a08f83', '#7f8b96'],
  tower: ['#727a86'],
  mosque: ['#eae3cf'],
  school: ['#d9a128'],
  health: ['#dfe7ee'],
  shop: ['#d3d8de'],
  industry: ['#8d939c'],
  civic: ['#b9ad94'],
  bld: ['#a8573f', '#8a6a52'],
};

/** Barcha binolarni bir necha mesh'ga yig'adi. */
export function buildCity(buildings: BuildingFeature[]): THREE.Group {
  const group = new THREE.Group();
  const wallBatches = new Map<string, { batch: Batch; tex: THREE.Texture }>();
  const roofBatches = new Map<string, Batch>();
  const getWall = (key: string, make: () => THREE.Texture) => {
    let w = wallBatches.get(key);
    if (!w) {
      w = { batch: new Batch(), tex: make() };
      wallBatches.set(key, w);
    }
    return w.batch;
  };
  const getRoof = (color: string) => {
    let r = roofBatches.get(color);
    if (!r) {
      r = new Batch();
      roofBatches.set(color, r);
    }
    return r;
  };
  const domes = new Batch();
  const minarets: THREE.Vector3[] = [];

  for (const bf of buildings) {
    const { k, h, v, ring } = bf;
    let wb: Batch;
    let bayW = BAY_W;
    let floorH = FLOOR_H;
    if (k === 'dom' || k === 'tower') {
      const st = k === 'tower' ? (v + 7) % 10 : v;
      wb = getWall(`dom-${st}`, () => domFacade(DOM_STYLES[st]));
    } else if (k === 'house' || k === 'bld') {
      const st = v % 4;
      wb = getWall(`house-${st}`, () => houseFacade(HOUSE_STYLES[st], st === 1 || st === 2));
      bayW = 4.2;
      floorH = h;
    } else if (k === 'shop') wb = getWall('glass', () => plainFacade('#dfe6ee', '#7fa7c8', 'glass'));
    else if (k === 'school') wb = getWall('school', () => plainFacade('#f7dc8f', '#6c8fb6', 'school'));
    else if (k === 'health') wb = getWall('health', () => plainFacade('#f7f9fb', '#7fa6c9', 'health'));
    else if (k === 'industry') wb = getWall('industry', () => plainFacade('#c6c9ce', '#8fa2b5', 'industry'));
    else wb = getWall('civic', () => plainFacade('#efe7d6', '#6d8db0', 'civic'));
    walls(wb, ring, 0, h, bayW, floorH);

    const roofs = ROOF_COLORS[k] || ROOF_COLORS.bld;
    const roofColor = roofs[v % roofs.length];
    const isHouse = k === 'house' || (k === 'bld' && h <= 7);
    if (isHouse) {
      const gb = getWall(k === 'bld' ? `house-${v % 4}` : `house-${v % 4}`, () => houseFacade(HOUSE_STYLES[v % 4], v % 4 === 1 || v % 4 === 2));
      gableRoof(getRoof(roofColor), gb, ring, h);
    } else {
      flatRoof(getRoof(roofColor), ring, h);
      // parapet — tom chetida past devor
      walls(getRoof('#7d828a'), ring, h, h + 0.7, 50, 1);
    }

    if (k === 'mosque') {
      const [cx, cz] = centroid(ring);
      let rad = 0;
      for (const [x, z] of ring) rad = Math.max(rad, Math.hypot(x - cx, z - cz));
      const r = Math.min(9, Math.max(3.5, rad * 0.42));
      const sph = new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      sph.translate(cx, h + 0.7, cz);
      const p = sph.getAttribute('position');
      const n = sph.getAttribute('normal');
      const idx = sph.getIndex()!;
      for (let i = 0; i < idx.count; i += 3) {
        const tri = [0, 1, 2].map((o) => idx.getX(i + o));
        const [a, bb, c] = tri.map((t) => V(p.getX(t), p.getY(t), p.getZ(t)));
        domes.tri(a, bb, c, [0, 0], [1, 0], [0, 1]);
        void n;
      }
      minarets.push(V(ring[0][0] + (cx - ring[0][0]) * 0.12, h, ring[0][1] + (cz - ring[0][1]) * 0.12));
    }
  }

  for (const { batch, tex } of wallBatches.values()) {
    group.add(new THREE.Mesh(batch.build(), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide })));
  }
  for (const [color, batch] of roofBatches) {
    group.add(new THREE.Mesh(batch.build(), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })));
  }
  if (domes.pos.length) {
    group.add(new THREE.Mesh(domes.build(), new THREE.MeshLambertMaterial({ color: '#2a9d8f', side: THREE.DoubleSide })));
    for (const m of minarets) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 26, 12), new THREE.MeshLambertMaterial({ color: '#efe1c2' }));
      shaft.position.set(m.x, 13, m.z);
      const balcony = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.8, 12), new THREE.MeshLambertMaterial({ color: '#2a9d8f' }));
      balcony.position.set(m.x, 21, m.z);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.5, 12), new THREE.MeshLambertMaterial({ color: '#2a9d8f' }));
      cap.position.set(m.x, 27.7, m.z);
      group.add(shaft, balcony, cap);
    }
  }
  return group;
}
