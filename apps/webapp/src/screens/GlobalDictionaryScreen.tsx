import React, { useEffect, useState } from 'react';
import { IosHeader } from '../components/ios/IosHeader';
import { useFeedback } from '../context/FeedbackContext';
import { useLanguage } from '../context/LanguageContext';

export interface GlobalDictionaryScreenProps {
  onBack: () => void;
}

const TABS: { id: 'queries' | 'suffixes'; label: (n: number) => string }[] = [
  { id: 'queries', label: (n) => `Savol shakllari (${n})` },
  { id: 'suffixes', label: (n) => `Mo'ljal qo'shimchalari (${n})` },
];

// MUHIM (2026-09, to'liq qayta qurildi): bu ekran avval butunlay
// DEKORATIV edi — hech qanday backend chaqiruvi yo'q, faqat brauzer
// xotirasida turadigan soxta massivlar edi (sahifa yangilansa hammasi
// yo'qolardi, "saqlandi" degan xabar esa yolg'on edi). Endi ikkala
// ro'yxat ham HAQIQIY: umumiy `/api/admin/settings/:key` orqali
// (bazaviy AppSetting jadvali, JSON massiv sifatida) saqlanadi va
// bot kodi (zeroLayerFilter.ts, dictionary.ts) shu yozuvlarni 60
// soniyada bir marta o'qib, HAQIQATDA ishlatadi (qarang: 2026-09
// izohlari o'sha fayllarda).
//
// "Kategoriyalar" tabi ATAYLAB OLIB TASHLANDI — u aslida "Yana >
// Kategoriyalar" ekrani boshqaradigan bir xil bazadagi Category
// jadvalining dublikat, alohida (va sinxronlanmagan) ko'rinishi edi.
// Kategoriya/sinonim boshqarish uchun endi FAQAT bitta, real joy bor.
export const GlobalDictionaryScreen: React.FC<GlobalDictionaryScreenProps> = ({ onBack }) => {
  const { showToast } = useFeedback();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'queries' | 'suffixes'>('queries');

  const [queryPhrases, setQueryPhrases] = useState<string[]>([]);
  const [landmarkSuffixes, setLandmarkSuffixes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newPhraseInput, setNewPhraseInput] = useState('');
  const [newSuffixInput, setNewSuffixInput] = useState('');

  const initData = window.Telegram?.WebApp?.initData || '';

  const loadSetting = async (key: string): Promise<string[]> => {
    const res = await fetch(`/api/admin/settings/${key}`, { headers: { 'x-init-data': initData } });
    const data = await res.json();
    if (!data.value) return [];
    try {
      const parsed = JSON.parse(data.value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveSetting = async (key: string, list: string[]): Promise<boolean> => {
    const res = await fetch(`/api/admin/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-init-data': initData },
      body: JSON.stringify({ value: JSON.stringify(list) }),
    });
    const data = await res.json().catch(() => ({ success: false }));
    return !!data.success;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [phrases, suffixes] = await Promise.all([
        loadSetting('dictionary_query_phrases'),
        loadSetting('dictionary_landmark_suffixes'),
      ]);
      setQueryPhrases(phrases);
      setLandmarkSuffixes(suffixes);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddPhrase = async () => {
    const clean = newPhraseInput.trim().toLowerCase();
    if (!clean || queryPhrases.includes(clean)) return;
    const next = [...queryPhrases, clean];
    setSaving(true);
    const ok = await saveSetting('dictionary_query_phrases', next);
    setSaving(false);
    if (ok) {
      setQueryPhrases(next);
      setNewPhraseInput('');
      showToast("Savol shakli qo'shildi — botga 60 soniya ichida qo'llanadi", 'success');
    } else {
      showToast('Saqlashda xato yuz berdi', 'error');
    }
  };

  const handleRemovePhrase = async (phrase: string) => {
    const next = queryPhrases.filter((p) => p !== phrase);
    setSaving(true);
    const ok = await saveSetting('dictionary_query_phrases', next);
    setSaving(false);
    if (ok) {
      setQueryPhrases(next);
    } else {
      showToast("O'chirishda xato yuz berdi", 'error');
    }
  };

  const handleAddSuffix = async () => {
    const clean = newSuffixInput.trim().toLowerCase();
    if (!clean || landmarkSuffixes.includes(clean)) return;
    const next = [...landmarkSuffixes, clean];
    setSaving(true);
    const ok = await saveSetting('dictionary_landmark_suffixes', next);
    setSaving(false);
    if (ok) {
      setLandmarkSuffixes(next);
      setNewSuffixInput('');
      showToast("Mo'ljal qo'shimchasi qo'shildi — botga 60 soniya ichida qo'llanadi", 'success');
    } else {
      showToast('Saqlashda xato yuz berdi', 'error');
    }
  };

  const handleRemoveSuffix = async (suffix: string) => {
    const next = landmarkSuffixes.filter((s) => s !== suffix);
    setSaving(true);
    const ok = await saveSetting('dictionary_landmark_suffixes', next);
    setSaving(false);
    if (ok) {
      setLandmarkSuffixes(next);
    } else {
      showToast("O'chirishda xato yuz berdi", 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader
        title="Global Lug'at"
        subtitle="Super-Admin · Bot filtriga to'g'ridan-to'g'ri ulangan qo'shimcha so'zlar"
        onBack={onBack}
        backLabel={t('action_back')}
      />

      {/* TAB NAVIGATION */}
      <div className="flex bg-ios-fill/[0.12] rounded-ios p-[2px]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 rounded-[8px] text-[11px] font-medium text-center transition-colors ${
              activeTab === tab.id ? 'bg-ios-card text-ios-label shadow-sm' : 'text-ios-label-secondary/70'
            }`}
          >
            {tab.label(tab.id === 'queries' ? queryPhrases.length : landmarkSuffixes.length)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-[13px] text-ios-label-secondary/70 py-8">Yuklanmoqda...</div>
      ) : (
        <>
          {activeTab === 'queries' && (
            <div className="bg-ios-card rounded-ios-lg p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-[12px] text-ios-label-secondary/70 uppercase tracking-wide">
                Qo'shimcha savol iboralari
              </h3>
              <p className="text-[12px] text-ios-label-secondary/70 leading-relaxed">
                Bazaviy so'zlar ("kerak", "nomeri", "qayerda" va h.k.) kod ichida allaqachon ishlaydi — bu yerga
                FAQAT ular yetarli bo'lmagan qo'shimcha iboralarni qo'shasiz. Qo'shilgan so'z 60 soniya ichida
                botda haqiqatan ishlay boshlaydi.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newPhraseInput}
                  onChange={(e) => setNewPhraseInput(e.target.value)}
                  placeholder="Yangi savol iborasi..."
                  className="flex-1 bg-ios-fill/[0.08] rounded-ios px-3.5 py-2 text-[13px] text-ios-label outline-none"
                  disabled={saving}
                />
                <button
                  onClick={handleAddPhrase}
                  disabled={saving}
                  className="bg-ios-blue text-white text-[12px] font-bold px-4 py-2 rounded-ios disabled:opacity-50"
                >
                  + Qo'shish
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {queryPhrases.length === 0 && (
                  <span className="text-[12px] text-ios-label-secondary/50">Qo'shimcha ibora yo'q</span>
                )}
                {queryPhrases.map((p) => (
                  <span
                    key={p}
                    className="bg-ios-purple/[0.12] text-ios-purple text-[12px] px-3 py-1.5 rounded-full flex items-center gap-2"
                  >
                    {p}
                    <button
                      onClick={() => handleRemovePhrase(p)}
                      disabled={saving}
                      className="text-ios-purple/70 active:text-ios-red font-bold disabled:opacity-50"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'suffixes' && (
            <div className="bg-ios-card rounded-ios-lg p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-[12px] text-ios-label-secondary/70 uppercase tracking-wide">
                Qo'shimcha mo'ljal-qo'shimchalari
              </h3>
              <p className="text-[12px] text-ios-label-secondary/70 leading-relaxed">
                Bot bu so'zlarni mo'ljal nomidan ajratib oladi ("karzinka oldida" → "Karzinka"). Bazaviy
                ro'yxat ("oldida", "yonida", "orqasida" va h.k.) allaqachon ishlaydi — bu yerga faqat
                yetishmayotgan qo'shimchalarni qo'shasiz.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newSuffixInput}
                  onChange={(e) => setNewSuffixInput(e.target.value)}
                  placeholder="Yangi qo'shimcha so'z..."
                  className="flex-1 bg-ios-fill/[0.08] rounded-ios px-3.5 py-2 text-[13px] text-ios-label outline-none"
                  disabled={saving}
                />
                <button
                  onClick={handleAddSuffix}
                  disabled={saving}
                  className="bg-ios-blue text-white text-[12px] font-bold px-4 py-2 rounded-ios disabled:opacity-50"
                >
                  + Qo'shish
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {landmarkSuffixes.length === 0 && (
                  <span className="text-[12px] text-ios-label-secondary/50">Qo'shimcha so'z yo'q</span>
                )}
                {landmarkSuffixes.map((s) => (
                  <span
                    key={s}
                    className="bg-ios-green/[0.12] text-ios-green text-[12px] px-3 py-1.5 rounded-full flex items-center gap-2"
                  >
                    {s}
                    <button
                      onClick={() => handleRemoveSuffix(s)}
                      disabled={saving}
                      className="text-ios-green/70 active:text-ios-red font-bold disabled:opacity-50"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
