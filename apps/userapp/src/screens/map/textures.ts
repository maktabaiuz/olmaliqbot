import type { Map as MlMap } from 'maplibre-gl';

/**
 * 3D xarita tasvirlari — tuval (canvas) orqali chiziladi, rasm fayllari
 * yuklanmaydi. Domlar uchun 10 xil fasad (deraza, balkon), hovli uylar
 * uchun 4 xil devor, daraxtlar uchun 3 tur × 4 tebranish fazasi.
 */

const px = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c);
  return c.getImageData(0, 0, w, h);
};

// ---------- Dom fasadlari (10 xil) ----------
// [devor, deraza ramkasi, oyna, balkon|null] — Olmaliq mikrorayonlari: panel, g'isht, bo'yalgan suvoq, yangi turar-joylar
const DOM_FACADES: [string, string, string, string | null][] = [
  ['#e9e3d6', '#cfc6b3', '#5d7fa8', '#d8cfbc'], // och bej panel
  ['#f4f1ea', '#d9d4c8', '#6a8fbd', null], // oq suvoq
  ['#cfe0ee', '#a9c1d6', '#3f6390', '#b8cde0'], // havorang panel
  ['#f3dfa2', '#d9bf73', '#58799f', '#e6cd87'], // sariq
  ['#f2c9b0', '#d9a88a', '#557aa1', null], // shaftoli
  ['#cfe8d6', '#a7cdb2', '#4d7799', '#b9dcc3'], // yalpiz
  ['#c9c9c4', '#a8a8a2', '#4f6a8a', '#b5b5af'], // beton
  ['#b96a4f', '#9a5038', '#c9d8e8', null], // qizil g'isht
  ['#e7d9c4', '#c7b597', '#6487b0', '#cbb894'], // sovet panel, balkonli
  ['#9fb4c8', '#7f97ae', '#d6e6f5', null], // zamonaviy oynali
];

function domFacade([wall, frame, glass, balcony]: (typeof DOM_FACADES)[number]) {
  // 24x30 px = bitta qavat, ikkita deraza
  return px(24, 30, (c) => {
    c.fillStyle = wall;
    c.fillRect(0, 0, 24, 30);
    for (const x of [3, 14]) {
      c.fillStyle = frame;
      c.fillRect(x - 1, 7, 9, 13);
      c.fillStyle = glass;
      c.fillRect(x, 8, 7, 11);
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.fillRect(x + 1, 9, 2, 5);
      c.fillStyle = frame;
      c.fillRect(x + 3, 8, 1, 11);
    }
    if (balcony) {
      c.fillStyle = balcony;
      c.fillRect(12, 18, 12, 6);
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.fillRect(12, 24, 12, 1);
    }
    c.fillStyle = 'rgba(0,0,0,0.07)';
    c.fillRect(0, 28, 24, 2); // qavatlar orasidagi chok
  });
}

// ---------- Hovli uy devorlari (4 xil) ----------
const HOUSE_WALLS: [string, string][] = [
  ['#f6ecd9', '#5f86ad'], // oq-bej suvoq
  ['#e8c98f', '#557a9e'], // sariq g'isht
  ['#c98a6a', '#e9eef3'], // qizil g'isht
  ['#efe2c8', '#6b8a5e'], // bej, yashil darcha
];

function houseWall([wall, win]: [string, string], brick: boolean) {
  return px(20, 18, (c) => {
    c.fillStyle = wall;
    c.fillRect(0, 0, 20, 18);
    if (brick) {
      c.fillStyle = 'rgba(0,0,0,0.08)';
      for (let y = 0; y < 18; y += 4) c.fillRect(0, y, 20, 1);
    }
    c.fillStyle = '#ffffff';
    c.fillRect(6, 5, 8, 8);
    c.fillStyle = win;
    c.fillRect(7, 6, 6, 6);
    c.fillStyle = '#ffffff';
    c.fillRect(9, 6, 1, 6);
  });
}

// Tijorat / jamoat binolari
const glassFacade = px(24, 24, (c) => {
  c.fillStyle = '#8fb3cf';
  c.fillRect(0, 0, 24, 24);
  c.fillStyle = '#b9d4e8';
  for (let x = 0; x < 24; x += 8) c.fillRect(x + 1, 1, 6, 22);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(2, 2, 2, 10);
});
const civicFacade = px(24, 24, (c) => {
  c.fillStyle = '#efe8da';
  c.fillRect(0, 0, 24, 24);
  c.fillStyle = '#d9cfba';
  c.fillRect(2, 0, 3, 24);
  c.fillRect(19, 0, 3, 24);
  c.fillStyle = '#6d8db0';
  c.fillRect(8, 6, 8, 12);
});
const schoolFacade = px(24, 24, (c) => {
  c.fillStyle = '#fbe3a0';
  c.fillRect(0, 0, 24, 24);
  c.fillStyle = '#ffffff';
  c.fillRect(3, 6, 18, 11);
  c.fillStyle = '#6c8fb6';
  c.fillRect(4, 7, 7, 9);
  c.fillRect(13, 7, 7, 9);
});
const healthFacade = px(24, 24, (c) => {
  c.fillStyle = '#f7f9fb';
  c.fillRect(0, 0, 24, 24);
  c.fillStyle = '#7fa6c9';
  c.fillRect(3, 7, 7, 9);
  c.fillRect(14, 7, 7, 9);
  c.fillStyle = '#e45b5b';
  c.fillRect(0, 21, 24, 3);
});
const industryFacade = px(32, 24, (c) => {
  c.fillStyle = '#c4c7cc';
  c.fillRect(0, 0, 32, 24);
  c.fillStyle = 'rgba(0,0,0,0.08)';
  for (let x = 0; x < 32; x += 4) c.fillRect(x, 0, 1, 24);
  c.fillStyle = '#8fa2b5';
  c.fillRect(4, 3, 24, 5);
});

// ---------- Daraxtlar: 3 tur (yumaloq, terak, archa) × 4 faza ----------
const TREE_W = 48;
const TREE_H = 72;

function drawTree(c: CanvasRenderingContext2D, type: number, sway: number) {
  c.clearRect(0, 0, TREE_W, TREE_H);
  const baseX = TREE_W / 2;
  const baseY = TREE_H - 3;
  // soya
  c.fillStyle = 'rgba(40,50,30,0.22)';
  c.beginPath();
  c.ellipse(baseX + 4, baseY, 12, 3.5, 0, 0, Math.PI * 2);
  c.fill();
  // tana
  c.strokeStyle = '#6b4a2f';
  c.lineWidth = type === 1 ? 2.5 : 3.5;
  c.beginPath();
  c.moveTo(baseX, baseY);
  c.quadraticCurveTo(baseX + sway * 0.3, baseY - 14, baseX + sway * 0.6, baseY - 22);
  c.stroke();
  const tx = baseX + sway;
  const blob = (x: number, y: number, r: number, col: string) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  };
  if (type === 0) {
    // yumaloq bargli daraxt (chinor/tut)
    const dark = '#3f7a35';
    const mid = '#58993f';
    const light = '#7dbb55';
    blob(tx - 7, baseY - 30, 11, dark);
    blob(tx + 7, baseY - 31, 11, dark);
    blob(tx, baseY - 40, 13, mid);
    blob(tx - 8, baseY - 36, 9, mid);
    blob(tx + 8, baseY - 37, 9, mid);
    blob(tx - 3, baseY - 45, 7, light);
    blob(tx + 4, baseY - 41, 5, light);
  } else if (type === 1) {
    // terak — baland, ingichka (Olmaliq ko'chalarining belgisi)
    c.fillStyle = '#4e8a3a';
    c.beginPath();
    c.ellipse(tx, baseY - 38, 7.5, 28, (sway * Math.PI) / 180, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#6aa64a';
    c.beginPath();
    c.ellipse(tx - 2, baseY - 42, 4, 20, (sway * Math.PI) / 180, 0, Math.PI * 2);
    c.fill();
  } else if (type === 3) {
    // mevali daraxt (o'rik/olma/anor) — past, keng, mevalari bilan
    blob(tx - 8, baseY - 24, 10, '#4b8c3a');
    blob(tx + 8, baseY - 25, 10, '#4b8c3a');
    blob(tx, baseY - 32, 12, '#62a447');
    blob(tx - 4, baseY - 36, 6, '#84c25e');
    const fruit = ['#e8452f', '#f39c2b', '#e8452f', '#c0262d'];
    [[-8, -27], [6, -30], [-1, -22], [10, -22], [-3, -35], [4, -26]].forEach(([dx, dy], i) => blob(tx + dx, baseY + dy, 1.8, fruit[i % fruit.length]));
  } else {
    // archa
    for (let i = 0; i < 4; i++) {
      const y = baseY - 14 - i * 11;
      const w = 15 - i * 3;
      c.fillStyle = i % 2 ? '#2f6b45' : '#3a7d52';
      c.beginPath();
      c.moveTo(tx + sway * (i / 4) - w, y);
      c.lineTo(tx + sway * ((i + 1) / 4), y - 16);
      c.lineTo(tx + sway * (i / 4) + w, y);
      c.closePath();
      c.fill();
    }
  }
}

const SWAY = [-2.2, -0.8, 0.8, 2.2, 0.8, -0.8];
const treeCanvas = document.createElement('canvas');
treeCanvas.width = TREE_W;
treeCanvas.height = TREE_H;
const treeCtx = treeCanvas.getContext('2d')!;
function treeFrame(type: number, step: number) {
  drawTree(treeCtx, type, SWAY[step % SWAY.length]);
  return treeCtx.getImageData(0, 0, TREE_W, TREE_H);
}

export function registerTextures(map: MlMap) {
  DOM_FACADES.forEach((f, i) => map.addImage(`dom-${i}`, domFacade(f)));
  HOUSE_WALLS.forEach((w, i) => map.addImage(`house-${i}`, houseWall(w, i === 1 || i === 2)));
  map.addImage('glass', glassFacade);
  map.addImage('civic', civicFacade);
  map.addImage('school', schoolFacade);
  map.addImage('health', healthFacade);
  map.addImage('industry', industryFacade);
  for (let t = 0; t < 4; t++) for (let p = 0; p < 4; p++) map.addImage(`tree-${t}-${p}`, treeFrame(t, p), { pixelRatio: 2 });
  CARS.forEach((c, i) => map.addImage(`car-${i}`, carSprite(c), { pixelRatio: 2 }));
  PEOPLE.forEach((c, i) => map.addImage(`person-${i}`, personSprite(c), { pixelRatio: 2 }));
  for (let f = 0; f < 4; f++) map.addImage(`waves-${f}`, waveFrame(f));
}

/** Shamol: har 4 fazali guruh o'z vaqtida tebranadi (daraxtlar bir xilda emas). */
export function startWind(map: MlMap): () => void {
  let step = 0;
  const id = window.setInterval(() => {
    if (document.hidden) return;
    step++;
    if (step % 2 === 0 && map.hasImage('waves-0')) map.updateImage('waves-0', waveFrame((step / 2) % 4));
  }, 260);
  return () => window.clearInterval(id);
}

// ---------- Mashinalar (tepadan ko'rinish, yo'l yo'nalishida buriladi) ----------
// [kuzov, tom/oyna, uzunlik] — oq Damas, oq/kumush/qora Nexia-Cobalt, sariq taksi, sariq avtobus
const CARS: [string, string, number][] = [
  ['#f5f5f2', '#8fb3cf', 26], // Damas
  ['#ffffff', '#6f8fb0', 30], // Cobalt oq
  ['#c9ced6', '#5f7da0', 30], // kumush Nexia
  ['#2f3540', '#7896b8', 30], // qora
  ['#ffcd3c', '#7a99bb', 30], // taksi
  ['#f4b81f', '#86a6c6', 48], // avtobus
];
function carSprite([body, glass, len]: [string, string, number]) {
  return px(18, 52, (c) => {
    const x = 3;
    const y = (52 - len) / 2;
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(x + 1, y + 2, 12, len);
    c.fillStyle = body;
    c.beginPath();
    c.roundRect(x, y, 12, len, 4);
    c.fill();
    c.fillStyle = glass;
    c.fillRect(x + 2, y + 5, 8, len > 40 ? len - 10 : 6);
    if (len <= 40) c.fillRect(x + 2, y + len - 9, 8, 4);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(x + 3, y + 1, 6, 2);
  });
}

// ---------- Odamchalar ----------
const PEOPLE = ['#e45b5b', '#4f7ea8', '#5fb35a', '#f4bf32', '#8b7cf6'];
function personSprite(shirt: string) {
  return px(12, 24, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.beginPath();
    c.ellipse(6, 22, 4, 1.5, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3b3350';
    c.fillRect(4, 15, 2, 7);
    c.fillRect(7, 15, 2, 7);
    c.fillStyle = shirt;
    c.beginPath();
    c.roundRect(3, 8, 7, 9, 2);
    c.fill();
    c.fillStyle = '#f2c7a0';
    c.beginPath();
    c.arc(6.5, 5, 3, 0, Math.PI * 2);
    c.fill();
  });
}

// ---------- Suv to'lqinlari (4 kadr) ----------
function waveFrame(f: number) {
  return px(32, 32, (c) => {
    c.fillStyle = '#3f92c4';
    c.fillRect(0, 0, 32, 32);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 4; i++) {
      const y = (i * 8 + f * 2) % 32;
      c.fillRect((i * 11 + f * 3) % 32, y, 7, 1.5);
      c.fillRect((i * 11 + f * 3 + 16) % 32, (y + 4) % 32, 5, 1.5);
    }
  });
}
