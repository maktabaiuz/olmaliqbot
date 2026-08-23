import React, { useState, useEffect } from 'react';
import App from '../App';

interface ConsoleLog {
  id: string;
  type: 'log' | 'warn' | 'error';
  message: string;
  time: string;
}

const PREVIEW_KEY = 'kimbor_preview_sec_8f93a2';

export const PreviewScreen: React.FC = () => {
  const [keyInput, setKeyInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Preview Controls State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [simulatedRole, setSimulatedRole] = useState<'SUPER_ADMIN' | 'CITY_ADMIN' | 'MODERATOR_EDITOR' | 'MODERATOR_VIEWER'>('SUPER_ADMIN');
  const [activeScreenTab, setActiveScreenTab] = useState<
    'home' | 'add' | 'requests' | 'database' | 'moderators' | 'superadmin' | 'onboarding' | 'settings' | 'statistics' | 'bot_messages' | 'emergency' | 'dictionary'
  >('home');
  const [deviceFrame, setDeviceFrame] = useState<'iphone15' | 'iphonese' | 'ipad'>('iphone15');
  const [logs, setLogs] = useState<ConsoleLog[]>([]);

  // Check URL key param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const keyParam = params.get('key');
    if (keyParam === PREVIEW_KEY || localStorage.getItem('preview_auth_key') === PREVIEW_KEY) {
      setIsAuthenticated(true);
    }
  }, []);

  // Intercept console logs & uncaught errors
  useEffect(() => {
    if (!isAuthenticated) return;

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type: 'log' | 'warn' | 'error', args: any[]) => {
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      const time = new Date().toLocaleTimeString();
      setLogs(prev => [...prev.slice(-99), { id: Math.random().toString(), type, message: msg, time }]);
    };

    console.log = (...args) => { originalLog(...args); addLog('log', args); };
    console.warn = (...args) => { originalWarn(...args); addLog('warn', args); };
    console.error = (...args) => { originalError(...args); addLog('error', args); };

    const handleWindowError = (event: ErrorEvent) => {
      addLog('error', [event.message || 'Uncaught Exception']);
    };

    window.addEventListener('error', handleWindowError);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      window.removeEventListener('error', handleWindowError);
    };
  }, [isAuthenticated]);

  const handleKeyAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim() === PREVIEW_KEY) {
      localStorage.setItem('preview_auth_key', PREVIEW_KEY);
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  // Device frame dimensions
  const getDeviceDimensions = () => {
    switch (deviceFrame) {
      case 'iphonese': return { width: 375, height: 667, name: 'iPhone SE (375 × 667)' };
      case 'ipad': return { width: 540, height: 780, name: 'iPad Mini (540 × 780)' };
      case 'iphone15':
      default: return { width: 390, height: 844, name: 'iPhone 15 Pro (390 × 844)' };
    }
  };

  const dim = getDeviceDimensions();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full space-y-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-2xl font-bold">
              📱
            </div>
            <div>
              <h1 className="font-bold text-lg">Kim bor? Preview</h1>
              <p className="text-xs text-slate-400">Sinov sahifasiga kirish</p>
            </div>
          </div>

          <form onSubmit={handleKeyAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Maxfiy kalit</label>
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="Kalitni kiriting..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:border-sky-500 transition-all"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/50">
                ⚠️ Noto'g'ri kalit!
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Kirish
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden">
      {/* Top Header */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <h1 className="font-bold text-sm text-white">"Kim bor?" Telefon Ramkasi Sinov Sahifasi</h1>
            <p className="text-[11px] text-slate-400">Real-vaqt rejimida telefon tajribasini sinash</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            JONLI REJIM
          </span>
          <button
            onClick={() => {
              localStorage.removeItem('preview_auth_key');
              setIsAuthenticated(false);
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Chiqish
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row p-6 gap-6 items-start justify-center max-w-[1600px] mx-auto w-full">
        {/* Left Control Panel */}
        <aside className="w-full lg:w-80 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-6 shrink-0 shadow-xl">
          {/* 1. MAVZU (THEME) */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              1. Mavzu (Theme)
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTheme('dark')}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'dark' ? 'bg-slate-800 text-sky-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                🌙 Qorong'i
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'light' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                ☀️ Yorug'
              </button>
            </div>
          </div>

          {/* 2. ROL TANLASH (ROLE) */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              2. Rol tanlash (Simulated Role)
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'SUPER_ADMIN', label: '👑 Super-Admin', desc: 'Barcha huquqlar' },
                { id: 'CITY_ADMIN', label: '🏢 Shahar Admini', desc: 'Shahar ma\'lumotlari' },
                { id: 'MODERATOR_EDITOR', label: '✏️ Moderator (To\'ldiruvchi)', desc: 'Qo\'shish + Tasdiqlash' },
                { id: 'MODERATOR_VIEWER', label: '👁️ Moderator (Kuzatuvchi)', desc: 'Faqat ko\'rish' },
              ].map(roleItem => (
                <button
                  key={roleItem.id}
                  onClick={() => setSimulatedRole(roleItem.id as any)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                    simulatedRole === roleItem.id
                      ? 'bg-sky-500/10 border-sky-500/50 text-sky-400 font-semibold'
                      : 'bg-slate-950/60 border-slate-800/60 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="text-xs">{roleItem.label}</div>
                    <div className="text-[10px] text-slate-500">{roleItem.desc}</div>
                  </div>
                  {simulatedRole === roleItem.id && (
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 3. EKRAN TANLASH (SCREEN SELECTOR) */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              3. Ekran tanlash
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'home', label: '🏠 Bosh sahifa' },
                { id: 'add', label: '➕ Qo\'shish' },
                { id: 'requests', label: '💬 So\'rovlar' },
                { id: 'database', label: '🗄️ Baza' },
                { id: 'settings', label: '⚙️ Sozlamalar' },
                { id: 'statistics', label: '📊 Statistika' },
                { id: 'emergency', label: '🚨 Favqulodda' },
                { id: 'bot_messages', label: '🤖 Bot Matnlari' },
                { id: 'dictionary', label: '📖 Lug\'at' },
                { id: 'moderators', label: '👥 Moderatorlar' },
                { id: 'superadmin', label: '👑 Boshqaruv' },
              ].map(screen => (
                <button
                  key={screen.id}
                  onClick={() => setActiveScreenTab(screen.id as any)}
                  className={`p-2 rounded-xl text-xs font-semibold text-center border transition-all ${
                    activeScreenTab === screen.id
                      ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {screen.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. QURILMA RAMKASI (DEVICE FRAME) */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              4. Qurilma o'lchami
            </label>
            <select
              value={deviceFrame}
              onChange={e => setDeviceFrame(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
            >
              <option value="iphone15">iPhone 15 Pro (390 × 844)</option>
              <option value="iphonese">iPhone SE (375 × 667)</option>
              <option value="ipad">iPad Mini (540 × 780)</option>
            </select>
          </div>
        </aside>

        {/* Center: Simulated Mobile Phone Frame */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="text-xs text-slate-400 mb-2 font-mono flex items-center gap-2">
            <span>{dim.name}</span>
            <span>•</span>
            <span className="text-sky-400">Rol: {simulatedRole}</span>
          </div>

          {/* PHONE CONTAINER */}
          <div
            className="relative bg-slate-900 border-[10px] border-slate-800 rounded-[50px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300 flex flex-col"
            style={{ width: `${dim.width}px`, height: `${dim.height}px` }}
          >
            {/* Dynamic Island / Speaker Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-center gap-2 px-2 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
              <div className="w-2 h-2 rounded-full bg-blue-950/80" />
            </div>

            {/* Screen Content Wrapper */}
            <div className={`w-full h-full overflow-y-auto ${theme === 'dark' ? 'dark bg-[#121417]' : 'bg-slate-50'}`}>
              <App
                previewConfig={{
                  theme,
                  role: simulatedRole,
                  initialTab: activeScreenTab,
                }}
              />
            </div>

            {/* Home Indicator Bar */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-400/40 rounded-full z-50 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bottom Console Error & Debug Log Terminal */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 shrink-0 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span className="material-symbols-outlined text-amber-400 text-[18px]">terminal</span>
            KONSOL XATOLARI VA LOGLAR ({logs.length})
          </div>
          <button
            onClick={() => setLogs([])}
            className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
          >
            Tozalash
          </button>
        </div>

        <div className="bg-slate-950 rounded-xl p-3 h-32 overflow-y-auto font-mono text-xs space-y-1 border border-slate-800">
          {logs.length === 0 ? (
            <p className="text-slate-600 italic">Hech qanday xatolik qayd etilmadi. Barcha tizimlar to'g'ri ishlamoqda ✓</p>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className={`flex items-start gap-2 ${
                  log.type === 'error'
                    ? 'text-red-400 bg-red-950/30 px-1 rounded'
                    : log.type === 'warn'
                    ? 'text-amber-400'
                    : 'text-slate-300'
                }`}
              >
                <span className="text-slate-600 text-[10px] shrink-0">{log.time}</span>
                <span className="break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
