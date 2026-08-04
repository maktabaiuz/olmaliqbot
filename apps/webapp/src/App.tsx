import { useState } from 'react';
import {
  Home,
  PlusCircle,
  Search,
  Database,
  MoreHorizontal,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Phone,
  MapPin,
  Star,
  Moon,
  Sun,
  Flame,
  X,
  Send,
  Sparkles,
  Filter,
  UserCheck,
  MessageSquare,
  Copy,
  Check,
  Zap,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'simulator' | 'add' | 'requests' | 'database' | 'more'>('home');
  const [darkMode, setDarkMode] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Emergency Preview Modal state
  const [activeEmergencyModal, setActiveEmergencyModal] = useState<string | null>(null);

  // Group Simulator State
  const [simQuery, setSimQuery] = useState('Karzinka oldida gazavik bormi?');
  const [simMessages, setSimMessages] = useState<Array<{ sender: 'user' | 'bot' | 'emergency'; text: string; isReply?: boolean; buttons?: string[] }>>([
    {
      sender: 'user',
      text: 'Karzinka oldida gazavik bormi?',
    },
    {
      sender: 'bot',
      isReply: true,
      text: `🔧 Gazavik\n\nBahrom ✅ ⭐4.4\n📍 Korzinka orqasi\n🏷 Uyga boradi · Kafolat\n📞 +998 90 123 45 67\n\n🕐 Bu xabar 15 daqiqada o'chadi`,
      buttons: ['Yana 2 tasini ko\'rish', '⭐ Baholash', '⚠️ Shikoyat'],
    },
  ]);

  // AI Copilot Modal State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    { sender: 'ai', text: "Salom, Bobur! Men Kim Bor Admin AI Copilotman. Loyiha statistikasi, ustalar va bazani boshqarishda yordam beraman." },
  ]);

  // Listings State
  const [listings, setListings] = useState([
    {
      id: '1',
      name: 'Bahrom',
      category: 'Gazavik',
      phone: '+998 90 123 45 67',
      landmark: 'Korzinka orqasi',
      badges: ['Uyga boradi', 'Kafolat', '24/7'],
      rating: 4.4,
      reviewsCount: 32,
      verified: true,
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'Aziz',
      category: 'Kafelchi',
      phone: '+998 93 235 35 00',
      landmark: 'Bozor orqasi',
      badges: ['Uyga boradi', 'Dam olishsiz'],
      rating: 4.7,
      reviewsCount: 19,
      verified: true,
      status: 'ACTIVE',
    },
    {
      id: '3',
      name: 'Jasur',
      category: 'Santexnik',
      phone: '+998 97 765 43 21',
      landmark: '3-mavze',
      badges: ['Zudlik bilan'],
      rating: 4.1,
      reviewsCount: 12,
      verified: false,
      status: 'ACTIVE',
    },
  ]);

  // Add Listing Form
  const [formData, setFormData] = useState({
    name: '',
    category: 'Gazavik',
    phone: '+998 ',
    landmark: 'Korzinka',
    workingHours: '08:00 - 18:00',
    verified: false,
  });

  const handleCopy = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    const newListing = {
      id: String(Date.now()),
      name: formData.name,
      category: formData.category,
      phone: formData.phone,
      landmark: formData.landmark,
      badges: ['Uyga boradi'],
      rating: 5.0,
      reviewsCount: 1,
      verified: formData.verified,
      status: 'ACTIVE',
    };

    setListings([newListing, ...listings]);
    setFormData({ name: '', category: 'Gazavik', phone: '+998 ', landmark: 'Korzinka', workingHours: '08:00 - 18:00', verified: false });
    setActiveTab('database');
  };

  const handleSimulate = (overrideQuery?: string) => {
    const q = overrideQuery || simQuery;
    if (!q.trim()) return;

    setSimMessages((prev) => [...prev, { sender: 'user', text: q }]);
    if (!overrideQuery) setSimQuery('');

    setTimeout(() => {
      const lower = q.toLowerCase();
      if (lower.includes('gaz hidi') || lower.includes('пожар') || lower.includes('yong\'in')) {
        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'emergency',
            isReply: true,
            text: `🚨 GAZ HIDI — DARHOL:\n\n❌ Chiroq, gugurt, zajigalka — yoqmang\n❌ Vyklyuchatel, rozetka, telefonga tegmang\n❌ Liftga kirmang\n\n✅ Derazalarni keng oching\n✅ Gaz kranini yoping\n✅ Uydan chiqing\n\n📞 104 — Gaz avariya xizmati\n📞 112 — Yagona qutqaruv\n📞 +998 70 612 34 56 — Gaz idorasi\n\n⚠️ Usta emas — avval avariya xizmatini chaqiring.`,
          },
        ]);
      } else if (lower.includes('kafelchi') || lower.includes('плитка')) {
        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            isReply: true,
            text: `🔧 Kafelchi\n\nAziz ✅ ⭐4.7\n📍 Bozor orqasi\n🏷 Uyga boradi · Dam olishsiz\n📞 +998 93 235 35 00\n\n🕐 Bu xabar 15 daqiqada o'chadi`,
            buttons: ['⭐ Baholash', '⚠️ Shikoyat'],
          },
        ]);
      } else {
        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            isReply: true,
            text: `🔧 Gazavik\n\nBahrom ✅ ⭐4.4\n📍 Korzinka orqasi\n🏷 Uyga boradi · Kafolat\n📞 +998 90 123 45 67\n\n🕐 Bu xabar 15 daqiqada o'chadi`,
            buttons: ['Yana 2 tasini ko\'rish', '⭐ Baholash', '⚠️ Shikoyat'],
          },
        ]);
      }
    }, 400);
  };

  const handleAiSend = (quickText?: string) => {
    const text = quickText || aiInput;
    if (!text.trim()) return;

    setAiMessages((prev) => [...prev, { sender: 'user', text }]);
    if (!quickText) setAiInput('');

    setTimeout(() => {
      let reply = `Buyruq bajarildi: "${text}"`;
      const l = text.toLowerCase();
      if (l.includes('statistika')) {
        reply = "📊 Bugungi statistika: 240 ta faol yozuv, 98.5% javob berish aniqligi, 14 ta yangi so'rov.";
      } else if (l.includes('yangi usta')) {
        reply = "✅ Yangi 'Gazavik Dilshod' yozuvi qoralama sifatida tayyorlandi. Tasdiqlaysizmi?";
      } else if (l.includes('favqulodda')) {
        reply = "🚨 Favqulodda raqamlar: Gaz (104), Yong'in (101), Qutqaruv (112), Tez Yordam (103).";
      }
      setAiMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    }, 500);
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen max-w-[680px] mx-auto bg-slate-50 dark:bg-[#17212B] text-slate-900 dark:text-slate-100 flex flex-col pb-20 relative shadow-2xl transition-colors duration-200">
        
        {/* HEADER */}
        <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/85 dark:bg-[#17212B]/85 backdrop-blur-lg z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-[#2AABEE] to-[#229ED9] bg-clip-text text-transparent">Kim bor?</span>
              <span className="text-xs bg-[#2AABEE]/15 text-[#2AABEE] px-2.5 py-0.5 rounded-full font-semibold border border-[#2AABEE]/30">Olmaliq</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Shahar ma'lumotnomasi admin paneli</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('simulator')}
              className="px-3 py-1.5 rounded-xl bg-[#2AABEE]/10 text-[#2AABEE] text-xs font-bold flex items-center gap-1 border border-[#2AABEE]/30 hover:bg-[#2AABEE]/20 transition-all"
            >
              <Zap className="w-3.5 h-3.5" /> Bot Demo
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#1C2733] text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all"
              title="Mavzuni almashtirish"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="p-4 flex-1 space-y-4">
          
          {/* TAB 1: BOSH SAHIFA */}
          {activeTab === 'home' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Hero Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-tr from-[#229ED9] via-[#2AABEE] to-cyan-400 text-white shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs opacity-90 uppercase tracking-widest font-bold">Xush kelibsiz</p>
                    <h2 className="text-xl font-extrabold mt-0.5">Bugungi ishlar & ko'rsatkichlar</h2>
                  </div>
                  <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/20">
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl">
                    <span className="text-2xl font-black">{listings.length}</span>
                    <p className="text-xs opacity-90 font-medium">Faol yozuvlar</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl">
                    <span className="text-2xl font-black">98.5%</span>
                    <p className="text-xs opacity-90 font-medium">Javob aniqligi</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveTab('simulator')}
                  className="p-3 rounded-2xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 text-center hover:border-[#2AABEE] transition-all group"
                >
                  <MessageSquare className="w-5 h-5 mx-auto text-[#2AABEE] mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">Bot Simulyatori</span>
                </button>

                <button
                  onClick={() => setActiveEmergencyModal('gas_leak')}
                  className="p-3 rounded-2xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 text-center hover:border-rose-500 transition-all group"
                >
                  <ShieldAlert className="w-5 h-5 mx-auto text-rose-500 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">Favqulodda (104)</span>
                </button>

                <button
                  onClick={() => setIsAiOpen(true)}
                  className="p-3 rounded-2xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 text-center hover:border-cyan-400 transition-all group"
                >
                  <Bot className="w-5 h-5 mx-auto text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">AI Copilot</span>
                </button>
              </div>

              {/* Tasks Group 1: SHOSHILINCH */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-500" />
                    SHOSHILINCH VAZIFALAR (0)
                  </span>
                  <span className="text-xs text-emerald-500 font-normal">Bugun hammasi joyida ✅</span>
                </h3>
                <div className="p-5 rounded-2xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 text-center py-6 shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Barcha shoshilinch tuzatishlar bajarildi!</p>
                  <p className="text-xs text-slate-400 mt-0.5">Yangi tuzatish va shikoyatlar kelganda shu yerda ko'rinadi.</p>
                </div>
              </div>

              {/* Tasks Group 2: KEYINROQ */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  KEYINROQ (2 ta yozuv tekshiruvi kutilmoqda)
                </h3>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm hover:border-[#2AABEE] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Jasur (Santexnik)</p>
                      <p className="text-xs text-slate-400">6 oy davomida yangilanmadi · ⚠️ Tekshirilmagan</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('database')}
                    className="text-xs bg-[#2AABEE] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#229ED9]"
                  >
                    Tekshirish
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BOT DEMO SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#2AABEE]" /> Telegram Guruh Bot Simulyatori
                  </h2>
                  <p className="text-xs text-slate-400">Bot 0-qavat filtr, AI klassifikator va 3 soniyada javob berishini test qiling.</p>
                </div>
                <button
                  onClick={() => setSimMessages([])}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  title="Tozalash"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Sample Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => handleSimulate('Karzinka oldida gazavik bormi?')}
                  className="px-3 py-1.5 rounded-xl bg-[#2AABEE]/10 text-[#2AABEE] font-medium whitespace-nowrap border border-[#2AABEE]/20"
                >
                  🔧 Gazavik?
                </button>
                <button
                  onClick={() => handleSimulate('Uyda gaz hidi kelyapti nima qilay')}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 font-medium whitespace-nowrap border border-rose-500/20"
                >
                  🚨 Gaz hidi!
                </button>
                <button
                  onClick={() => handleSimulate('Kafelchi kerak bozor orqasida')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-medium whitespace-nowrap border border-emerald-500/20"
                >
                  🧱 Kafelchi?
                </button>
              </div>

              {/* Chat Window */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 min-h-[320px] max-h-[420px] overflow-y-auto space-y-3 font-sans">
                {simMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-md ${
                        msg.sender === 'user'
                          ? 'bg-[#2AABEE] text-white rounded-br-none'
                          : msg.sender === 'emergency'
                          ? 'bg-rose-950/80 text-rose-200 border border-rose-600/50 rounded-bl-none'
                          : 'bg-[#1C2733] text-slate-100 border border-slate-700/60 rounded-bl-none'
                      }`}
                    >
                      {msg.isReply && (
                        <div className="text-[10px] text-[#2AABEE] font-bold border-l-2 border-[#2AABEE] pl-2 mb-1 opacity-90">
                          ↩ Reply to message
                        </div>
                      )}
                      {msg.text}

                      {msg.buttons && (
                        <div className="mt-3 pt-2 border-t border-slate-700/60 space-y-1.5">
                          {msg.buttons.map((bText, bIdx) => (
                            <div
                              key={bIdx}
                              className="w-full py-1.5 px-3 rounded-lg bg-white/10 text-center text-[11px] font-semibold text-[#2AABEE] border border-white/10 hover:bg-white/20 cursor-pointer"
                            >
                              {bText}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Guruhga savol yozing (masalan: gazavik bormi)..."
                  value={simQuery}
                  onChange={(e) => setSimQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                  className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-[#2AABEE]"
                />
                <button
                  onClick={() => handleSimulate()}
                  className="px-4 py-3 rounded-xl bg-[#2AABEE] text-white font-bold text-xs hover:bg-[#229ED9] flex items-center gap-1"
                >
                  <Send className="w-4 h-4" /> Yuborish
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: QO'SHISH */}
          {activeTab === 'add' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Yangi Usta yoki Obyekt Qo'shish</h2>
                <p className="text-xs text-slate-400 mb-4">Majburiy 4 maydon to'ldirilishi bilan yozuv saqlanadi.</p>

                <form onSubmit={handleAddSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Ism / Nom *</label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: Bahrom"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17212B] border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#2AABEE]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Kasb / Turi *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17212B] border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#2AABEE]"
                    >
                      <option value="Gazavik">Gazavik</option>
                      <option value="Santexnik">Santexnik</option>
                      <option value="Elektrik">Elektrik</option>
                      <option value="Kafelchi">Kafelchi</option>
                      <option value="Taksi">Taksi</option>
                      <option value="Dorixona">Dorixona</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Telefon Raqami *</label>
                    <input
                      type="text"
                      required
                      placeholder="+998 90 123 45 67"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17212B] border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#2AABEE]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Asosiy Mo'ljal *</label>
                    <select
                      value={formData.landmark}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17212B] border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#2AABEE]"
                    >
                      <option value="Korzinka">Korzinka orqasi</option>
                      <option value="Markaziy Bozor">Markaziy Bozor</option>
                      <option value="3-mavze">3-mavze</option>
                      <option value="Avtostansiya">Avtostansiya</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="verifiedCheck"
                      checked={formData.verified}
                      onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                      className="w-4 h-4 rounded text-[#2AABEE] focus:ring-[#2AABEE]"
                    />
                    <label htmlFor="verifiedCheck" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      ✅ Admin shaxsan ko'rishgan (Tasdiqlangan)
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] text-white font-bold text-sm shadow-md hover:opacity-95 transition-all mt-4"
                  >
                    Saqlash va Bazaga Qo'shish
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: SO'ROVLAR SIKLI */}
          {activeTab === 'requests' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Topilmagan So'rovlar Sikli</h2>
                  <p className="text-xs text-slate-400">Odamlar so'ragan, lekin bazada yo'q bo'lgan ustalar ro'yxati.</p>
                </div>
                <Filter className="w-5 h-5 text-slate-400" />
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold">14 marta so'ralgan</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">Kafelchi (Kafel ustasi)</h3>
                    <p className="text-xs text-slate-400">Hududlar: 3-mavze (6), Bozor (4)</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('add')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-emerald-600"
                  >
                    + Qo'shish
                  </button>
                </div>
                <p className="text-xs bg-slate-50 dark:bg-[#17212B] p-2.5 rounded-xl text-slate-600 dark:text-slate-300 italic">
                  "kechasi ishlaydigan kafelchi bormi?"
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: BAZA */}
          {activeTab === 'database' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Qidirish (ism, kasb, mo'ljal)..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#2AABEE]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {listings.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#2AABEE]/50 transition-all space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">{item.name}</h3>
                          {item.verified ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" /> ✅ Tasdiqlangan
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold">
                              ⚠️ Tekshirilmagan
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#2AABEE] font-semibold mt-0.5">🔧 {item.category}</p>
                      </div>

                      <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        <span>{item.rating}</span>
                        <span className="text-slate-400 font-normal">({item.reviewsCount})</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>📍 {item.landmark}</span>
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                          <Phone className="w-3.5 h-3.5 text-[#2AABEE]" />
                          <span>📞 {item.phone}</span>
                        </p>
                        <button
                          onClick={() => handleCopy(item.phone, item.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#17212B] text-[11px] font-medium text-[#2AABEE] hover:bg-[#2AABEE]/10 flex items-center gap-1"
                        >
                          {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          {copiedId === item.id ? 'Nusxalandi' : 'Nusxalash'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.badges.map((b, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-100 dark:bg-[#17212B] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          🏷 {b}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: YANA */}
          {activeTab === 'more' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Sozlamalar va Lug'at</h2>
                
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  <div className="py-3 flex justify-between items-center">
                    <span>🏢 Shahar</span>
                    <span className="font-semibold text-[#2AABEE]">Olmaliq</span>
                  </div>
                  <div className="py-3 flex justify-between items-center">
                    <span>👑 Obuna statusi</span>
                    <span className="font-semibold text-emerald-500">Asoschi (Umrbod)</span>
                  </div>
                  <div className="py-3 flex justify-between items-center">
                    <span>🌐 Bot Javob Tili</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">O'zbek (Lotin)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* EMERGENCY PREVIEW MODAL */}
        {activeEmergencyModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="w-full max-w-[500px] bg-slate-950 border border-rose-600/50 rounded-3xl p-5 space-y-4 text-white shadow-2xl">
              <div className="flex justify-between items-center border-b border-rose-900/50 pb-3">
                <div className="flex items-center gap-2 text-rose-500 font-extrabold text-sm uppercase tracking-wider">
                  <ShieldAlert className="w-5 h-5" /> 1-Daraja Favqulodda Shablon Preview
                </div>
                <button onClick={() => setActiveEmergencyModal(null)} className="p-1 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs space-y-3 leading-relaxed whitespace-pre-wrap font-sans bg-rose-950/40 p-4 rounded-2xl border border-rose-800/40 text-rose-100">
                🚨 GAZ HIDI — DARHOL:

                ❌ Chiroq, gugurt, zajigalka — yoqmang
                ❌ Vyklyuchatel, rozetka, telefonga tegmang
                ❌ Liftga kirmang

                ✅ Derazalarni keng oching
                ✅ Gaz kranini yoping
                ✅ Uydan chiqing

                📞 104 — Gaz avariya xizmati
                📞 112 — Yagona qutqaruv
                📞 +998 70 612 34 56 — Gaz idorasi

                ⚠️ Usta emas — avval avariya xizmatini chaqiring.
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900 p-3 rounded-xl">
                📌 **Qat'iy qoidalar**: Ushbu xabar AI tomonidan o'zgartirilmaydi, 15 minutda o'chmaydi va usta tavsiyasi kiritilmaydi.
              </div>
            </div>
          </div>
        )}

        {/* FLOATING AI ASSISTANT BUTTON */}
        <button
          onClick={() => setIsAiOpen(true)}
          aria-label="AI Yordamchi"
          className="fixed bottom-20 right-4 max-w-[680px] w-14 h-14 rounded-full bg-gradient-to-tr from-[#229ED9] via-[#2AABEE] to-cyan-400 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-20"
        >
          <Bot className="w-7 h-7" />
        </button>

        {/* AI COPILOT MODAL */}
        {isAiOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-fadeIn">
            <div className="w-full max-w-[680px] h-[80vh] bg-white dark:bg-[#17212B] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-[#229ED9] to-[#2AABEE] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-6 h-6" />
                  <div>
                    <h3 className="font-bold text-base">Admin AI Copilot</h3>
                    <p className="text-[10px] opacity-80">Kim Bor Boshqaruvchi AI</p>
                  </div>
                </div>
                <button onClick={() => setIsAiOpen(false)} className="p-1 rounded-lg hover:bg-white/20">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Quick Prompt Chips */}
              <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto text-xs bg-slate-50 dark:bg-[#1C2733]">
                <button
                  onClick={() => handleAiSend('Bugungi statistikani ko\'rsat')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#17212B] text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                >
                  📊 Statistika
                </button>
                <button
                  onClick={() => handleAiSend('Yangi usta qo\'shish')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#17212B] text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                >
                  ➕ Yangi Usta
                </button>
                <button
                  onClick={() => handleAiSend('Favqulodda raqamlarni tekshir')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#17212B] text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                >
                  🚨 Favqulodda Raqamlar
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#2AABEE] text-white rounded-br-none'
                          : 'bg-slate-100 dark:bg-[#1C2733] text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="AI'ga buyruq bering (masalan: statistika ko'rsat)..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1C2733] border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-[#2AABEE]"
                />
                <button
                  onClick={() => handleAiSend()}
                  className="p-2.5 rounded-xl bg-[#2AABEE] text-white hover:bg-[#229ED9]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-[680px] mx-auto bg-white/90 dark:bg-[#17212B]/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex justify-around items-center z-10">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              activeTab === 'home' ? 'text-[#2AABEE]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Bosh sahifa</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              activeTab === 'simulator' ? 'text-[#2AABEE]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-medium">Bot Demo</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              activeTab === 'add' ? 'text-[#2AABEE]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[10px] font-medium">Qo'shish</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              activeTab === 'requests' ? 'text-[#2AABEE]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">So'rovlar</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              activeTab === 'database' ? 'text-[#2AABEE]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Database className="w-5 h-5" />
            <span className="text-[10px] font-medium">Baza</span>
          </button>

          <button
            onClick={() => setActiveTab('more')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              activeTab === 'more' ? 'text-[#2AABEE]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Yana</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
