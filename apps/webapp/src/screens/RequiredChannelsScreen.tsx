import React, { useEffect, useState } from 'react';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { IosSection, IosRow } from '../components/ios/IosCard';

export interface RequiredChannelsScreenProps {
  onBack: () => void;
}

interface RequiredChannel {
  id: string;
  title: string;
  url: string;
  chatId: string | null;
  sortOrder: number;
  isEnabled: boolean;
  botIsAdmin?: boolean;
  statusReason?: string | null;
}

/**
 * Majburiy obuna (2026-10). Bu yerdagi YOQILGAN barcha kanal/guruhlarga
 * obuna bo'lmaguncha bot shaxsiy chatda ishlamaydi. Bot har bir kanalda
 * admin bo'lishi shart — aks holda obunani tekshira olmaydi (bunday kanal
 * qizil ogohlantirish bilan ko'rsatiladi va tekshiruvda o'tkazib yuboriladi).
 */
export const RequiredChannelsScreen: React.FC<RequiredChannelsScreenProps> = ({ onBack }) => {
  const [items, setItems] = useState<RequiredChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [chatId, setChatId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/required-channels');
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    setError(null);
    if (!title.trim() || !url.trim()) {
      setError('Nomi va havolasini kiriting');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch('/api/admin/required-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, chatId: chatId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Xatolik');
        return;
      }
      setItems((prev) => [...prev, data]);
      setTitle('');
      setUrl('');
      setChatId('');
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, patch: Partial<RequiredChannel>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    await apiFetch(`/api/admin/required-channels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  };

  const remove = async (item: RequiredChannel) => {
    if (!window.confirm(`"${item.title}" o'chirilsinmi?`)) return;
    await apiFetch(`/api/admin/required-channels/${item.id}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((it, i) => ({ ...it, sortOrder: i + 1 }));
    setItems(renumbered);
    await Promise.all(
      [renumbered[index], renumbered[target]].map((it) =>
        apiFetch(`/api/admin/required-channels/${it.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: it.sortOrder }),
        })
      )
    );
  };

  const enabledCount = items.filter((i) => i.isEnabled).length;
  const inputClass =
    'w-full bg-ios-fill/10 rounded-[10px] px-3 py-2.5 text-[16px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none';

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader
        title="Majburiy obuna"
        subtitle={enabledCount > 0 ? `${enabledCount} ta yoqilgan kanal` : "Hozircha o'chiq — bot hammaga ochiq"}
        onBack={onBack}
      />

      <IosSection
        title="Kanallar va guruhlar"
        footer="Foydalanuvchi botga /start bosganda yoki yozganda shu yerdagi YOQILGAN barcha kanallarga obuna bo'lishi shart. Bot har bir kanalda admin bo'lishi kerak."
      >
        {loading && (
          <IosRow last>
            <span className="text-[15px] text-ios-label-secondary">Yuklanmoqda…</span>
          </IosRow>
        )}
        {!loading && items.length === 0 && (
          <IosRow last>
            <span className="text-[15px] text-ios-label-secondary">Hali kanal qo'shilmagan</span>
          </IosRow>
        )}
        {items.map((item, idx) => (
          <IosRow key={item.id} last={idx === items.length - 1}>
            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
              <span className={`text-[16px] truncate ${item.isEnabled ? 'text-ios-label' : 'text-ios-label-secondary line-through'}`}>
                {item.title}
              </span>
              <a href={item.url} target="_blank" rel="noreferrer" className="text-[13px] text-ios-blue truncate">
                {item.url}
              </a>
              {item.botIsAdmin === false ? (
                <span className="text-[12px]" style={{ color: 'rgb(var(--ios-red))' }}>
                  ⚠️ {item.statusReason || 'Bot admin emas'} — tekshiruvda o'tkazib yuboriladi
                </span>
              ) : item.botIsAdmin ? (
                <span className="text-[12px]" style={{ color: 'rgb(var(--ios-green))' }}>✅ Bot admin</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button className="px-1.5 text-ios-label-secondary disabled:opacity-30" disabled={idx === 0} onClick={() => move(idx, -1)}>
                ▲
              </button>
              <button
                className="px-1.5 text-ios-label-secondary disabled:opacity-30"
                disabled={idx === items.length - 1}
                onClick={() => move(idx, 1)}
              >
                ▼
              </button>
              <label className="relative inline-flex items-center cursor-pointer ml-1">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={item.isEnabled}
                  onChange={(e) => update(item.id, { isEnabled: e.target.checked })}
                />
                <div className="w-[44px] h-[26px] bg-ios-fill/30 rounded-full peer-checked:bg-[rgb(var(--ios-green))] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[22px] after:w-[22px] after:transition-transform peer-checked:after:translate-x-[18px]" />
              </label>
              <button className="px-2 text-[18px]" style={{ color: 'rgb(var(--ios-red))' }} onClick={() => remove(item)}>
                ×
              </button>
            </div>
          </IosRow>
        ))}
      </IosSection>

      <IosSection title="Yangi kanal qo'shish" footer="Yopiq kanal (t.me/+…) bo'lsa, Chat ID'ni ham kiriting (masalan -1001234567890).">
        <div className="flex flex-col gap-2 p-4">
          <input className={inputClass} placeholder="Nomi (masalan: Olmaliq yangiliklari)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={inputClass} placeholder="Havola (https://t.me/kanal)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input className={inputClass} placeholder="Chat ID (ixtiyoriy)" value={chatId} onChange={(e) => setChatId(e.target.value)} />
          {error && (
            <span className="text-[13px]" style={{ color: 'rgb(var(--ios-red))' }}>
              {error}
            </span>
          )}
          <button
            onClick={add}
            disabled={busy}
            className="mt-1 w-full bg-ios-blue text-white rounded-[12px] py-3 text-[16px] font-semibold disabled:opacity-50"
          >
            {busy ? "Qo'shilmoqda…" : "➕ Qo'shish"}
          </button>
        </div>
      </IosSection>
    </div>
  );
};
