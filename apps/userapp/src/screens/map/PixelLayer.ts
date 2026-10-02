import L from 'leaflet';

/**
 * Pixel-multfilm xarita qatlami (2026-10). OpenStreetMap'dagi haqiqiy
 * Olmaliq obyektlari (1 900+ bino, stadion, park, suv, yo'l, temir yo'l —
 * public/olmaliq-pixel.json, scripts/build-pixel-map.py) har bir 256px
 * bo'lak uchun 4 marta kichik tuvalga chiziladi, ranglar cheklangan
 * palitraga "yopishtiriladi" va silliqlashsiz kattalashtiriladi — natija
 * o'yindagidek aniq piksellar.
 */
const PX = 4; // bitta "piksel" = 4 ekran nuqtasi
const SMALL = 256 / PX;

const C = {
  grass: '#8fd16a',
  grass2: '#82c55f',
  park: '#5fae4e',
  tree: '#3d8a3a',
  treeHi: '#79c95a',
  trunk: '#7a5230',
  cemetery: '#a7c79a',
  water: '#4aa8e8',
  waterHi: '#8fd0ff',
  road: '#f2eadb',
  roadEdge: '#c9b99a',
  road1: '#ffd36b',
  road1Edge: '#d9a43c',
  rail: '#8a6a4f',
  railTie: '#5a4433',
  pitch: '#4fbf5a',
  line: '#ffffff',
  track: '#d9644a',
  wall: '#6b5a7a',
  outline: '#3b3350',
  houseRoof: '#e8674a',
  houseRoof2: '#c94f37',
  domRoof: '#c9d3e6',
  domWin: '#5b6f99',
  school: '#f4bf32',
  industry: '#a3a8b3',
  bld: '#f2b591',
};

const PALETTE = Array.from(new Set(Object.values(C))).map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

type Feature = { k: string; pts: L.LatLng[]; bb: L.LatLngBounds; name?: string };

let dataPromise: Promise<Feature[]> | null = null;
export function loadPixelData(): Promise<Feature[]> {
  if (!dataPromise) {
    dataPromise = fetch(`${import.meta.env.BASE_URL}olmaliq-pixel.json`)
      .then((r) => r.json())
      .then((j: { f: [string, number[], string?][] }) =>
        j.f.map(([k, flat, name]) => {
          const pts: L.LatLng[] = [];
          for (let i = 0; i < flat.length; i += 2) pts.push(L.latLng(flat[i] / 1e5, flat[i + 1] / 1e5));
          return { k, pts, bb: L.latLngBounds(pts), name };
        })
      );
  }
  return dataPromise;
}

// 2x2 / 6x6 naqshlar (dunyo koordinatalariga bog'lanadi — bo'laklar orasida chok yo'q)
function makePattern(ctx: CanvasRenderingContext2D, size: number, draw: (p: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const p = c.getContext('2d')!;
  draw(p);
  return ctx.createPattern(c, 'repeat')!;
}

function snapToPalette(ctx: CanvasRenderingContext2D) {
  const img = ctx.getImageData(0, 0, SMALL, SMALL);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let best = 0;
    let bd = Infinity;
    for (let j = 0; j < PALETTE.length; j++) {
      const p = PALETTE[j];
      const dist = (d[i] - p[0]) ** 2 + (d[i + 1] - p[1]) ** 2 + (d[i + 2] - p[2]) ** 2;
      if (dist < bd) {
        bd = dist;
        best = j;
      }
    }
    d[i] = PALETTE[best][0];
    d[i + 1] = PALETTE[best][1];
    d[i + 2] = PALETTE[best][2];
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export const PixelLayer = L.GridLayer.extend({
  initialize(this: any, features: Feature[], options: L.GridLayerOptions) {
    this._features = features;
    L.setOptions(this, options);
  },

  createTile(this: any, coords: L.Coords) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 256;
    const small = document.createElement('canvas');
    small.width = small.height = SMALL;
    const ctx = small.getContext('2d')!;
    const map: L.Map = this._map;
    const z = coords.z;
    const origin = L.point(coords.x * 256, coords.y * 256);
    const nw = map.unproject(origin, z);
    const se = map.unproject(origin.add([256, 256]), z);
    const tileBounds = L.latLngBounds(se, nw).pad(0.15);
    const toSmall = (ll: L.LatLng) => {
      const p = map.project(ll, z).subtract(origin);
      return [p.x / PX, p.y / PX] as const;
    };
    const ox = -((origin.x / PX) % 6);
    const oy = -((origin.y / PX) % 6);
    const aligned = (pat: CanvasPattern) => {
      pat.setTransform(new DOMMatrix().translate(ox, oy));
      return pat;
    };

    // Yer — o't, siyrak naqsh bilan
    ctx.fillStyle = aligned(
      makePattern(ctx, 6, (p) => {
        p.fillStyle = C.grass;
        p.fillRect(0, 0, 6, 6);
        p.fillStyle = C.grass2;
        p.fillRect(1, 1, 1, 1);
        p.fillRect(4, 3, 1, 1);
      })
    );
    ctx.fillRect(0, 0, SMALL, SMALL);

    const trees = aligned(
      makePattern(ctx, 6, (p) => {
        p.fillStyle = C.park;
        p.fillRect(0, 0, 6, 6);
        p.fillStyle = C.tree;
        p.fillRect(1, 0, 3, 3);
        p.fillStyle = C.treeHi;
        p.fillRect(1, 0, 1, 1);
        p.fillStyle = C.trunk;
        p.fillRect(2, 3, 1, 1);
      })
    );
    const waves = aligned(
      makePattern(ctx, 6, (p) => {
        p.fillStyle = C.water;
        p.fillRect(0, 0, 6, 6);
        p.fillStyle = C.waterHi;
        p.fillRect(1, 2, 2, 1);
        p.fillRect(4, 5, 1, 1);
      })
    );
    const windows = aligned(
      makePattern(ctx, 2, (p) => {
        p.fillStyle = C.domRoof;
        p.fillRect(0, 0, 2, 2);
        p.fillStyle = C.domWin;
        p.fillRect(1, 1, 1, 1);
      })
    );

    const path = (f: Feature, close: boolean) => {
      ctx.beginPath();
      f.pts.forEach((ll, i) => {
        const [x, y] = toSmall(ll);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (close) ctx.closePath();
    };
    const stroke = (f: Feature, w: number, color: string) => {
      path(f, false);
      ctx.lineWidth = w;
      ctx.strokeStyle = color;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.stroke();
    };
    const fill = (f: Feature, style: string | CanvasPattern, outline?: string) => {
      path(f, true);
      ctx.fillStyle = style;
      ctx.fill();
      if (outline) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = outline;
        ctx.stroke();
      }
    };
    const building = (f: Feature, roof: string | CanvasPattern, height: number) => {
      // Uzoqdan: faqat tom (aks holda devor/kontur qo'shilib qora dog' bo'ladi)
      if (z < 16) return fill(f, typeof roof === 'string' ? roof : C.domRoof);
      // Yaqindan psevdo-3D: avval pastga siljigan devor, keyin tom
      ctx.save();
      ctx.translate(0, height);
      fill(f, C.wall);
      ctx.restore();
      fill(f, roof, C.outline);
    };

    const big = z >= 15;
    for (const f of this._features as Feature[]) {
      if (!tileBounds.intersects(f.bb)) continue;
      switch (f.k) {
        case 'grass': fill(f, C.grass2); break;
        case 'park': fill(f, trees); break;
        case 'cemetery': fill(f, C.cemetery); break;
        case 'water': fill(f, waves); break;
        case 'river': stroke(f, big ? 3 : 2, C.water); break;
        case 'pitch': fill(f, C.pitch, C.line); break;
        case 'stadium': fill(f, C.track, C.line); break;
        case 'rail': stroke(f, 2, C.railTie); stroke(f, 1, C.rail); break;
        case 'street': if (z >= 14) { stroke(f, big ? 2.5 : 1.5, C.roadEdge); stroke(f, big ? 1.5 : 1, C.road); } break;
        case 'road3':
        case 'road2': stroke(f, big ? 3.5 : 2.5, C.roadEdge); stroke(f, big ? 2.5 : 1.5, C.road); break;
        case 'road1': stroke(f, big ? 4.5 : 3, C.road1Edge); stroke(f, big ? 3 : 2, C.road1); break;
        case 'house': building(f, (f.pts.length + Math.round(f.bb.getCenter().lng * 1e4)) % 2 ? C.houseRoof : C.houseRoof2, 1); break;
        case 'dom': building(f, windows, big ? 3 : 2); break;
        case 'school': building(f, C.school, 2); break;
        case 'industry': building(f, C.industry, 2); break;
        default: building(f, C.bld, 1);
      }
    }

    snapToPalette(ctx);
    const out = tile.getContext('2d')!;
    out.imageSmoothingEnabled = false;
    out.drawImage(small, 0, 0, 256, 256);
    return tile;
  },
}) as unknown as new (features: Feature[], options?: L.GridLayerOptions) => L.GridLayer;

export type { Feature as PixelFeature };
