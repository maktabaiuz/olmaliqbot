import React, { useRef, useState } from 'react';
import type { Route } from '../lib/router';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { useAsync } from '../components/ui';
import { Blob } from '../components/Blob';
import { SubscriptionGate } from './onboarding/SubscriptionGate';

const MAHALLA_KEY = 'kimbor_mahalla';

function readMahalla(): string | null {
  try {
    return localStorage.getItem(MAHALLA_KEY);
  } catch {
    return null;
  }
}

const Feature: React.FC<{ emoji: string; tint: string; title: string; text: string; delay: number }> = ({ emoji, tint, title, text, delay }) => (
  <div className="flex items-center p-3.5 bg-surface-container-lowest rounded-2xl shadow-sm shadow-primary/5 anim-slide-up" style={{ animationDelay: `${delay}ms` }}>
    <div className={`w-11 h-11 rounded-xl ${tint} flex items-center justify-center flex-shrink-0 mr-3`}>
      <span className="text-xl leading-none">{emoji}</span>
    </div>
    <div className="flex flex-col min-w-0">
      <span className="font-headline-sm text-headline-sm text-on-surface leading-tight">{title}</span>
      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{text}</span>
    </div>
  </div>
);

const Hero: React.FC<{ children: React.ReactNode; badge: string }> = ({ children, badge }) => (
  <div className="relative w-full flex items-center justify-center my-space-xs">
    <div className="absolute w-56 h-56 rounded-full bg-primary-fixed/60 blur-2xl -z-10 transform -translate-y-2" />
    <div className="absolute w-44 h-44 rounded-full bg-tertiary-fixed/30 blur-xl -z-10 translate-x-8 translate-y-6" />
    <div className="relative w-64 h-56 flex items-end justify-center gap-2">
      {children}
      <div className="absolute -top-1 -right-1 bg-surface-container-lowest px-3 py-1.5 rounded-full shadow-lg shadow-primary/10 flex items-center space-x-1.5 transform rotate-6 animate-pulse">
        <span className="font-label-md text-label-md text-primary font-bold">{badge}</span>
      </div>
    </div>
  </div>
);

export const OnboardingScreen: React.FC<{ route: Route; onDone: () => void }> = ({ onDone }) => {
  const [slide, setSlide] = useState(0);
  const [gate, setGate] = useState(false);
  const [mahalla, setMahalla] = useState<string | null>(readMahalla);
  const scroller = useRef<HTMLDivElement>(null);
  const landmarks = useAsync(() => api.landmarks(), []);
  const [q, setQ] = useState('');
  const areas = (landmarks.data || [])
    .filter((l) => !l.name.toLowerCase().includes('butun shahar'))
    .filter((l) => !q.trim() || l.name.toLowerCase().includes(q.trim().toLowerCase()));

  const goTo = (i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    setSlide(i);
  };
  const next = () => {
    haptic('light');
    if (slide < 2) goTo(slide + 1);
    else setGate(true);
  };
  const skip = () => {
    haptic('light');
    setGate(true);
  };
  const pick = (id: string) => {
    haptic('select');
    setMahalla(id);
    try {
      localStorage.setItem(MAHALLA_KEY, id);
    } catch {
      /* saqlab bo'lmadi — muhim emas */
    }
  };

  if (gate) return <SubscriptionGate onDone={onDone} />;

  return (
    <main className="min-h-screen bg-background flex flex-col max-w-md mx-auto pt-safe pb-safe">
      <div className="flex items-center justify-between py-space-sm px-margin w-full">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-on-primary text-[18px]">location_on</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-primary tracking-tight leading-none">Kim bor?</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest leading-none mt-0.5">Olmaliq</span>
          </div>
        </div>
        <button onClick={skip} className="py-1 px-3 rounded-full bg-surface-container-high/60 active:scale-95 transition-transform text-on-surface-variant font-label-md text-label-md" type="button">
          O'tkazib yuborish
        </button>
      </div>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          if (i !== slide) setSlide(i);
        }}
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {/* 1 */}
        <section className="w-full shrink-0 snap-center px-margin flex flex-col">
          <Hero badge="👋 Salom!">
            <Blob shape="sphere" mood="hop" size={150} />
          </Hero>
          <div className="text-center px-2 mt-1 mb-space-md anim-slide-up">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-tight mb-2">
              Kim kerak bo'lsa — <br />
              <span className="text-primary underline decoration-secondary-container decoration-wavy decoration-2 underline-offset-4">yozing, topamiz</span> 🔍
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant px-1 leading-relaxed">Olmaliqdagi har qanday usta, xizmat yoki do'konni bir necha soniyada toping.</p>
          </div>
          <div className="flex flex-col space-y-space-sm w-full">
            <Feature emoji="⚡" tint="bg-secondary-container/30" title="Tezkor qidiruv" text="Bir necha soniyada bevosita bog'laning" delay={80} />
            <Feature emoji="📍" tint="bg-tertiary-fixed/30" title="Yaqin atrofdan" text="O'z mahallangizdagi ustalar va do'konlar" delay={160} />
          </div>
        </section>
        {/* 2 */}
        <section className="w-full shrink-0 snap-center px-margin flex flex-col">
          <Hero badge="✅ Tekshirilgan">
            <Blob shape="pill" mood="idle" size={120} />
            <Blob shape="sphere" mood="hop" size={90} delay={200} />
          </Hero>
          <div className="text-center px-2 mt-1 mb-space-md anim-slide-up">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-tight mb-2">
              Faqat <span className="text-tertiary">ishonchli</span> raqamlar
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant px-1 leading-relaxed">Har bir ma'lumot admin tomonidan tekshiriladi. Bazada aniq ma'lumot bo'lmasa — taxmin qilmaymiz.</p>
          </div>
          <div className="flex flex-col space-y-space-sm w-full">
            <Feature emoji="🛡️" tint="bg-tertiary-fixed/30" title="Admin tekshiruvi" text="Yangi e'lonlar moderatsiyadan o'tadi" delay={80} />
            <Feature emoji="👍" tint="bg-secondary-container/30" title="Haqiqiy baholar" text="Foydalanuvchilar fikri asosida tavsiya" delay={160} />
          </div>
        </section>
        {/* 3 */}
        <section className="w-full shrink-0 snap-center px-margin flex flex-col">
          <Hero badge="🏘️ Mahallangiz">
            <Blob shape="triangle" mood="idle" size={110} />
            <Blob shape="cloud" mood="hop" size={110} delay={200} />
          </Hero>
          <div className="text-center px-2 mt-1 mb-space-md anim-slide-up">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-tight mb-2">Mahallangizni tanlang</h1>
            <p className="font-body-md text-body-md text-on-surface-variant px-1 leading-relaxed">Yaqin atrofdagi natijalarni birinchi ko'rsatamiz. Keyin profilda o'zgartirish mumkin.</p>
          </div>
          <div className="flex items-center bg-surface-container-lowest rounded-full px-4 h-11 shadow-sm gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-[20px]">search</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mahalla nomi…" className="flex-1 bg-transparent outline-none font-body-md text-body-md text-on-surface placeholder:text-outline" />
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pb-2 no-scrollbar">
            {landmarks.loading && <span className="font-body-sm text-body-sm text-on-surface-variant col-span-2 text-center">Yuklanmoqda…</span>}
            {areas.map((l) => (
              <button
                key={l.id}
                onClick={() => pick(l.id)}
                className={`h-11 px-3 rounded-full font-label-md text-label-md text-left truncate active:scale-95 transition-all flex items-center gap-1 ${
                  mahalla === l.id ? 'bg-primary text-on-primary shadow-lg shadow-primary/30' : 'bg-surface-container-lowest text-on-surface shadow-sm'
                }`}
              >
                {mahalla === l.id && <span className="material-symbols-outlined text-[16px]">check</span>}
                <span className="truncate">{l.name.replace(/ MFY$/, '')}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="w-full flex flex-col items-center pt-1 px-margin pb-4">
        <div className="flex items-center space-x-2 mb-space-lg">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              aria-label={`${i + 1}-sahifa`}
              onClick={() => goTo(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${slide === i ? 'w-7 bg-primary-container shadow-sm shadow-primary/40' : 'w-2.5 bg-outline-variant/60'}`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="w-full py-4 px-6 rounded-full bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center space-x-2 shadow-lg shadow-primary/30 active:scale-[0.97] transition-all"
          type="button"
        >
          <span>{slide < 2 ? 'Keyingisi' : 'Boshlash'}</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>
    </main>
  );
};
