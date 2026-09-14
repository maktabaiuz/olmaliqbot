import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface BotMessagesEditorScreenProps {
  onBack: () => void;
}

type Category = 'REPLY' | 'EMERGENCY' | 'OTHER';
type Lang = 'lotin' | 'kirill' | 'rus';

interface BotMessageRow {
  id: string;
  key: string;
  category: Category;
  title: string;
  tokens: string[];
  textLatin: string;
  textCyrillic: string;
  textRussian: string;
  updatedAt: string;
}

const IOS_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif';

const LANG_FIELD: Record<Lang, keyof BotMessageRow> = {
  lotin: 'textLatin',
  kirill: 'textCyrillic',
  rus: 'textRussian',
};

const CATEGORY_LABEL: Record<Category, string> = {
  REPLY: 'Javoblar',
  EMERGENCY: 'Favqulodda',
  OTHER: 'Boshqa',
};

const SAMPLE_VALUES: Record<string, string> = {
  kasb_emoji: '🔧',
  kasb: 'Santexnik',
  ism: 'Botir Aliyev',
  tasdiq: '✅',
  moljal: 'Korzinka orqasi',
  ish_vaqti: '09:00–18:00',
  belgilar: 'Uyga boradi · Kafolat',
  xizmatlar: 'Kran, trubka tuzatish',
  narx: "50 000 – 150 000 so'm",
  tavsif: 'Tez va sifatli xizmat',
  telefon: '+998 90 123 45 67',
  mahalliy_gaz: '+998 71 234 56 78',
  mahalliy_suv: '+998 71 987 65 43',
  mahalliy_elektr: '+998 71 111 22 33',
  mahalliy_issiqlik: '+998 71 444 55 66',
  mahalliy_hokimiyat: '+998 71 777 88 99',
  santexnik_royxati: '1. Alisher (+998 91 111 22 33)',
  elektrik_royxati: '1. Sardor (+998 90 222 33 44)',
};

// Backend'dagi renderLineTemplate bilan BIR XIL mantiq — faqat ko'rish
// (preview) uchun, admin haqiqiy botda qanday ko'rinishini oldindan
// ko'rishi kerak.
function renderLineTemplatePreview(template: string, values: Record<string, string>): string {
  const lines = template.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const tokens = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    if (tokens.length === 0) {
      out.push(line);
      continue;
    }
    const allPresent = tokens.every((t) => values[t] && values[t].trim().length > 0);
    if (!allPresent) continue;
    let rendered = line;
    for (const t of tokens) rendered = rendered.split(`{${t}}`).join(values[t]);
    out.push(rendered);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const FORMAT_BUTTONS: { label: string; icon: string; open: string; close: string }[] = [
  { label: 'Qalin', icon: 'format_bold', open: '<b>', close: '</b>' },
  { label: 'Kursiv', icon: 'format_italic', open: '<i>', close: '</i>' },
  { label: 'Tagcha chizilgan', icon: 'format_underlined', open: '<u>', close: '</u>' },
  { label: "Ustidan chizilgan", icon: 'format_strikethrough', open: '<s>', close: '</s>' },
  { label: 'Spoyler', icon: 'visibility_off', open: '<tg-spoiler>', close: '</tg-spoiler>' },
  { label: 'Kod', icon: 'code', open: '<code>', close: '</code>' },
  { label: 'Iqtibos', icon: 'format_quote', open: '<blockquote>', close: '</blockquote>' },
];

export const BotMessagesEditorScreen: React.FC<BotMessagesEditorScreenProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<BotMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('REPLY');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [activeLang, setActiveLang] = useState<Lang>('lotin');
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [emojiId, setEmojiId] = useState('');
  const [emojiFallback, setEmojiFallback] = useState('');
  const [showEmojiHelp, setShowEmojiHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = () => {
    setLoading(true);
    const initData = window.Telegram?.WebApp?.initData || '';
    fetch('/api/admin/bot-messages', { headers: { 'x-init-data': initData } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: BotMessageRow[]) => {
        setMessages(data || []);
        const firstReply = (data || []).find((m) => m.category === 'REPLY');
        if (firstReply) setSelectedKey(firstReply.key);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const currentMessage = messages.find((m) => m.key === selectedKey) || null;
  const inCategory = messages.filter((m) => m.category === activeCategory);

  const handleUpdateText = (val: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.key === selectedKey ? { ...m, [LANG_FIELD[activeLang]]: val } : m))
    );
    setSaveError(null);
  };

  const currentTextValue = currentMessage ? (currentMessage[LANG_FIELD[activeLang]] as string) : '';

  const wrapSelection = (open: string, close: string) => {
    const el = textareaRef.current;
    if (!el || !currentMessage) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = currentTextValue;
    const newValue = value.slice(0, start) + open + value.slice(start, end) + close + value.slice(end);
    handleUpdateText(newValue);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + open.length;
      el.selectionEnd = end + open.length;
    });
  };

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    if (!el || !currentMessage) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = currentTextValue;
    const newValue = value.slice(0, start) + text + value.slice(end);
    handleUpdateText(newValue);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.selectionStart = pos;
      el.selectionEnd = pos;
    });
  };

  const insertToken = (token: string) => {
    insertAtCursor(`{${token}}`);
  };

  const insertCustomEmoji = () => {
    const id = emojiId.trim();
    const fallback = emojiFallback.trim() || '⭐';
    if (!id) {
      showToastMsg("Avval emoji ID kiriting");
      return;
    }
    insertAtCursor(`<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`);
    setEmojiId('');
    setEmojiFallback('');
  };

  const livePreview = useMemo(() => {
    if (!currentMessage) return '';
    return renderLineTemplatePreview(currentTextValue, SAMPLE_VALUES);
  }, [currentTextValue, currentMessage]);

  const handleSave = async () => {
    if (!currentMessage) return;
    setSaving(true);
    setSaveError(null);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`/api/admin/bot-messages/${currentMessage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-init-data': initData },
        body: JSON.stringify({
          textLatin: currentMessage.textLatin,
          textCyrillic: currentMessage.textCyrillic,
          textRussian: currentMessage.textRussian,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToastMsg('✅ Saqlandi — bot endi shu matnni ishlatadi');
      } else {
        setSaveError(data.message || "Saqlashda xatolik yuz berdi");
      }
    } catch {
      setSaveError('Aloqa xatosi.');
    } finally {
      setSaving(false);
    }
  };

  const CATEGORIES: Category[] = ['REPLY', 'EMERGENCY', 'OTHER'];

  return (
    <div className="animate-fade-in -mx-4 -mt-2 pb-16" style={{ fontFamily: IOS_FONT }}>
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1E] text-white font-medium text-[13px] px-4 py-2.5 rounded-full shadow-2xl">
          {toast}
        </div>
      )}

      {/* Nav bar */}
      <div className="px-4 pt-1 pb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-[#007AFF] dark:text-[#0A84FF] text-[15px] font-normal -ml-1.5 active:opacity-40"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          Orqaga
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !currentMessage}
          className="text-[15px] font-semibold text-[#007AFF] dark:text-[#0A84FF] active:opacity-40 disabled:opacity-40"
        >
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>

      <div className="px-4 pb-3">
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-on-surface dark:text-white leading-tight">
          Bot Matnlari
        </h1>
        <p className="text-[13px] text-[#8E8E93] leading-snug mt-0.5">
          Bu yerda tahrirlangan matn botning haqiqiy javobida ishlatiladi (o'zgarish ~1 daqiqada kuchga kiradi).
        </p>
      </div>

      {loading ? (
        <div className="px-4 space-y-3">
          <div className="h-10 bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded-[10px] animate-pulse" />
          <div className="h-40 bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded-[10px] animate-pulse" />
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {/* Category segmented control */}
          <div className="flex bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded-[10px] p-[2px]">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setActiveCategory(c);
                  const first = messages.find((m) => m.category === c);
                  if (first) setSelectedKey(first.key);
                }}
                className={`flex-1 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors ${
                  activeCategory === c
                    ? 'bg-white dark:bg-[#3A3A3C] text-on-surface dark:text-white shadow-sm'
                    : 'text-[#8E8E93]'
                }`}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>

          {/* Template picker within category */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {inCategory.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedKey(m.key)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                  selectedKey === m.key
                    ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                    : 'bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-on-surface dark:text-white'
                }`}
              >
                {m.title}
              </button>
            ))}
          </div>

          {currentMessage && (
            <>
              {activeCategory === 'REPLY' && (
                <div className="flex items-start gap-2 bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 rounded-[10px] px-3 py-2.5">
                  <span className="material-symbols-outlined text-[16px] text-[#007AFF] dark:text-[#0A84FF] mt-0.5">info</span>
                  <p className="text-[12px] text-on-surface dark:text-white leading-snug">
                    "Yana ko'rish" tugmasi va tartib-belgilar (🥈🥉) shablon matni EMAS — bot ularni avtomatik qo'shadi, bu yerda tahrirlanmaydi.
                  </p>
                </div>
              )}

              {/* Language segmented control */}
              <div className="flex bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded-[10px] p-[2px]">
                {([
                  { id: 'lotin', label: "O'zbek (Lotin)" },
                  { id: 'kirill', label: 'Ўзбекча (Кирилл)' },
                  { id: 'rus', label: 'Русский' },
                ] as { id: Lang; label: string }[]).map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setActiveLang(lang.id)}
                    className={`flex-1 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors ${
                      activeLang === lang.id
                        ? 'bg-white dark:bg-[#3A3A3C] text-on-surface dark:text-white shadow-sm'
                        : 'text-[#8E8E93]'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {/* Dynamic tokens */}
              {currentMessage.tokens.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-1.5">
                    Dinamik tokenlar (bosib joylashtiring)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentMessage.tokens.map((tok) => (
                      <button
                        key={tok}
                        onClick={() => insertToken(tok)}
                        className="bg-[#AF52DE]/12 text-[#AF52DE] text-[12px] font-mono px-2.5 py-1 rounded-[8px] active:opacity-60"
                      >
                        + {`{${tok}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Formatting toolbar */}
              <div>
                <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-1.5">
                  Telegram formatlash
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {FORMAT_BUTTONS.map((f) => (
                    <button
                      key={f.label}
                      title={f.label}
                      onClick={() => wrapSelection(f.open, f.close)}
                      className="w-9 h-9 rounded-[8px] bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] flex items-center justify-center active:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px] text-on-surface dark:text-white">{f.icon}</span>
                    </button>
                  ))}
                  <button
                    title="Havola"
                    onClick={() => {
                      const url = window.prompt('Havola manzili (URL):', 'https://');
                      if (url) wrapSelection(`<a href="${url}">`, '</a>');
                    }}
                    className="w-9 h-9 rounded-[8px] bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] flex items-center justify-center active:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px] text-on-surface dark:text-white">link</span>
                  </button>
                  <button
                    title="Premium emoji"
                    onClick={() => setShowEmojiHelp((v) => !v)}
                    className={`w-9 h-9 rounded-[8px] flex items-center justify-center active:opacity-60 ${
                      showEmojiHelp ? 'bg-[#FF9500] text-white' : 'bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-on-surface dark:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">mood</span>
                  </button>
                </div>
              </div>

              {showEmojiHelp && (
                <div className="bg-[#FF9500]/10 rounded-[10px] p-3 space-y-2">
                  <p className="text-[12px] text-on-surface dark:text-white leading-snug">
                    Premium (maxsus) emoji qo'shish uchun uning ID raqami kerak — Telegram Desktop'da shu
                    emojini uzoq bosib "Copy as Emoji ID" (yoki shunga o'xshash) orqali oling, yoki
                    o'sha emoji bor xabarni JSON eksport orqali tekshiring. "Zaxira belgi" — bu emoji
                    ko'rinmaydigan eski Telegram versiyalarida o'rniga chiqadigan oddiy emoji.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={emojiId}
                      onChange={(e) => setEmojiId(e.target.value)}
                      placeholder="Emoji ID"
                      className="flex-1 bg-white dark:bg-[#1C1C1E] rounded-[8px] px-2.5 py-2 text-[12px] outline-none"
                    />
                    <input
                      value={emojiFallback}
                      onChange={(e) => setEmojiFallback(e.target.value)}
                      placeholder="⭐"
                      className="w-16 bg-white dark:bg-[#1C1C1E] rounded-[8px] px-2.5 py-2 text-[12px] outline-none text-center"
                    />
                    <button
                      onClick={insertCustomEmoji}
                      className="bg-[#FF9500] text-white text-[12px] font-semibold px-3 rounded-[8px]"
                    >
                      Qo'shish
                    </button>
                  </div>
                </div>
              )}

              {/* Textarea */}
              <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm p-3.5 space-y-2">
                <label className="block text-[12px] font-semibold text-on-surface dark:text-white">
                  Shablon matni ({currentMessage.title})
                </label>
                <textarea
                  ref={textareaRef}
                  rows={9}
                  value={currentTextValue}
                  onChange={(e) => handleUpdateText(e.target.value)}
                  className="w-full bg-[#767680]/[0.06] dark:bg-[#1C2733] rounded-[8px] p-3 text-[12px] text-on-surface dark:text-white font-mono outline-none resize-none leading-relaxed"
                />
              </div>

              {saveError && (
                <div className="bg-[#FF3B30]/10 rounded-[10px] p-3">
                  <p className="text-[12px] text-[#FF3B30] font-medium">{saveError}</p>
                </div>
              )}

              {/* Live preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                  Jonli Telegram ko'rinishi (namuna qiymatlar bilan)
                </span>
                <div className="bg-[#182533] rounded-[14px] p-4 text-[12px] font-sans text-slate-100 shadow-md whitespace-pre-wrap leading-relaxed">
                  {livePreview}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
