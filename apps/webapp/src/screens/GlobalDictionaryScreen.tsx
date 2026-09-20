import React, { useState } from 'react';
import { IosHeader } from '../components/ios/IosHeader';
import { IosSearchBar } from '../components/ios/IosSearchBar';
import { useFeedback } from '../context/FeedbackContext';
import { useLanguage } from '../context/LanguageContext';

export interface GlobalDictionaryScreenProps {
  onBack: () => void;
}

interface DictionaryCategory {
  id: string;
  name: string;
  group: string;
  synonyms: string[];
}

const TABS: { id: 'categories' | 'queries' | 'suffixes'; label: (n: number) => string }[] = [
  { id: 'categories', label: (n) => `Kategoriyalar (${n})` },
  { id: 'queries', label: (n) => `Savol shakllari (${n})` },
  { id: 'suffixes', label: (n) => `Mo'ljal qo'shimchalari (${n})` },
];

export const GlobalDictionaryScreen: React.FC<GlobalDictionaryScreenProps> = ({ onBack }) => {
  const { showToast } = useFeedback();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'categories' | 'queries' | 'suffixes'>('categories');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Inputs
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSynonyms, setNewCatSynonyms] = useState('');
  const [newCatGroup, setNewCatGroup] = useState('Uy-joy ustalari');

  const [activeSynonymInputId, setActiveSynonymInputId] = useState<string | null>(null);
  const [newSynonymText, setNewSynonymText] = useState('');

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
    showToast(`"${newCat.name}" kategoriyasi lug'atga qo'shildi`, 'success');
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
    showToast('Sinonim qo\'shildi', 'success');
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
      showToast('Savol shakli qo\'shildi', 'success');
    }
  };

  const handleAddSuffix = () => {
    if (newSuffixInput.trim() && !landmarkSuffixes.includes(newSuffixInput.trim().toLowerCase())) {
      setLandmarkSuffixes([...landmarkSuffixes, newSuffixInput.trim().toLowerCase()]);
      setNewSuffixInput('');
      showToast('Mo\'jal qo\'shimchasi qo\'shildi', 'success');
    }
  };

  const filteredCategories = categories.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.synonyms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader
        title="Global Lug'at"
        subtitle="Super-Admin · Barcha shaharlar uchun umumiy bilimlar bazasi"
        onBack={onBack}
        backLabel={t('action_back')}
        trailing={
          activeTab === 'categories' ? (
            <button
              onClick={() => setShowAddCatModal(true)}
              className="flex items-center gap-1 text-ios-blue text-[15px] font-semibold active:opacity-50 transition-opacity"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Kategoriya
            </button>
          ) : undefined
        }
      />

      <IosSearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Kategoriya yoki sinonim qidirish" />

      {/* TAB NAVIGATION */}
      <div className="flex bg-ios-fill/[0.12] rounded-ios p-[2px]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 rounded-[8px] text-[11px] font-medium text-center transition-colors ${
              activeTab === tab.id ? 'bg-ios-card text-ios-label shadow-sm' : 'text-ios-label-secondary/70'
            }`}
          >
            {tab.label(tab.id === 'categories' ? categories.length : tab.id === 'queries' ? queryPhrases.length : landmarkSuffixes.length)}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: KATEGORIYALAR VA SINONIMLAR */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="flex flex-col gap-3">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="bg-ios-card rounded-ios-lg p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[15px] text-ios-label capitalize">
                    {cat.name}
                  </h3>
                  <span className="text-[11px] text-ios-label-secondary/70 font-medium">{cat.group}</span>
                </div>
                <span className="text-[12px] font-semibold text-ios-blue bg-ios-blue/10 px-2.5 py-1 rounded-full">
                  {cat.synonyms.length} ta sinonim
                </span>
              </div>

              {/* SYNONYMS CHIPS */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {cat.synonyms.map(syn => (
                  <span
                    key={syn}
                    className="bg-ios-fill/[0.10] text-ios-label text-[12px] px-2.5 py-1 rounded-full flex items-center gap-1.5"
                  >
                    {syn}
                    <button
                      onClick={() => handleRemoveSynonym(cat.id, syn)}
                      className="text-ios-label-secondary/50 active:text-ios-red font-bold"
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
                      className="bg-ios-fill/[0.08] text-[12px] text-ios-label px-3 py-1 rounded-full outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddSynonym(cat.id)}
                      className="bg-ios-blue text-white text-[12px] px-2.5 py-1 rounded-full font-bold"
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
                    className="border border-dashed border-ios-blue/40 text-ios-blue text-[12px] px-2.5 py-1 rounded-full active:bg-ios-blue/10 transition-colors"
                  >
                    + so'z qo'shish
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: SAVOL SHAKLLARI (0-QAVAT FILTRI) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'queries' && (
        <div className="bg-ios-card rounded-ios-lg p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-[12px] text-ios-label-secondary/70 uppercase tracking-wide">
            0-Qavat bepul filtr o'tkazuvchi so'zlar ({queryPhrases.length})
          </h3>
          <p className="text-[12px] text-ios-label-secondary/70 leading-relaxed">
            Xabarda ushbu so'zlardan biri bo'lsagina u AI klassifikatoriga yuboriladi (TZ 3.2 bo'limi).
          </p>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newPhraseInput}
              onChange={e => setNewPhraseInput(e.target.value)}
              placeholder="Yangi savol iborasi..."
              className="flex-1 bg-ios-fill/[0.08] rounded-ios px-3.5 py-2 text-[13px] text-ios-label outline-none"
            />
            <button
              onClick={handleAddPhrase}
              className="bg-ios-blue text-white text-[12px] font-bold px-4 py-2 rounded-ios"
            >
              + Qo'shish
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {queryPhrases.map(p => (
              <span
                key={p}
                className="bg-ios-purple/[0.12] text-ios-purple text-[12px] px-3 py-1.5 rounded-full flex items-center gap-2"
              >
                {p}
                <button
                  onClick={() => setQueryPhrases(queryPhrases.filter(q => q !== p))}
                  className="text-ios-purple/70 active:text-ios-red font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: MO'LJAL QO'SHIMCHALARI */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'suffixes' && (
        <div className="bg-ios-card rounded-ios-lg p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-[12px] text-ios-label-secondary/70 uppercase tracking-wide">
            Mo'ljal qo'shimchalari ro'yxati ({landmarkSuffixes.length})
          </h3>
          <p className="text-[12px] text-ios-label-secondary/70 leading-relaxed">
            Bot ushbu so'zlarni mo'ljal nomidan ajratib oladi va bitta joyga bog'laydi ("karzinka oldida" ➔ "Korzinka").
          </p>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newSuffixInput}
              onChange={e => setNewSuffixInput(e.target.value)}
              placeholder="Yangi qo'shimcha so'z..."
              className="flex-1 bg-ios-fill/[0.08] rounded-ios px-3.5 py-2 text-[13px] text-ios-label outline-none"
            />
            <button
              onClick={handleAddSuffix}
              className="bg-ios-blue text-white text-[12px] font-bold px-4 py-2 rounded-ios"
            >
              + Qo'shish
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {landmarkSuffixes.map(s => (
              <span
                key={s}
                className="bg-ios-green/[0.12] text-ios-green text-[12px] px-3 py-1.5 rounded-full flex items-center gap-2"
              >
                {s}
                <button
                  onClick={() => setLandmarkSuffixes(landmarkSuffixes.filter(x => x !== s))}
                  className="text-ios-green/70 active:text-ios-red font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: NEW CATEGORY */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-ios-card rounded-ios-lg p-5 w-full max-w-sm space-y-4 shadow-lg animate-fade-in">
            <h3 className="font-semibold text-[17px] text-ios-label">
              Yangi global kategoriya
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide mb-1">
                Asosiy nom *
              </label>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="masalan: santexnik"
                className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-2.5 text-[13px] text-ios-label outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide mb-1">
                Guruh
              </label>
              <select
                value={newCatGroup}
                onChange={e => setNewCatGroup(e.target.value)}
                className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-2.5 text-[13px] text-ios-label outline-none"
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
              <label className="block text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide mb-1">
                Sinonimlar (vergul bilan)
              </label>
              <input
                type="text"
                value={newCatSynonyms}
                onChange={e => setNewCatSynonyms(e.target.value)}
                placeholder="suv ustasi, quvur ustasi, сантехник"
                className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-2.5 text-[13px] text-ios-label outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowAddCatModal(false)}
                className="flex-1 py-2.5 bg-ios-fill/[0.10] text-ios-label rounded-ios text-[13px] font-semibold active:bg-ios-fill/20 transition-colors"
              >
                {t('action_cancel')}
              </button>
              <button
                onClick={handleAddCategory}
                className="flex-1 py-2.5 bg-ios-blue text-white rounded-ios text-[13px] font-bold active:opacity-70 transition-opacity"
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
