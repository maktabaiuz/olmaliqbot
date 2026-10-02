import React, { useEffect, useRef, useState } from 'react';
import type { Route } from '../lib/router';
import { goBack, navigate } from '../lib/router';
import { api } from '../lib/api';
import type { Category } from '../lib/types';
import { haptic } from '../lib/telegram';
import { useAsync, useToast, ErrorView } from '../components/ui';
import { FocusView } from './search/FocusView';
import { VoiceOverlay } from './search/VoiceOverlay';
import { NotFound, Results, SearchLoading, UnderstoodChips } from './search/Results';
import { getRecent, pushRecent, saveRecent, speechSupported, useVoice } from './search/voice';

export const SearchScreen: React.FC<{ route: Route }> = ({ route }) => {
  const q = (route.query.get('q') || '').trim();
  const [text, setText] = useState(q);
  const [focused, setFocused] = useState(!q);
  const [recent, setRecent] = useState<string[]>(getRecent);
  const [categories, setCategories] = useState<Category[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const res = useAsync(() => (q ? api.search(q) : Promise.resolve(null)), [q]);

  useEffect(() => {
    setText(q);
    setFocused(!q);
    if (q) setRecent(pushRecent(q));
  }, [q]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    api.home().then((h) => setPopular(h.popular)).catch(() => {});
  }, []);

  const submit = (value: string) => {
    const v = value.trim();
    if (!v) return;
    haptic('light');
    inputRef.current?.blur();
    setFocused(false);
    if (v === q) res.reload();
    else navigate(`/search?q=${encodeURIComponent(v)}`, { replace: true });
  };

  const voice = useVoice((t) => {
    setText(t);
    submit(t);
  });
  const canVoice = speechSupported();

  useEffect(() => {
    if (route.query.get('voice') === '1' && canVoice) {
      navigate('/search', { replace: true });
      voice.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeChip = (word: string) => {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const next = text.replace(re, '').replace(/\s+/g, ' ').trim();
    haptic('light');
    if (!next) {
      setText('');
      navigate('/search', { replace: true });
    } else submit(next);
  };

  const showFocus = focused || !q;
  const data = res.data;

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased flex flex-col min-h-screen pt-safe">
      <div className="px-margin py-space-sm flex items-center gap-space-sm sticky top-0 z-30 bg-surface/90 backdrop-blur-md">
        <button onClick={() => { haptic('light'); goBack(); }} aria-label="Orqaga" className="w-10 h-10 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center text-on-surface active:scale-95 transition-transform flex-shrink-0" type="button">
          <span className="material-symbols-outlined text-[22px]">arrow_back_ios_new</span>
        </button>
        <form
          className="flex-1 flex items-center bg-surface-container-lowest rounded-full px-3.5 py-2 shadow-sm relative min-w-0"
          onSubmit={(e) => {
            e.preventDefault();
            submit(text);
          }}
        >
          <span className="material-symbols-outlined text-primary text-[20px] mr-2">search</span>
          <input
            ref={inputRef}
            autoFocus={!q}
            enterKeyHint="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Kim kerak? Santexnik, taksi..."
            className="flex-1 min-w-0 bg-transparent font-body-md text-body-md text-on-surface outline-none border-none placeholder:text-outline"
            type="search"
          />
          {text && (
            <button
              aria-label="Tozalash"
              onClick={() => {
                setText('');
                setFocused(true);
                inputRef.current?.focus();
              }}
              className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mr-1.5 active:scale-90 transition-transform shrink-0"
              type="button"
            >
              <span className="material-symbols-outlined text-[13px]">close</span>
            </button>
          )}
          {canVoice && (
            <button aria-label="Ovozli qidiruv" onClick={() => { haptic('light'); voice.start(); }} className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary active:scale-95 transition-transform shrink-0" type="button">
              <span className="material-symbols-outlined fill text-[16px]">mic</span>
            </button>
          )}
        </form>
        {showFocus && text.trim() ? (
          <button onClick={() => submit(text)} className="text-primary font-label-lg text-label-lg px-1 py-1 active:scale-95 transition-transform flex-shrink-0" type="button">
            Qidirish
          </button>
        ) : showFocus && q ? (
          <button onClick={() => { setText(q); setFocused(false); inputRef.current?.blur(); }} className="text-primary font-label-lg text-label-lg px-1 py-1 active:scale-95 flex-shrink-0" type="button">
            Bekor qilish
          </button>
        ) : null}
      </div>

      <main className="flex-1 flex flex-col relative w-full pb-28 bg-surface">
        {showFocus ? (
          <FocusView
            text={text}
            categories={categories}
            recent={recent}
            popular={popular}
            onPick={(v) => {
              setText(v);
              submit(v);
            }}
            onRemoveRecent={(v) => {
              const next = recent.filter((x) => x !== v);
              saveRecent(next);
              setRecent(next);
            }}
            onClearRecent={() => {
              saveRecent([]);
              setRecent([]);
            }}
          />
        ) : (
          <div className="px-margin flex flex-col space-y-space-lg">
            {data && <UnderstoodChips u={data.understood} onRemove={removeChip} />}
            {res.loading ? (
              <SearchLoading />
            ) : res.error ? (
              <ErrorView error={res.error} onRetry={res.reload} />
            ) : data && data.items.length === 0 && !data.service && !data.emergency ? (
              <NotFound popular={popular} onPick={(v) => { setText(v); submit(v); }} />
            ) : data ? (
              <>
                <Results
                  data={data}
                  onFeedback={() => {
                    api.searchFeedback(q, data.items[0]?.id).catch(() => {});
                    toast('Rahmat! Tekshirib chiqamiz', 'success');
                  }}
                />
                {data.items.length === 0 && <NotFound popular={popular} onPick={(v) => { setText(v); submit(v); }} />}
              </>
            ) : null}
          </div>
        )}
      </main>

      {voice.listening && (
        <VoiceOverlay
          text={voice.text}
          examples={popular}
          onClose={voice.stop}
          onDone={voice.finish}
          onExample={(v) => {
            voice.stop();
            setText(v);
            submit(v);
          }}
        />
      )}
    </div>
  );
};
