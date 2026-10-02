import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import { api } from '../lib/api';
import type { Landmark, Listing } from '../lib/types';
import { TYPE_META } from '../lib/format';
import { haptic } from '../lib/telegram';
import { useAsync, useToast } from '../components/ui';
import { CloudIntro } from './map/CloudIntro';
import { MapSheet } from './map/MapSheet';
import { PIN_STYLE } from './map/pins';
import { Map3D, type Map3DHandle } from './map/Map3D';

const CtrlBtn: React.FC<{ icon: string; label: string; onClick: () => void; active?: boolean }> = ({ icon, label, onClick, active }) => (
  <button
    aria-label={label}
    onClick={() => {
      haptic('light');
      onClick();
    }}
    className={`w-12 h-12 flex items-center justify-center active:scale-90 transition-transform ${active ? 'text-primary' : 'text-on-surface'}`}
  >
    <span className={`material-symbols-outlined text-[24px] ${active ? 'fill' : ''}`}>{icon}</span>
  </button>
);

type Me = { lng: number; lat: number; acc: number; heading: number | null };

/** Jonli joylashuv: watchPosition; "kuzatish" rejimida xarita nuqta orqasidan yuradi. */
function useLiveLocation(onError: (msg: string) => void) {
  const [me, setMe] = useState<Me | null>(null);
  const watch = useRef<number | null>(null);
  const start = () => {
    if (!navigator.geolocation) return onError("Joylashuvni aniqlab bo'lmadi");
    if (watch.current != null) return;
    watch.current = navigator.geolocation.watchPosition(
      (p) => setMe({ lng: p.coords.longitude, lat: p.coords.latitude, acc: p.coords.accuracy, heading: p.coords.heading ?? null }),
      (e) => {
        onError(e.code === 1 ? 'Joylashuvga ruxsat berilmadi' : "Joylashuvni aniqlab bo'lmadi");
        if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
        watch.current = null;
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  };
  useEffect(() => {
    // Ruxsat avval berilgan bo'lsa — ochilishi bilan jonli joylashuv
    navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then((r) => r.state === 'granted' && start()).catch(() => {});
    return () => {
      if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { me, start };
}

export const MapScreen: React.FC<{ route: Route }> = () => {
  const toast = useToast();
  const lms = useAsync(() => api.landmarks(), []);
  const lst = useAsync(() => api.listings({}), []);
  const [type, setType] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const [selListing, setSelListing] = useState<Listing | null>(null);
  const [selArea, setSelArea] = useState<Landmark | null>(null);
  const [tilted, setTilted] = useState(true);
  const [follow, setFollow] = useState(false);
  const handle = useRef<Map3DHandle | null>(null);
  const { me, start } = useLiveLocation((m) => toast(m, 'error'));

  const all = lst.data?.items || [];
  const located = useMemo(() => all.filter((l) => l.location), [all]);
  const visible = useMemo(
    () => located.filter((l) => (!type || l.type === type) && (!openOnly || l.open.status === 'open')),
    [located, type, openOnly],
  );
  const areas = useMemo(() => (lms.data || []).filter((l) => Array.isArray(l.boundary) && l.boundary.length > 2), [lms.data]);
  const types = Object.keys(TYPE_META).filter((t) => located.some((l) => l.type === t));

  const inArea = (l: Listing, id: string) => l.landmark?.id === id || l.serviceAreas.some((a) => a.id === id);
  const area = selArea || (selListing?.landmark ? (lms.data || []).find((x) => x.id === selListing.landmark!.id) || null : null);
  const areaListings = area ? all.filter((l) => inArea(l, area.id)) : all.filter((l) => l.open.status === 'open');
  const featured = selListing || areaListings.find((l) => l.location) || areaListings[0] || null;
  const nearby = areaListings.filter((l) => l.id !== featured?.id);

  // Kuzatish rejimi: har yangi joylashuvda xarita foydalanuvchi orqasidan
  useEffect(() => {
    if (follow && me) handle.current?.flyTo(me.lng, me.lat);
  }, [me, follow]);

  const locate = () => {
    start();
    setFollow(true);
    if (me) handle.current?.flyTo(me.lng, me.lat);
    else toast('📍 Joylashuvingiz aniqlanmoqda…');
  };

  const chip = (key: string | null, label: string, n: number) => {
    const a = type === key;
    const st = key ? PIN_STYLE[key] : null;
    return (
      <button
        key={key || 'all'}
        onClick={() => {
          haptic('select');
          setType(key);
          setSelListing(null);
        }}
        className={`shrink-0 h-11 pl-2 pr-3 rounded-full flex items-center gap-2 font-label-lg text-label-lg transition-all active:scale-95 ${
          a ? 'bg-primary text-on-primary clay-fab' : 'bg-surface-container-lowest text-on-surface clay-card'
        }`}
      >
        {st ? (
          <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${st.color}22`, color: st.color }}>
            <span className="material-symbols-outlined fill text-[16px]">{st.icon}</span>
          </span>
        ) : (
          <span className="w-1" />
        )}
        {label}
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a ? 'bg-white/25' : 'bg-surface-container text-on-surface-variant'}`}>{n}</span>
      </button>
    );
  };

  return (
    <main className="flex flex-col w-full pb-28 bg-surface min-h-screen kb-map">
      {/* Jonli Olmaliq sarlavhasi */}
      <div className="px-margin pt-safe">
        <div className="mt-3 flex items-center justify-between gap-2 bg-surface-container-lowest rounded-full pl-2 pr-1.5 py-1.5 clay-card">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">explore</span>
            </span>
            <div className="min-w-0">
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Jonli Olmaliq</p>
              <p className="font-headline-sm text-headline-sm text-on-surface truncate">{area ? area.name : 'Butun shahar'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-surface-container-low font-label-md text-label-md text-on-surface">
              <span className={`w-2 h-2 rounded-full animate-pulse ${me ? 'bg-primary' : 'bg-tertiary-container'}`} /> {me ? 'Siz shu yerda' : 'Jonli'}
            </span>
            <button
              aria-label="Faqat hozir ochiqlar"
              onClick={() => {
                haptic('select');
                setOpenOnly((v) => !v);
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-all ${openOnly ? 'bg-tertiary text-white' : 'bg-primary text-on-primary'} clay-fab`}
            >
              <span className="material-symbols-outlined text-[22px]">{openOnly ? 'schedule' : 'tune'}</span>
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-margin px-margin py-3">
          {chip(null, 'Barchasi', located.length)}
          {types.map((t) => chip(t, TYPE_META[t].label, located.filter((l) => l.type === t).length))}
        </div>
      </div>

      {/* 3D diorama xarita */}
      <div className="relative isolate w-full h-[56vh] min-h-[360px] overflow-hidden">
        <Map3D
          listings={visible}
          areas={areas}
          selectedListingId={selListing?.id || null}
          selectedAreaId={area?.id || null}
          me={me}
          onSelectListing={(l) => {
            setSelListing(l);
            setSelArea(null);
            setFollow(false);
            handle.current?.flyTo(l.location!.lng, l.location!.lat);
          }}
          onSelectArea={(a) => {
            setSelArea(a);
            setSelListing(null);
          }}
          onReady={(h) => (handle.current = h)}
          onUserMove={() => setFollow(false)}
        />

        <div className="absolute right-3 top-3 z-[5] flex flex-col gap-3">
          <div className="rounded-full bg-surface-container-lowest clay-card">
            <CtrlBtn icon={follow ? 'navigation' : 'my_location'} label="Men qayerdaman" active={follow} onClick={locate} />
          </div>
          <div className="rounded-full bg-surface-container-lowest clay-card flex flex-col">
            <CtrlBtn icon="add" label="Yaqinlashtirish" onClick={() => handle.current?.zoomIn()} />
            <CtrlBtn icon="remove" label="Uzoqlashtirish" onClick={() => handle.current?.zoomOut()} />
          </div>
          <div className="rounded-full bg-surface-container-lowest clay-card">
            <CtrlBtn
              icon={tilted ? 'map' : 'view_in_ar'}
              label={tilted ? 'Tepadan ko\'rish' : '3D ko\'rinish'}
              active={tilted}
              onClick={() => setTilted(handle.current?.toggleTilt() ?? tilted)}
            />
          </div>
        </div>

        {lst.error && (
          <div className="absolute top-3 left-3 right-20 z-[5] bg-surface-container-lowest/95 rounded-full px-3 py-2 font-label-md text-label-md text-error text-center shadow-sm">
            Ma'lumot yuklanmadi
          </div>
        )}
        <CloudIntro />
      </div>

      {/* Pastki karta */}
      <div className="px-margin">
        <MapSheet
          areaTitle={area ? area.name : 'Olmaliq shahri'}
          areaSubtitle={area ? 'Olmaliq' : openOnly ? 'Hozir ochiq' : 'Hozir ochiqlar'}
          featured={featured}
          nearby={nearby}
          nearbyTitle={area ? 'Yana shu mahallada' : 'Hozir ochiq'}
          onSeeAll={area ? () => navigate(`/category/ALL?landmarkId=${area.id}`) : undefined}
        />
      </div>
    </main>
  );
};
