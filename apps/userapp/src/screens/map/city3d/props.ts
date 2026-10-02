import * as THREE from 'three';
import { toLocal } from './geometry';

/**
 * Shahar jihozlari — daraxtlar, ko'cha chiroqlari, mashinalar.
 * Hammasi InstancedMesh: minglab nusxa bitta "draw call" bilan chiziladi.
 * Daraxtlar harakatsiz (egasining talabi bilan).
 */
const lambert = (color: string) => new THREE.MeshLambertMaterial({ color });

interface TreeInput {
  lng: number;
  lat: number;
  t: number; // 0 yumaloq, 1 terak, 2 archa, 3 mevali
  s: number;
}

export function buildTrees(trees: TreeInput[]): THREE.Group {
  const g = new THREE.Group();
  const byType = [0, 1, 2, 3].map((t) => trees.filter((x) => x.t === t));
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 1, 6).translate(0, 0.5, 0);
  const trunkMat = lambert('#6b4a2f');
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();

  const crowns: [THREE.BufferGeometry, string[], (s: number) => { trunkH: number; scale: THREE.Vector3; y: number }][] = [
    // yumaloq bargli
    [new THREE.IcosahedronGeometry(1, 1), ['#4f8f3c', '#5a9a40', '#3f7f35', '#68a84a'], (s) => ({ trunkH: 2.4 * s, scale: new THREE.Vector3(2.8 * s, 2.5 * s, 2.8 * s), y: 4.4 * s })],
    // terak — baland, ingichka
    [new THREE.IcosahedronGeometry(1, 1), ['#4c8a3a', '#5b9a44', '#447f34'], (s) => ({ trunkH: 2 * s, scale: new THREE.Vector3(1.3 * s, 7 * s, 1.3 * s), y: 8 * s })],
    // archa — konus
    [new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), ['#2f6b45', '#3a7d52', '#285f3c'], (s) => ({ trunkH: 1.2 * s, scale: new THREE.Vector3(2.4 * s, 7 * s, 2.4 * s), y: 1.2 * s })],
    // mevali — past, keng
    [new THREE.IcosahedronGeometry(1, 1), ['#5a9a40', '#6aa84a', '#4f8f3c'], (s) => ({ trunkH: 1.4 * s, scale: new THREE.Vector3(2.4 * s, 1.9 * s, 2.4 * s), y: 2.9 * s })],
  ];

  byType.forEach((list, t) => {
    if (!list.length) return;
    const [geo, colors, dims] = crowns[t];
    const crown = new THREE.InstancedMesh(geo, lambert('#ffffff'), list.length);
    const trunk = new THREE.InstancedMesh(trunkGeo, trunkMat, list.length);
    list.forEach((tr, i) => {
      const [x, z] = toLocal(tr.lng, tr.lat);
      const d = dims(tr.s);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i * 2.399) % (Math.PI * 2));
      m.compose(new THREE.Vector3(x, d.y, z), q, d.scale);
      crown.setMatrixAt(i, m);
      crown.setColorAt(i, col.set(colors[i % colors.length]));
      m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, d.trunkH, 1));
      trunk.setMatrixAt(i, m);
    });
    crown.instanceMatrix.needsUpdate = true;
    if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
    g.add(crown, trunk);
    // mevali daraxtlarga mevalar
    if (t === 3) {
      const fruit = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.28, 0), lambert('#ffffff'), list.length * 4);
      let n = 0;
      const fc = ['#e8452f', '#f39c2b', '#c0262d'];
      list.forEach((tr, i) => {
        const [x, z] = toLocal(tr.lng, tr.lat);
        const d = dims(tr.s);
        for (let k = 0; k < 4; k++) {
          const a = k * 1.57 + i;
          m.makeTranslation(x + Math.cos(a) * d.scale.x * 0.85, d.y + (k % 2 ? 0.4 : -0.5), z + Math.sin(a) * d.scale.z * 0.85);
          fruit.setMatrixAt(n, m);
          fruit.setColorAt(n, col.set(fc[(i + k) % 3]));
          n++;
        }
      });
      g.add(fruit);
    }
  });
  return g;
}

/** Ko'cha chiroqlari — katta ko'chalar bo'ylab har ~35 m, ikki tomonda. */
export function buildLamps(roads: { k: string; path: [number, number][] }[]): THREE.Group {
  const spots: { x: number; z: number; a: number }[] = [];
  for (const r of roads) {
    if (r.k === 'street') continue;
    const pts = r.path.map(([lng, lat]) => toLocal(lng, lat));
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x1, z1] = pts[i - 1];
      const [x2, z2] = pts[i];
      const len = Math.hypot(x2 - x1, z2 - z1);
      const nx = -(z2 - z1) / (len || 1);
      const nz = (x2 - x1) / (len || 1);
      for (let d = 35 - acc; d < len; d += 35) {
        const f = d / len;
        const side = spots.length % 2 ? 1 : -1;
        const off = r.k === 'road1' ? 10 : 7.5;
        spots.push({ x: x1 + (x2 - x1) * f + nx * off * side, z: z1 + (z2 - z1) * f + nz * off * side, a: Math.atan2(nz * side, nx * side) });
      }
      acc = (acc + len) % 35;
    }
  }
  const g = new THREE.Group();
  if (!spots.length) return g;
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6).translate(0, 3.5, 0), lambert('#4b5563'), spots.length);
  const head = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: '#fff3c4' }), spots.length);
  const m = new THREE.Matrix4();
  spots.forEach((s, i) => {
    m.makeTranslation(s.x, 0, s.z);
    pole.setMatrixAt(i, m);
    m.makeRotationY(-s.a).setPosition(s.x - Math.cos(s.a) * 0.6, 7, s.z - Math.sin(s.a) * 0.6);
    head.setMatrixAt(i, m);
  });
  g.add(pole, head);
  return g;
}

// ---------- Mashinalar ----------
type Path = { pts: [number, number][]; cum: number[]; k: string };
interface Car {
  path: Path;
  s: number;
  dir: 1 | -1;
  speed: number;
  lane: number;
  bus: boolean;
}

const CAR_COLORS = ['#f5f5f2', '#f5f5f2', '#ffffff', '#c9ced6', '#2f3540', '#ffcd3c', '#b8302f', '#2f5d9a'];

export class Traffic {
  group = new THREE.Group();
  private cars: Car[] = [];
  private body: THREE.InstancedMesh;
  private cabin: THREE.InstancedMesh;
  private buses: THREE.InstancedMesh;
  private busIdx: number[] = [];
  private carIdx: number[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(roads: { k: string; path: [number, number][] }[], maxCars = 2200) {
    const paths: Path[] = roads
      .map((r) => {
        const pts = r.path.map(([lng, lat]) => toLocal(lng, lat));
        const cum = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        return { pts, cum, k: r.k };
      })
      .filter((p) => p.cum[p.cum.length - 1] > 40);
    // Zichlik yo'l uzunligiga qarab: katta ko'chada har ~45 m, ichki ko'chada ~140 m
    // Avval katta ko'chalar (ular ko'rinadigan asosiy oqim), keyin ichki ko'chalar
    paths.sort((a, b) => Number(a.k === 'street') - Number(b.k === 'street'));
    for (const path of paths) {
      const len = path.cum[path.cum.length - 1];
      const n = Math.max(path.k === 'street' ? 0 : 1, Math.round(len / (path.k === 'street' ? 140 : 45)));
      for (let i = 0; i < n && this.cars.length < maxCars; i++) {
        const bus = path.k !== 'street' && Math.random() < 0.08;
        this.cars.push({ path, s: Math.random() * len, dir: Math.random() < 0.5 ? 1 : -1, speed: bus ? 7 : 8 + Math.random() * 6, lane: path.k === 'street' ? 2.2 : 4.2, bus });
      }
    }
    this.cars.forEach((c, i) => (c.bus ? this.busIdx : this.carIdx).push(i));
    this.body = new THREE.InstancedMesh(new THREE.BoxGeometry(2.7, 1.35, 6.4).translate(0, 1.1, 0), lambert('#ffffff'), Math.max(1, this.carIdx.length));
    this.cabin = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 1.05, 3.3).translate(0, 2.3, -0.3), lambert('#3d5a78'), Math.max(1, this.carIdx.length));
    this.buses = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 3.8, 13).translate(0, 2.3, 0), lambert('#f4b81f'), Math.max(1, this.busIdx.length));
    const col = new THREE.Color();
    this.carIdx.forEach((_, j) => this.body.setColorAt(j, col.set(CAR_COLORS[j % CAR_COLORS.length])));
    // Mashinalar doim harakatda — boshlang'ich chegaraga qarab yashirilib qolmasin
    for (const mesh of [this.body, this.cabin, this.buses]) mesh.frustumCulled = false;
    (window as unknown as { __kbCars?: number }).__kbCars = this.cars.length;
    this.group.add(this.body, this.cabin, this.buses);
    this.update(0);
  }

  update(dt: number) {
    const place = (c: Car) => {
      const { pts, cum } = c.path;
      const len = cum[cum.length - 1];
      c.s += c.speed * dt * c.dir;
      if (c.s > len) { c.s = len; c.dir = -1; }
      if (c.s < 0) { c.s = 0; c.dir = 1; }
      let i = 1;
      while (i < cum.length - 1 && cum[i] < c.s) i++;
      const seg = cum[i] - cum[i - 1] || 1;
      const t = (c.s - cum[i - 1]) / seg;
      const [x1, z1] = pts[i - 1];
      const [x2, z2] = pts[i];
      const dx = (x2 - x1) * c.dir;
      const dz = (z2 - z1) * c.dir;
      const L = Math.hypot(dx, dz) || 1;
      // o'ng qator: harakat yo'nalishiga perpendikulyar
      const rx = -dz / L;
      const rz = dx / L;
      const x = x1 + (x2 - x1) * t + rx * c.lane;
      const z = z1 + (z2 - z1) * t + rz * c.lane;
      this.q.setFromAxisAngle(this.up, Math.atan2(dx, dz));
      this.m.compose(new THREE.Vector3(x, 0, z), this.q, new THREE.Vector3(1, 1, 1));
      return this.m;
    };
    this.carIdx.forEach((ci, j) => {
      const mm = place(this.cars[ci]);
      this.body.setMatrixAt(j, mm);
      this.cabin.setMatrixAt(j, mm);
    });
    this.busIdx.forEach((ci, j) => this.buses.setMatrixAt(j, place(this.cars[ci])));
    this.body.instanceMatrix.needsUpdate = true;
    this.cabin.instanceMatrix.needsUpdate = true;
    this.buses.instanceMatrix.needsUpdate = true;
  }
}
