import * as THREE from 'three';

/**
 * Fasad teksturalari — bitta "bo'lak" = bitta deraza oralig'i (kenglik)
 * × bitta qavat (balandlik). UV koordinatalari metrda beriladi
 * (geometry.ts), shuning uchun derazalar har qanday masshtabda cho'zilmaydi.
 */
export const BAY_W = 3.2; // m — deraza oralig'i
export const FLOOR_H = 3.0; // m — qavat balandligi

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// [devor, ramka, oyna, balkon|null, panel chiziqlari]
export const DOM_STYLES: [string, string, string, string | null, boolean][] = [
  ['#e9e1cf', '#cdbfa3', '#4d6f96', '#d6c8ab', true], // bej panel, balkonli
  ['#f3efe6', '#d7d0c0', '#5b82ad', null, false], // oq suvoq
  ['#c7dcec', '#a2bdd3', '#355a85', '#b3cbe0', true], // havorang
  ['#f2dc9c', '#d4b96b', '#4f7097', '#e3c97f', false], // sariq
  ['#f0c4a8', '#d3a184', '#4e7298', null, true], // shaftoli
  ['#c8e4d0', '#a1c8ad', '#466f91', '#b3d8be', false], // yalpiz
  ['#c4c4bd', '#a3a39c', '#4a6584', '#b0b0a9', true], // beton
  ['#b46549', '#934a33', '#c5d6e6', null, false], // qizil g'isht
  ['#e3d5bd', '#c2af8f', '#5d80a8', '#c9b691', true], // sovet panel
  ['#a7bccf', '#869db4', '#d7e7f5', null, false], // zamonaviy oynali
];

export function domFacade([wall, frame, glass, balcony, panels]: (typeof DOM_STYLES)[number]) {
  return canvasTexture(128, 120, (c) => {
    c.fillStyle = wall;
    c.fillRect(0, 0, 128, 120);
    if (panels) {
      c.fillStyle = 'rgba(0,0,0,0.07)';
      c.fillRect(0, 0, 128, 2);
      c.fillRect(0, 0, 2, 120);
    }
    // deraza
    c.fillStyle = frame;
    c.fillRect(30, 28, 68, 58);
    c.fillStyle = glass;
    c.fillRect(34, 32, 60, 50);
    const g = c.createLinearGradient(34, 32, 94, 82);
    g.addColorStop(0, 'rgba(255,255,255,0.45)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(255,255,255,0.2)');
    c.fillStyle = g;
    c.fillRect(34, 32, 60, 50);
    c.fillStyle = frame;
    c.fillRect(62, 32, 4, 50);
    c.fillRect(34, 52, 60, 3);
    // tokcha
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.fillRect(28, 86, 72, 4);
    if (balcony) {
      c.fillStyle = balcony;
      c.fillRect(22, 78, 84, 26);
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.fillRect(22, 104, 84, 3);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(22, 78, 84, 3);
    }
  });
}

export const HOUSE_STYLES: [string, string][] = [
  ['#f5ead4', '#5f86ad'], // oq-bej suvoq
  ['#e6c48a', '#557a9e'], // sariq g'isht
  ['#c88566', '#e6edf3'], // qizil g'isht
  ['#eee0c4', '#5f8a55'], // bej, yashil darcha
];

export function houseFacade([wall, win]: [string, string], brick: boolean) {
  return canvasTexture(128, 96, (c) => {
    c.fillStyle = wall;
    c.fillRect(0, 0, 128, 96);
    if (brick) {
      c.fillStyle = 'rgba(0,0,0,0.07)';
      for (let y = 0; y < 96; y += 8) c.fillRect(0, y, 128, 1.5);
    }
    // pastki sokol
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(0, 84, 128, 12);
    // deraza va darchalar
    c.fillStyle = '#ffffff';
    c.fillRect(42, 26, 44, 40);
    c.fillStyle = win;
    c.fillRect(46, 30, 36, 32);
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.fillRect(48, 32, 10, 14);
    c.fillStyle = '#ffffff';
    c.fillRect(62, 30, 3, 32);
  });
}

export function plainFacade(wall: string, glass: string, kind: 'glass' | 'civic' | 'school' | 'health' | 'industry') {
  return canvasTexture(128, 120, (c) => {
    c.fillStyle = wall;
    c.fillRect(0, 0, 128, 120);
    if (kind === 'glass') {
      c.fillStyle = glass;
      c.fillRect(6, 8, 116, 104);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(10, 12, 30, 96);
      c.fillStyle = wall;
      c.fillRect(62, 8, 4, 104);
    } else if (kind === 'industry') {
      c.fillStyle = 'rgba(0,0,0,0.08)';
      for (let x = 0; x < 128; x += 16) c.fillRect(x, 0, 2, 120);
      c.fillStyle = glass;
      c.fillRect(10, 14, 108, 20);
    } else {
      if (kind === 'civic') {
        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.fillRect(8, 0, 14, 120);
        c.fillRect(106, 0, 14, 120);
      }
      c.fillStyle = '#ffffff';
      c.fillRect(36, 24, 56, 64);
      c.fillStyle = glass;
      c.fillRect(40, 28, 48, 56);
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.fillRect(42, 30, 12, 24);
      if (kind === 'health') {
        c.fillStyle = '#e04b4b';
        c.fillRect(0, 110, 128, 10);
      }
    }
  });
}
