"""OSM (Overpass JSON) → public/olmaliq-pixel.json — pixel xarita uchun ixcham ma'lumot.

Ishlatish:  python3 scripts/build-pixel-map.py osm.json
Overpass so'rovi: Olmaliq (40.80,69.54,40.88,69.66) — building, leisure, landuse,
natural, waterway, highway, railway. Ma'lumot © OpenStreetMap (ODbL).

Har bir obyekt: [kind, coords(flat, 1e-5 aniqlikda int), extra]
kind: house|dom|school|industry|bld|stadium|pitch|park|grass|cemetery|water|river|
      road1|road2|road3|street|rail
"""
import json, sys

src = json.load(open(sys.argv[1]))
out = []

def kind_of(t):
    if 'building' in t:
        b = t['building']
        lv = int(float(t.get('building:levels', '0') or 0)) if str(t.get('building:levels', '')).replace('.', '').isdigit() else 0
        if b == 'house': return 'house'
        if b in ('apartments',) or lv >= 4: return 'dom'
        if b in ('school', 'kindergarten', 'university', 'college'): return 'school'
        if b in ('industrial', 'warehouse', 'construction', 'roof'): return 'industry'
        return 'bld'
    if t.get('leisure') == 'stadium': return 'stadium'
    if t.get('leisure') == 'pitch': return 'pitch'
    if t.get('leisure') in ('park', 'garden', 'playground', 'water_park'): return 'park'
    if t.get('landuse') in ('forest', 'orchard') or t.get('natural') == 'wood': return 'park'
    if t.get('landuse') in ('grass', 'recreation_ground'): return 'grass'
    if t.get('landuse') == 'cemetery': return 'cemetery'
    if t.get('natural') == 'water': return 'water'
    if 'waterway' in t: return 'river'
    h = t.get('highway')
    if h in ('motorway', 'trunk', 'primary', 'primary_link'): return 'road1'
    if h in ('secondary', 'secondary_link'): return 'road2'
    if h in ('tertiary',): return 'road3'
    if h: return 'street'
    if t.get('railway') == 'rail': return 'rail'
    return None

for e in src['elements']:
    t = e.get('tags', {})
    k = kind_of(t)
    g = e.get('geometry')
    if not k or not g: continue
    flat = []
    for p in g:
        flat += [round(p['lat'] * 1e5), round(p['lon'] * 1e5)]
    item = [k, flat]
    if k == 'stadium' and t.get('name'): item.append(t['name'])
    out.append(item)

# Chizish tartibi: yer qoplami → suv → yo'llar → binolar
ORDER = ['grass', 'park', 'cemetery', 'water', 'river', 'pitch', 'stadium', 'rail', 'street', 'road3', 'road2', 'road1', 'industry', 'bld', 'school', 'house', 'dom']
out.sort(key=lambda x: ORDER.index(x[0]))
json.dump({'attribution': '© OpenStreetMap contributors (ODbL)', 'f': out}, open('public/olmaliq-pixel.json', 'w'), separators=(',', ':'))
print(len(out), 'features')
