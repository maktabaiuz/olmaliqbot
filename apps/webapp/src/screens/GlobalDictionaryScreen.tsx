import React, { useState } from 'react';

export interface GlobalDictionaryScreenProps {
  onBack: () => void;
}

interface DictionaryCategory {
  id: string;
  name: string;
  group: string;
  synonyms: string[];
}

export const GlobalDictionaryScreen: React.FC<GlobalDictionaryScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'queries' | 'suffixes'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Modal / Inputs
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSynonyms, setNewCatSynonyms] = useState('');
  const [newCatGroup, setNewCatGroup] = useState('Uy-joy ustalari');

  const [activeSynonymInputId, setActiveSynonymInputId] = useState<string | null>(null);
  const [newSynonymText, setNewSynonymText] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Seeded Categories & Synonyms from docs/dictionary.md
  const [categories, setCategories] = useState<DictionaryCategory[]>([
    { id: '1', name: 'gazavik', group: 'Uy-joy ustalari', synonyms: ['gazovik', 'gaz ustasi', 'gaz mastir', 'kolonka ustasi', 'plita ustasi', 'газавик', 'газовщик'] },
    { id: '2', name: 'santexnik', group: 'Uy-joy ustalari', synonyms: ['suv ustasi', 'quvur ustasi', 'santexnika ustasi', 'сантехник', 'сув устаси'] },
    { id: '3', name: 'elektrik', group: 'Uy-joy ustalari', synonyms: ['elektr ustasi', 'elektromontyor', 'svet ustasi', 'электрик', 'электр устаси'] },
    { id: '4', name: 'kafelchi', group: 'Uy-joy ustalari', synonyms: ['plitkachi', 'kafel ustasi', 'kafel yotqizuvchi', 'плиточник'] },
    { id: '5', name: 'konditsioner ustasi', group: 'Maishiy texnika', synonyms: ['split ustasi', 'konditsioner o\'rnatuvchi', 'кондиционерщик'] },
    { id: '6', name: 'muzlatgich ustasi', group: 'Maishiy texnika', synonyms: ['xolodilnik ustasi', 'muzlatkich', 'холодильщик'] },
    { id: '7', name: 'avtoelektrik', group: 'Avtomobil', synonyms: ['mashina elektrigi', 'автоэлектрик'] },
    { id: '8', name: 'dorixona', group: 'Do\'kon va obyektlar', synonyms: ['apteka', 'аптека', 'дорихона'] },
    { id: '9', name: 'notarius', group: 'Rasmiy idoralar', synonyms: ['нотариус', 'нотариус ваколатхонаси'] },
  ]);

  // Seeded 0-Level Filter Trigger Phrases from docs/dictionary.md
  const [queryPhrases, setQueryPhrases] = useState<string[]>([
    'kim bor', 'kim biladi', 'kim bilsa', 'bilasizmi', 'bilasizlarmi',
    'aytinglar', 'aytib yuboringlar', 'kerak edi', 'kerak', 'zarur',
    'nomeri', 'nomer', 'raqami', 'raqam', 'telefoni', 'telefon',
    'nechigacha', 'nechida ochiladi', 'nechida yopiladi', 'ochiqmi', 'yopiqmi',
    'qayerda', 'qayerda joylashgan', 'qayerdan topaman', 'manzili',
    'qancha', 'qanchaga', 'qancha turadi', 'narxi',
    'кто знает', 'подскажите', 'кто-нибудь', 'нужен', 'нужна', 'надо', 'где', 'цена'
  ]);

  // Seeded Landmark Suffix Modifiers from docs/dictionary.md
  const [landmarkSuffixes, setLandmarkSuffixes] = useState<string[]>([
    'oldi', 'oldida', 'orqasi', 'orqasida', 'yoni', 'yonida',
    'atrofi', 'atrofida', 'yaqinida', 'yaqin', 'ro\'parasi', 'qarshisida',
    'tepasi', 'pastida', 'ichida', 'tomonda',
    'рядом', 'около', 'возле', 'напротив', 'за', 'перед'
  ]);

  const [newPhraseInput, setNewPhraseInput] = useState('');
  const [newSuffixInput, setNewSuffixInput] = useState('');

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const synList = newCatSynonyms.split(',').map(s => s.trim()).filter(Boolean);
    const newCat: DictionaryCategory = {
      id: Date.now().toString(),
      name: newCatName.trim(),
      group: newCatGroup,
      synonyms: [newCatName.trim().toLowerCase(), ...synList],
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
    setNewCatSynonyms('');
    setShowAddCatModal(false);
    showToastMsg(`✅ "${newCat.name}" kategoriyasi lug'atga qo'shildi`);
  };

  const handleAddSynonym = (catId: string) => {
    if (!newSynonymText.trim()) return;
    setCategories(prev =>
      prev.map(c =>
        c.id === catId
          ? { ...c, synonyms: [...c.synonyms, newSynonymText.trim().toLowerCase()] }
          : c
      )
    );
    setNewSynonymText('');
    setActiveSynonymInputId(null);
    showToastMsg('✅ Sinonim qo\'shildi');
  };

  const handleRemoveSynonym = (catId: string, synToRemove: string) => {
    setCategories(prev =>
      prev.map(c =>
        c.id === catId ? { ...c, synonyms: c.synonyms.filter(s => s !== synToRemove) } : c
      )
    );
  };

  const handleAddPhrase = () => {
    if (newPhraseInput.trim() && !queryPhrases.includes(newPhraseInput.trim().toLowerCase())) {
      setQueryPhrases([...queryPhrases, newPhraseInput.trim().toLowerCase()]);
      setNewPhraseInput('');
      showToastMsg('✅ Savol shakli qo\'shildi');
    }
  };

  const handleAddSuffix = () => {
    if (newSuffixInput.trim() && !landmarkSuffixes.includes(newSuffixInput.trim().toLowerCase())) {
      setLandmarkSuffixes([...landmarkSuffixes, newSuffixInput.trim().toLowerCase()]);
      setNewSuffixInput('');
      showToastMsg('✅ Mo\'jal qo\'shimchasi qo\'shildi');
    }
  };

  const filteredCategories = categories.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.synonyms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background dark:bg-[#121417] text-on-surface dark:text-slate-100 font-sans flex flex-col relative pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-2xl border border-slate-700">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-surface/95 dark:bg-[#17212B]/95 backdrop-blur-md border-b border-outline-variant/30 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-surface-container-low dark:hover:bg-slate-800 text-on-surface-variant dark:text-slate-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-bold text-base text-on-surface dark:text-slate-100 flex items-center gap-2">
              Global Lug'at
              <span className="bg-purple-500/20 text-purple-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                Super-Admin
              </span>
            </h1>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
              Barcha shaharlar uchun umumiy bilimlari bazasi
            </p>
          </div>
        </div>

        {activeTab === 'categories' && (
          <button
            onClick={() => setShowAddCatModal(true)}
            className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Kategoriya
          </button>
        )}
      </header>

      {/* SEARCH FILTER */}
      <div className="p-4 bg-surface dark:bg-[#17212B] border-b border-outline-variant/30 dark:border-slate-800">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Kategoriya yoki sinonim qidirish..."
            className="w-full bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/40 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-on-surface dark:text-slate-100 outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="bg-surface dark:bg-[#17212B] border-b border-outline-variant/30 dark:border-slate-800 px-4 flex">
        {[
          { id: 'categories', label: `Kategoriyalar (${categories.length})` },
          { id: 'queries', label: `Savol Shakllari (${queryPhrases.length})` },
          { id: 'suffixes', label: `Mo'ljal Qo'shimchalari (${landmarkSuffixes.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-[11px] font-bold text-center border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-primary text-primary dark:text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: KATEGORIYALAR VA SINONIMLAR */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <main className="p-4 space-y-3 animate-fadeIn">
          {filteredCategories.map(cat => (
            <div
              key={cat.id}
              className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-on-surface dark:text-slate-100 capitalize">
                    {cat.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">{cat.group}</span>
                </div>
                <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full">
                  {cat.synonyms.length} ta sinonim
                </span>
              </div>

              {/* SYNONYMS CHIPS */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {cat.synonyms.map(syn => (
                  <span
                    key={syn}
                    className="bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
                  >
                    {syn}
                    <button
                      onClick={() => handleRemoveSynonym(cat.id, syn)}
                      className="hover:text-red-400 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {activeSynonymInputId === cat.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newSynonymText}
                      onChange={e => setNewSynonymText(e.target.value)}
                      placeholder="sinonim..."
                      className="bg-surface-container-low dark:bg-[#1C2733] border border-primary text-xs px-3 py-1 rounded-full outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddSynonym(cat.id)}
                      className="bg-primary text-white text-xs px-2.5 py-1 rounded-full font-bold"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setActiveSynonymInputId(cat.id);
                      setNewSynonymText('');
                    }}
                    className="border border-dashed border-sky-500/50 text-sky-400 text-xs px-2.5 py-1 rounded-full hover:bg-sky-500/10 transition-colors"
                  >
                    + so'z qo'shish
                  </button>
                )}
              </div>
            </div>
          ))}
        </main>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: SAVOL SHAKLLARI (0-QAVAT FILTRI) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'queries' && (
        <main className="p-4 space-y-4 animate-fadeIn">
          <div className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-3 shadow-sm">
            <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
              0-Qavat Bepul Filtr O'tkazuvchi So'zlar ({queryPhrases.length})
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Xabarda ushbu so'zlardan biri bo'lsagina u AI klassifikatoriga yuboriladi (TZ 3.2 bo'limi).
            </p>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={newPhraseInput}
                onChange={e => setNewPhraseInput(e.target.value)}
                placeholder="Yangi savol iborasi..."
                className="flex-1 bg-surface-container-low dark:bg-[#1C2733] border border-slate-700 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-primary"
              />
              <button
                onClick={handleAddPhrase}
                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                + Qo'shish
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {queryPhrases.map(p => (
                <span
                  key={p}
                  className="bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs px-3 py-1.5 rounded-full flex items-center gap-2"
                >
                  {p}
                  <button
                    onClick={() => setQueryPhrases(queryPhrases.filter(q => q !== p))}
                    className="hover:text-red-400 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: MO'LJAL QO'SHIMCHALARI */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'suffixes' && (
        <main className="p-4 space-y-4 animate-fadeIn">
          <div className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-3 shadow-sm">
            <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
              Mo'ljal Qo'shimchalari Ro'yxati ({landmarkSuffixes.length})
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bot ushbu so'zlarni mo'ljal nomidan ajratib oladi va bitta joyga bog'laydi ("karzinka oldida" ➔ "Korzinka").
            </p>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={newSuffixInput}
                onChange={e => setNewSuffixInput(e.target.value)}
                placeholder="Yangi qo'shimcha so'z..."
                className="flex-1 bg-surface-container-low dark:bg-[#1C2733] border border-slate-700 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-primary"
              />
              <button
                onClick={handleAddSuffix}
                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                + Qo'shish
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {landmarkSuffixes.map(s => (
                <span
                  key={s}
                  className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-full flex items-center gap-2"
                >
                  {s}
                  <button
                    onClick={() => setLandmarkSuffixes(landmarkSuffixes.filter(x => x !== s))}
                    className="hover:text-red-400 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* MODAL: NEW CATEGORY */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-scale-up">
            <h3 className="font-bold text-base text-on-surface dark:text-slate-100">
              Yangi Global Kategoriya
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Asosiy nom *
              </label>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="masalan: santexnik"
                className="w-full bg-surface-container-low dark:bg-[#17212B] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Guruh
              </label>
              <select
                value={newCatGroup}
                onChange={e => setNewCatGroup(e.target.value)}
                className="w-full bg-surface-container-low dark:bg-[#17212B] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none"
              >
                <option value="Uy-joy ustalari">Uy-joy ustalari</option>
                <option value="Maishiy texnika">Maishiy texnika</option>
                <option value="Avtomobil">Avtomobil</option>
                <option value="Transport va tashish">Transport va tashish</option>
                <option value="Do'kon va obyektlar">Do'kon va obyektlar</option>
                <option value="Tibbiyot">Tibbiyot</option>
                <option value="Rasmiy idoralar">Rasmiy idoralar</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Sinonimlar (vergul bilan)
              </label>
              <input
                type="text"
                value={newCatSynonyms}
                onChange={e => setNewCatSynonyms(e.target.value)}
                placeholder="suv ustasi, quvur ustasi, сантехник"
                className="w-full bg-surface-container-low dark:bg-[#17212B] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowAddCatModal(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleAddCategory}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold"
              >
                Qo'shish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
