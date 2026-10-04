import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useRoute, navigate } from './lib/router';
import { BottomNav } from './components/BottomNav';
import { ToastProvider } from './components/ui';
import { startParam } from './lib/telegram';
import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ListingScreen } from './screens/ListingScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { Blob } from './components/Blob';

// 3D xarita kutubxonasi og'ir (~200 KB) — faqat Xarita ochilganda yuklanadi.
// Deploy'dan keyin eski sahifada yangi bo'lak topilmasa — bir marta yangilanadi.
const MapScreen = lazy(() =>
  import('./screens/MapScreen')
    .then((m) => {
      try {
        sessionStorage.removeItem('kb_chunk_reload');
      } catch {
        /* xotira yopiq */
      }
      return { default: m.MapScreen };
    })
    .catch((err) => {
      let reloaded = false;
      try {
        reloaded = sessionStorage.getItem('kb_chunk_reload') === '1';
        sessionStorage.setItem('kb_chunk_reload', '1');
      } catch {
        /* xotira yopiq */
      }
      if (!reloaded) window.location.reload();
      throw err;
    }),
);
const MapFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <Blob shape="sphere" mood="scan" size={88} />
    <p className="font-label-lg text-label-lg text-on-surface-variant">Olmaliq yuklanmoqda…</p>
  </div>
);
import { RentScreen } from './screens/RentScreen';
import { RentDetailScreen } from './screens/RentDetailScreen';
import { AddRentScreen } from './screens/AddRentScreen';
import { SosScreen } from './screens/SosScreen';
import { AddScreen } from './screens/AddScreen';
import { SavedScreen } from './screens/SavedScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ChatScreen } from './screens/ChatScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';

const ONBOARDED_KEY = 'kimbor_onboarded_v1';

function readOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return true;
  }
}
export function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    /* brauzer xotirasi yopiq — har safar onboarding ko'rinmaydi, chunki state'da ham saqlanadi */
  }
}

/** Ekranlar xaritasi. Pastki menyu faqat asosiy tablarda ko'rinadi. */
const TAB_PATHS = new Set(['/', '/map', '/saved', '/profile']);

export const App: React.FC = () => {
  const route = useRoute();
  const [onboarded, setOnboarded] = useState(readOnboarded);

  // Botdan "startapp=listing_<id>" bilan ochilsa — to'g'ridan-to'g'ri o'sha sahifa.
  useEffect(() => {
    const sp = startParam();
    if (sp?.startsWith('listing_')) navigate(`/listing/${sp.slice(8)}`, { replace: true });
  }, []);

  if (!onboarded && route.path !== '/sos') {
    return (
      <ToastProvider>
        <OnboardingScreen
          route={route}
          onDone={() => {
            markOnboarded();
            setOnboarded(true);
          }}
        />
      </ToastProvider>
    );
  }

  const [root, id] = route.segments;
  let screen: React.ReactNode;
  switch (root) {
    case undefined:
      screen = <HomeScreen route={route} />;
      break;
    case 'search':
      screen = <SearchScreen route={route} />;
      break;
    case 'listing':
      screen = <ListingScreen route={route} key={id} />;
      break;
    case 'category':
      screen = <CategoryScreen route={route} key={route.path} />;
      break;
    case 'map':
      screen = (
        <Suspense fallback={<MapFallback />}>
          <MapScreen route={route} />
        </Suspense>
      );
      break;
    case 'rent':
      screen = id === 'add' || id === 'edit' ? <AddRentScreen route={route} key={route.path} /> : id ? <RentDetailScreen route={route} key={id} /> : <RentScreen route={route} />;
      break;
    case 'sos':
      screen = <SosScreen route={route} />;
      break;
    case 'add':
      screen = <AddScreen route={route} />;
      break;
    case 'saved':
      screen = <SavedScreen route={route} />;
      break;
    case 'profile':
      screen = <ProfileScreen route={route} />;
      break;
    case 'chat':
      screen = <ChatScreen route={route} />;
      break;
    default:
      screen = <HomeScreen route={route} />;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface max-w-md mx-auto relative">{screen}</div>
      {TAB_PATHS.has(route.path) && <BottomNav active={route.path} />}
    </ToastProvider>
  );
};
