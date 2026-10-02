"""OSM (Overpass JSON) → public/olmaliq-3d.json — 3D diorama xarita uchun GeoJSON.

Ishlatish:  python3 scripts/build-3d-map.py osm.json
Overpass so'rovi (bbox 40.80,69.54,40.88,69.66): building, leisure, landuse,
natural, waterway, highway, railway — "out tags geom".
Ma'lumot © OpenStreetMap contributors (ODbL).

Binolar turi OSM teglaridan aniqlanadi (amenity, religion, shop, qavatlar):
  house (hovli uy) | dom (ko'p qavatli) | tower (9+ qavat) | mosque | school |
  health | shop | civic | industry | bld
Har binoga "v" (0..9) — fasad/tom varianti (id'dan, barqaror).
Qo'shimcha 3D detallar: hovli uylarga qiya tom "qirrasi" (ridge), masjidga
gumbaz va minora. Daraxtlar — nuqtalar (park, o'tloq, ko'cha bo'yi).
"""
import json, math, random, sys

random.seed(7)
src = json.load(open(sys.argv[1]))
features = []
labels = []


def num(v):
    try:
        return float(str(v).strip())
    except ValueError:
        return 0.0


def classify(t):
    lv = num(t.get('building:levels', 0))
    a = t.get('amenity', '')
    b = t.get('building', '')
    if a == 'place_of_worship' or t.get('religion') == 'muslim' or b == 'mosque':
        return 'mosque', max(lv, 1) * 4 + 4
    if a in ('school', 'kindergarten', 'college', 'university') or b in ('school', 'kindergarten'):
        return 'school', max(lv, 2) * 3.4
    if a in ('clinic', 'hospital', 'doctors', 'pharmacy') or 'healthcare' in t or b == 'hospital':
        return 'health', max(lv, 2) * 3.4
    if 'shop' in t or a in ('restaurant', 'cafe', 'fast_food', 'bank', 'ice_cream', 'cinema') or b in ('retail', 'commercial'):
        return 'shop', max(lv, 1) * 3.8
    if a in ('townhall', 'courthouse', 'public_building', 'community_centre', 'arts_centre', 'bus_station') or 'office' in t or b in ('public', 'civic', 'government', 'office'):
        return 'civic', max(lv, 2) * 3.6
    if b in ('industrial', 'warehouse', 'construction', 'roof', 'garage', 'garages'):
        return 'industry', max(lv, 2) * 4.0
    if b == 'house' or b == 'detached':
        return 'house', 3.6
    if lv >= 9:
        return 'tower', lv * 3.0
    if b == 'apartments' or lv >= 3:
        return 'dom', max(lv, 4) * 3.0
    return ('house', 3.6) if lv <= 1 and b == 'yes' else ('bld', (lv * 3.0) if lv else 6.0)


def ring(geom):
    pts = [[round(p['lon'], 6), round(p['lat'], 6)] for p in geom]
    if pts[0] != pts[-1]:
        pts.append(pts[0])
    return pts


def centroid(poly):
    xs = [p[0] for p in poly[:-1]]
    ys = [p[1] for p in poly[:-1]]
    return sum(xs) / len(xs), sum(ys) / len(ys)


def scaled(poly, k):
    cx, cy = centroid(poly)
    return [[round(cx + (x - cx) * k, 6), round(cy + (y - cy) * k, 6)] for x, y in poly]


def octagon(lon, lat, r_m):
    dlat = r_m / 111320
    dlon = r_m / (111320 * math.cos(math.radians(lat)))
    pts = [[round(lon + dlon * math.cos(a), 6), round(lat + dlat * math.sin(a), 6)] for a in [i * math.pi / 8 for i in range(16)]]
    return pts + [pts[0]]


def inside(pt, poly):
    x, y = pt
    c = False
    for i in range(len(poly) - 1):
        x1, y1 = poly[i]
        x2, y2 = poly[i + 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1:
            c = not c
    return c


def poly_feat(props, poly):
    return {'type': 'Feature', 'properties': props, 'geometry': {'type': 'Polygon', 'coordinates': [poly]}}


trees = []


def plant(lon, lat):
    trees.append({'type': 'Feature', 'properties': {'k': 'tree', 't': random.choice([0, 0, 1, 1, 2]), 's': round(random.uniform(0.8, 1.25), 2), 'p': random.randint(0, 3)}, 'geometry': {'type': 'Point', 'coordinates': [round(lon, 6), round(lat, 6)]}})


def fill_trees(poly, step, limit):
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    y = min(ys)
    while y < max(ys) and len(trees) < limit:
        x = min(xs)
        while x < max(xs):
            jx, jy = x + random.uniform(-step / 2.5, step / 2.5), y + random.uniform(-step / 2.5, step / 2.5)
            if inside((jx, jy), poly):
                plant(jx, jy)
            x += step
        y += step


buildings = []
for e in src['elements']:
    t = e.get('tags', {})
    g = e.get('geometry')
    if not g or len(g) < 2:
        continue
    if 'building' in t and len(g) >= 3:
        k, h = classify(t)
        v = e['id'] % 10
        poly = ring(g)
        buildings.append(poly)
        props = {'k': k, 'h': round(h, 1), 'v': v}
        features.append(poly_feat(props, poly))
        cx, cy = centroid(poly)
        if t.get('name'):
            labels.append({'type': 'Feature', 'properties': {'k': 'label', 'name': t['name'], 'c': k}, 'geometry': {'type': 'Point', 'coordinates': [round(cx, 6), round(cy, 6)]}})
        # Hovli bog'i: har hovli uy yoniga 1-2 mevali daraxt (o'rik/olma/anor)
        if k == 'house' and len(trees) < 9000:
            for _ in range(random.choice([1, 1, 2])):
                ang = random.uniform(0, 2 * math.pi)
                d = random.uniform(7, 11)
                tx = cx + d * math.cos(ang) / (111320 * math.cos(math.radians(cy)))
                ty = cy + d * math.sin(ang) / 111320
                if not inside((tx, ty), poly):
                    trees.append({'type': 'Feature', 'properties': {'k': 'tree', 't': 3, 's': round(random.uniform(0.7, 1.0), 2), 'p': random.randint(0, 3)}, 'geometry': {'type': 'Point', 'coordinates': [round(tx, 6), round(ty, 6)]}})
        # Qiya tom: hovli uylar va tomi "gabled/hipped" binolar
        if k == 'house' or t.get('roof:shape') in ('gabled', 'hipped', 'pyramidal'):
            features.append(poly_feat({'k': 'ridge', 'b': round(h + 1.0, 1), 'h': round(h + 2.6, 1), 'v': v}, scaled(poly, 0.55)))
        # Masjid: gumbaz (3 qavat torayib boruvchi) + minora
        if k == 'mosque':
            r = max(4.0, min(12.0, math.sqrt(abs(sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(poly, poly[1:]))) / 2) * 111320 * 0.25))
            for i, (rk, dh) in enumerate([(1.0, 2.5), (0.8, 2.0), (0.5, 1.6)]):
                base = h + sum(x[1] for x in [(1.0, 2.5), (0.8, 2.0), (0.5, 1.6)][:i])
                features.append(poly_feat({'k': 'dome', 'b': round(base, 1), 'h': round(base + dh, 1), 'v': v}, octagon(cx, cy, r * rk)))
            mx, my = poly[0]
            features.append(poly_feat({'k': 'minaret', 'b': 0, 'h': round(h + 22, 1), 'v': v}, octagon(mx + (cx - mx) * 0.15, my + (cy - my) * 0.15, 1.6)))
        continue
    lt = t.get('leisure'), t.get('landuse'), t.get('natural')
    ak = None
    if t.get('leisure') == 'stadium':
        ak = 'stadium'
    elif t.get('leisure') == 'pitch':
        ak = 'pitch'
    elif t.get('leisure') in ('park', 'garden', 'playground', 'water_park') or t.get('landuse') in ('forest', 'orchard') or t.get('natural') == 'wood':
        ak = 'park'
    elif t.get('landuse') in ('grass', 'recreation_ground'):
        ak = 'grass'
    elif t.get('landuse') == 'cemetery':
        ak = 'cemetery'
    elif t.get('natural') == 'water':
        ak = 'water'
    if ak and len(g) >= 3:
        poly = ring(g)
        props = {'k': ak}
        if ak == 'stadium' and t.get('name'):
            props['name'] = t['name']
            cx, cy = centroid(poly)
            labels.append({'type': 'Feature', 'properties': {'k': 'label', 'name': t['name'], 'c': 'stadium'}, 'geometry': {'type': 'Point', 'coordinates': [round(cx, 6), round(cy, 6)]}})
        features.append(poly_feat(props, poly))
        if ak == 'park':
            fill_trees(poly, 0.00016, 9000)
        elif ak in ('grass', 'cemetery'):
            fill_trees(poly, 0.00035, 9000)
        continue
    lk = None
    if 'waterway' in t:
        lk = 'river'
    elif t.get('highway') in ('motorway', 'trunk', 'primary', 'primary_link'):
        lk = 'road1'
    elif t.get('highway') in ('secondary', 'secondary_link', 'tertiary'):
        lk = 'road2'
    elif t.get('highway'):
        lk = 'street'
    elif t.get('railway') == 'rail':
        lk = 'rail'
    if lk:
        coords = [[round(p['lon'], 6), round(p['lat'], 6)] for p in g]
        features.append({'type': 'Feature', 'properties': {'k': lk}, 'geometry': {'type': 'LineString', 'coordinates': coords}})
        # Ko'cha bo'yidagi daraxtlar (Olmaliq ko'chalari — teraklar, chinorlar)
        if lk in ('street', 'road2') and len(trees) < 9000:
            for (x1, y1), (x2, y2) in zip(coords, coords[1:]):
                seg = math.hypot((x2 - x1) * 84000, (y2 - y1) * 111320)
                n = int(seg // 22)
                for i in range(n):
                    f = (i + 0.5) / max(n, 1)
                    px, py = x1 + (x2 - x1) * f, y1 + (y2 - y1) * f
                    # perpendikulyar 7 m siljish, yo'lning ikki tomoniga navbatma-navbat
                    dx, dy = (y2 - y1), -(x2 - x1)
                    L = math.hypot(dx * 84000, dy * 111320) or 1
                    side = 1 if i % 2 else -1
                    ox, oy = dx / L * 7 * side, dy / L * 7 * side
                    if random.random() < 0.7:
                        plant(px + ox, py + oy)

# Domlar orasidagi hovlilar: bolalar maydonchasi / shiypon / gulzor nuqtalari.
# Har dom atrofida 14-26 m masofada, hech qaysi bino ichiga tushmaydigan joy.
dom_polys = [f['geometry']['coordinates'][0] for f in features if f['properties'].get('k') in ('dom', 'tower')]
all_bb = [(min(p[0] for p in b), min(p[1] for p in b), max(p[0] for p in b), max(p[1] for p in b), b) for b in buildings]
def free(x, y, pad):
    dl = pad / 84000
    for x1, y1, x2, y2, b in all_bb:
        if x1 - dl <= x <= x2 + dl and y1 - dl <= y <= y2 + dl:
            return False
    return True
yard_spots = []
for poly in dom_polys:
    cx, cy = centroid(poly)
    for _ in range(3):
        ang = random.uniform(0, 2 * math.pi)
        d = random.uniform(16, 28)
        x = cx + d * math.cos(ang) / 84000
        y = cy + d * math.sin(ang) / 111320
        if free(x, y, 6) and all(math.hypot((x - a) * 84000, (y - b) * 111320) > 25 for a, b, _k in yard_spots):
            yard_spots.append((x, y, random.choice(['playground', 'gazebo', 'flowers', 'flowers'])))
            break
for x, y, kind in yard_spots:
    features.append({'type': 'Feature', 'properties': {'k': 'yard', 't': kind, 'r': round(random.uniform(0, 3.14), 2)}, 'geometry': {'type': 'Point', 'coordinates': [round(x, 6), round(y, 6)]}})

# Oydin dehqon bozori — rangli rastalar (soyabonli kichik bloklar)
BAZAR = (69.59287, 40.86498)
for i in range(7):
    for j in range(5):
        x = BAZAR[0] + (i - 3) * 0.000085 + random.uniform(-0.00001, 0.00001)
        y = BAZAR[1] - 0.00025 + (j - 2) * 0.00007
        sq = 2.6
        dlat = sq / 111320
        dlon = sq / (111320 * math.cos(math.radians(y)))
        poly = [[round(x - dlon, 6), round(y - dlat, 6)], [round(x + dlon, 6), round(y - dlat, 6)], [round(x + dlon, 6), round(y + dlat, 6)], [round(x - dlon, 6), round(y + dlat, 6)]]
        poly.append(poly[0])
        features.append(poly_feat({'k': 'stall', 'v': random.randint(0, 4), 'h': 3.2}, poly))

# Shahar yashilligi: bo'sh joylarga daraxt (binodan >9 m, yo'ldan >8 m,
# eng yaqin binoga <110 m — faqat turar-joy hududlarida). OSM bu daraxtlarni
# bilmaydi, lekin Olmaliq hovlilari va ko'chalari haqiqatan yam-yashil.
MX, MY = 84000.0, 111320.0
CELL = 40.0
bgrid = {}
for b in buildings:
    xs = [p[0] * MX for p in b]; ys = [p[1] * MY for p in b]
    for gx in range(int(min(xs) // CELL), int(max(xs) // CELL) + 1):
        for gy in range(int(min(ys) // CELL), int(max(ys) // CELL) + 1):
            bgrid.setdefault((gx, gy), []).append((min(xs), min(ys), max(xs), max(ys)))
rgrid = {}
for f in features:
    if f['geometry']['type'] != 'LineString' or f['properties']['k'] not in ('road1', 'road2', 'street', 'rail', 'river'):
        continue
    c = f['geometry']['coordinates']
    for (x1, y1), (x2, y2) in zip(c, c[1:]):
        a = (x1 * MX, y1 * MY); bb = (x2 * MX, y2 * MY)
        for gx in range(int(min(a[0], bb[0]) // CELL) - 1, int(max(a[0], bb[0]) // CELL) + 2):
            for gy in range(int(min(a[1], bb[1]) // CELL) - 1, int(max(a[1], bb[1]) // CELL) + 2):
                rgrid.setdefault((gx, gy), []).append((a, bb))
def seg_dist(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy or 1
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L2))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)
def near_building(px, py, d):
    gx, gy = int(px // CELL), int(py // CELL)
    best = 1e9
    for ix in range(gx - 3, gx + 4):
        for iy in range(gy - 3, gy + 4):
            for x1, y1, x2, y2 in bgrid.get((ix, iy), ()):
                dx = max(x1 - px, 0, px - x2); dy = max(y1 - py, 0, py - y2)
                best = min(best, math.hypot(dx, dy))
                if best < d:
                    return best
    return best
def near_road(px, py, d):
    for a, b in rgrid.get((int(px // CELL), int(py // CELL)), ()):
        if seg_dist((px, py), a, b) < d:
            return True
    return False
filler = 0
if buildings:
    allx = [p[0] for b in buildings for p in b]; ally = [p[1] for b in buildings for p in b]
    y = min(ally)
    step = 15 / MY
    while y < max(ally):
        x = min(allx)
        while x < max(allx):
            jx = x + random.uniform(-0.3, 0.3) * 15 / MX
            jy = y + random.uniform(-0.3, 0.3) * step
            px, py = jx * MX, jy * MY
            if random.random() < 0.26:
                nb = near_building(px, py, 9)
                if 9 <= nb <= 110 and not near_road(px, py, 8):
                    plant(jx, jy)
                    filler += 1
            x += 15 / MX
        y += step
print('filler trees', filler)

# Bino ichiga tushib qolgan daraxtlarni olib tashlash (tezkor bbox + nuqta-ichida tekshiruvi)
bboxes = [(min(p[0] for p in b), min(p[1] for p in b), max(p[0] for p in b), max(p[1] for p in b), b) for b in buildings]
clean = []
for tr in trees:
    x, y = tr['geometry']['coordinates']
    hit = False
    for x1, y1, x2, y2, b in bboxes:
        if x1 <= x <= x2 and y1 <= y <= y2 and inside((x, y), b):
            hit = True
            break
    if not hit:
        clean.append(tr)

out = features + clean + labels
json.dump({'type': 'FeatureCollection', 'attribution': '© OpenStreetMap contributors (ODbL)', 'features': out}, open('public/olmaliq-3d.json', 'w'), separators=(',', ':'))
from collections import Counter
print(len(out), 'features;', len(clean), 'trees;', len(labels), 'labels;', Counter(f['properties']['k'] for f in features if f['geometry']['type'] == 'Polygon').most_common(14))
