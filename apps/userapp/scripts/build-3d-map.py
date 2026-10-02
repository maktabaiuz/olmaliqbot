"""OSM (Overpass JSON) → public/olmaliq-3d.json — 3D diorama xarita uchun GeoJSON.

Ishlatish:  python3 scripts/build-3d-map.py osm.json
Overpass so'rovi (bbox 40.80,69.54,40.88,69.66): building, leisure, landuse,
natural, waterway, highway, railway — "out tags geom".
Ma'lumot © OpenStreetMap contributors (ODbL).

Har obyekt properties.k (tur) va binolar uchun h (balandlik, m) oladi.
Parklarga daraxtlar (kichik 8 burchakli "toj"lar) avtomatik ekiladi.
"""
import json, math, random, sys

random.seed(7)
src = json.load(open(sys.argv[1]))
features = []


def levels(t):
    v = str(t.get('building:levels', '')).strip()
    try:
        return float(v)
    except ValueError:
        return 0


def building_kind_height(t):
    b = t['building']
    lv = levels(t)
    if b == 'house':
        return 'house', 4.5
    if b == 'apartments' or lv >= 4:
        return 'dom', max(lv, 5) * 3.0
    if b in ('school', 'kindergarten', 'university', 'college'):
        return 'school', max(lv, 3) * 3.4
    if b in ('industrial', 'warehouse', 'construction', 'roof'):
        return 'industry', max(lv, 3) * 4.0
    return 'bld', (lv * 3.0) if lv else 6.5


def area_kind(t):
    if t.get('leisure') == 'stadium':
        return 'stadium'
    if t.get('leisure') == 'pitch':
        return 'pitch'
    if t.get('leisure') in ('park', 'garden', 'playground', 'water_park') or t.get('landuse') in ('forest', 'orchard') or t.get('natural') == 'wood':
        return 'park'
    if t.get('landuse') in ('grass', 'recreation_ground'):
        return 'grass'
    if t.get('landuse') == 'cemetery':
        return 'cemetery'
    if t.get('natural') == 'water':
        return 'water'
    return None


def line_kind(t):
    if 'waterway' in t:
        return 'river'
    h = t.get('highway')
    if h in ('motorway', 'trunk', 'primary', 'primary_link'):
        return 'road1'
    if h in ('secondary', 'secondary_link', 'tertiary'):
        return 'road2'
    if h:
        return 'street'
    if t.get('railway') == 'rail':
        return 'rail'
    return None


def ring(geom):
    pts = [[round(p['lon'], 6), round(p['lat'], 6)] for p in geom]
    if pts[0] != pts[-1]:
        pts.append(pts[0])
    return pts


def inside(pt, poly):
    x, y = pt
    c = False
    for i in range(len(poly) - 1):
        x1, y1 = poly[i]
        x2, y2 = poly[i + 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1:
            c = not c
    return c


def octagon(lon, lat, r_m):
    dlat = r_m / 111320
    dlon = r_m / (111320 * math.cos(math.radians(lat)))
    pts = [[round(lon + dlon * math.cos(a), 6), round(lat + dlat * math.sin(a), 6)] for a in [i * math.pi / 4 for i in range(8)]]
    return pts + [pts[0]]


trees = 0
for e in src['elements']:
    t = e.get('tags', {})
    g = e.get('geometry')
    if not g or len(g) < 2:
        continue
    if 'building' in t and len(g) >= 3:
        k, h = building_kind_height(t)
        features.append({'type': 'Feature', 'properties': {'k': k, 'h': round(h, 1)}, 'geometry': {'type': 'Polygon', 'coordinates': [ring(g)]}})
        continue
    ak = area_kind(t)
    if ak and len(g) >= 3:
        poly = ring(g)
        props = {'k': ak}
        if ak == 'stadium' and t.get('name'):
            props['name'] = t['name']
        features.append({'type': 'Feature', 'properties': props, 'geometry': {'type': 'Polygon', 'coordinates': [poly]}})
        if ak == 'park' and trees < 4000:
            xs = [p[0] for p in poly]
            ys = [p[1] for p in poly]
            step = 0.00018  # ~15-20 m
            y = min(ys)
            while y < max(ys) and trees < 4000:
                x = min(xs)
                while x < max(xs):
                    jx = x + random.uniform(-step / 3, step / 3)
                    jy = y + random.uniform(-step / 3, step / 3)
                    if inside((jx, jy), poly):
                        features.append({'type': 'Feature', 'properties': {'k': 'tree', 'h': round(random.uniform(5, 9), 1)}, 'geometry': {'type': 'Polygon', 'coordinates': [octagon(jx, jy, random.uniform(2.5, 4))]}})
                        trees += 1
                    x += step
                y += step
        continue
    lk = line_kind(t)
    if lk:
        features.append({'type': 'Feature', 'properties': {'k': lk}, 'geometry': {'type': 'LineString', 'coordinates': [[round(p['lon'], 6), round(p['lat'], 6)] for p in g]}})

json.dump({'type': 'FeatureCollection', 'attribution': '© OpenStreetMap contributors (ODbL)', 'features': features}, open('public/olmaliq-3d.json', 'w'), separators=(',', ':'))
print(len(features), 'features,', trees, 'trees')
