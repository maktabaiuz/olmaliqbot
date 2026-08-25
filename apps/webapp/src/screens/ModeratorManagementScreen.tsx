import React, { useEffect, useState, useCallback } from 'react';

interface Moderator {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  username?: string;
  role: string;
  isSuspended: boolean;
  addedCount: number;
  createdAt: string;
}

interface Contribution {
  id: string;
  name: string;
  count: number;
  barWidth: number;
  isSuspended: boolean;
}

interface Props {
  initData: string;
  onBack?: () => void;
}

type MenuOpen = { id: string } | null;

const ROLE_LABELS: Record<string, string> = {
  MODERATOR_EDITOR: 'To\'ldiruvchi',
  MODERATOR_APPROVER: 'Tasdiqlash',
  MODERATOR_VIEWER: 'Kuzatuvchi',
};

export const ModeratorManagementScreen: React.FC<Props> = ({ initData, onBack }) => {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<MenuOpen>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    loginCode: string; tempPassword: string; name: string;
  } | null>(null);

  // Form state
  const [form, setForm] = useState({ firstName: '', lastName: '', phoneNumber: '', telegramId: '', role: 'MODERATOR_EDITOR' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const headers = { 'Content-Type': 'application/json', 'x-init-data': initData };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [modsRes, contRes] = await Promise.all([
        fetch('/api/admin/moderators', { headers }),
        fetch('/api/admin/contributions', { headers }),
      ]);
      const modsData = await modsRes.json();
      const contData = await contRes.json();
      if (modsData.success) setModerators(modsData.moderators);
      if (contData.success) setContributions(contData.contributions);
    } finally {
      setLoading(false);
    }
  }, [initData]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.firstName || !form.phoneNumber || !form.telegramId) {
      setFormError('Ism, telefon va Telegram ID majburiy');
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch('/api/admin/moderators', {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedCredentials({
          loginCode: data.moderator.loginCode,
          tempPassword: data.moderator.tempPassword,
          name: data.moderator.firstName,
        });
        setShowCreateForm(false);
        setForm({ firstName: '', lastName: '', phoneNumber: '', telegramId: '', role: 'MODERATOR_EDITOR' });
        load();
      } else {
        setFormError(data.message || 'Xatolik yuz berdi');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleSuspend = async (id: string, suspend: boolean) => {
    setMenuOpen(null);
    await fetch(`/api/admin/moderators/${id}/suspend`, {
      method: 'PUT', headers,
      body: JSON.stringify({ suspend }),
    });
    load();
  };

  const handleDelete = async (id: string, name: string) => {
    setMenuOpen(null);
    if (!window.confirm(`"${name}" ni o'chirishni tasdiqlaysizmi?\nQo'shgan yozuvlari bazada qoladi.`)) return;
    await fetch(`/api/admin/moderators/${id}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-24 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
        )}
        <div>
          <h1 className="font-bold text-base">Moderatorlar</h1>
          <p className="text-[11px] text-slate-400">{moderators.length} ta xodim</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="ml-auto flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 transition-colors text-white text-sm font-semibold px-3 py-2 rounded-xl"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Yangi
        </button>
      </div>

      <div className="p-4 space-y-5">

        {/* ─── HISSA BLOKI ────────────────────────────────── */}
        {contributions.length > 0 && (
          <section>
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Kim nechta qo'shdi</h2>
            <div className="bg-slate-800/60 rounded-2xl p-4 space-y-3">
              {contributions.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className={`text-sm font-medium w-20 truncate ${c.isSuspended ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {c.name}
                  </span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-blue-400 rounded-full transition-all duration-700"
                      style={{ width: `${(c.barWidth / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-sky-400 w-6 text-right">{c.count}</span>
                </div>
              ))}
              {contributions.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-2">Hali hech kim qo'shmagan</p>
              )}
            </div>
          </section>
        )}

        {/* ─── MODERATORLAR RO'YXATI ──────────────────────── */}
        <section>
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Xodimlar</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-slate-800/50 rounded-2xl p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : moderators.length === 0 ? (
            <div className="bg-slate-800/40 rounded-2xl p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2 block">people</span>
              <p className="text-slate-400 text-sm">Hali moderator yo'q</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-3 text-sky-400 text-sm font-semibold"
              >
                + Birinchi moderatorni qo'shing
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {moderators.map(mod => (
                <div
                  key={mod.id}
                  className={`relative bg-slate-800/60 rounded-2xl p-4 border transition-all ${
                    mod.isSuspended
                      ? 'border-red-800/40 opacity-60'
                      : 'border-slate-700/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 ${
                        mod.isSuspended ? 'bg-red-900/40 text-red-400' : 'bg-sky-500/20 text-sky-400'
                      }`}>
                        {(mod.firstName[0] || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${mod.isSuspended ? 'line-through text-slate-500' : ''}`}>
                            {mod.firstName} {mod.lastName}
                          </span>
                          {mod.isSuspended && (
                            <span className="text-[10px] bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full font-medium">
                              To'xtatilgan
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-slate-400 mt-0.5">{mod.phoneNumber}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                            {ROLE_LABELS[mod.role] || mod.role}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {mod.addedCount} ta qo'shgan
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ⋯ Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen?.id === mod.id ? null : { id: mod.id })}
                        className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px] text-slate-400">more_vert</span>
                      </button>

                      {menuOpen?.id === mod.id && (
                        <div className="absolute right-0 top-9 bg-slate-700 border border-slate-600 rounded-xl shadow-2xl z-30 w-44 py-1 animate-fadeIn">
                          <button
                            onClick={() => handleSuspend(mod.id, !mod.isSuspended)}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-600 transition-colors ${
                              mod.isSuspended ? 'text-green-400' : 'text-amber-400'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {mod.isSuspended ? 'play_circle' : 'pause_circle'}
                            </span>
                            {mod.isSuspended ? 'Hisobni tiklash' : 'To\'xtatish'}
                          </button>
                          <div className="border-t border-slate-600 my-1" />
                          <button
                            onClick={() => handleDelete(mod.id, mod.firstName)}
                            className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-red-400 hover:bg-slate-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">person_remove</span>
                            O'chirish
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ─── YARATISH MODALI ──────────────────────────────── */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
          <div className="w-full bg-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Yangi moderator</h2>
              <button onClick={() => { setShowCreateForm(false); setFormError(''); }} className="p-1.5 rounded-lg hover:bg-slate-700">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5">Ism *</label>
                  <input
                    type="text" inputMode="text"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Aziz"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-base outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5">Familiya</label>
                  <input
                    type="text" inputMode="text"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Karimov"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-base outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">Telefon *</label>
                <input
                  type="tel" inputMode="tel"
                  value={form.phoneNumber}
                  onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="+998901234567"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-base outline-none focus:border-sky-500 transition-colors"
                  enterKeyHint="next"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">Telegram ID *</label>
                <input
                  type="text" inputMode="numeric"
                  value={form.telegramId}
                  onChange={e => setForm(f => ({ ...f, telegramId: e.target.value }))}
                  placeholder="123456789"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-base outline-none focus:border-sky-500 transition-colors"
                  enterKeyHint="next"
                />
                <p className="text-[10px] text-slate-500 mt-1">@userinfobot ga /start yuboring — ID ni topasiz</p>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">Rol</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-base outline-none focus:border-sky-500 transition-colors"
                >
                  <option value="MODERATOR_EDITOR">To'ldiruvchi + Tasdiqlash</option>
                  <option value="MODERATOR_APPROVER">Faqat Tasdiqlash</option>
                  <option value="MODERATOR_VIEWER">Faqat Ko'rish</option>
                </select>
              </div>

              {formError && (
                <div className="bg-red-900/30 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-300">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-base mt-2"
              >
                {formLoading ? 'Yaratilmoqda...' : 'Moderator yaratish'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── HISOB YARATILDI — KIRISH MA'LUMOTLARI ────────── */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 border border-green-700/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-green-400 text-[22px]">check_circle</span>
              </div>
              <div>
                <h3 className="font-bold text-base">{createdCredentials.name} yaratildi!</h3>
                <p className="text-[11px] text-slate-400">Bu ma'lumotlarni yozib oling</p>
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Login kodi</p>
                <p className="text-2xl font-bold text-sky-400 tracking-widest mt-0.5">{createdCredentials.loginCode}</p>
              </div>
              <div className="border-t border-slate-700 pt-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Parol</p>
                <p className="text-xl font-mono font-bold text-amber-400 mt-0.5">{createdCredentials.tempPassword}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              ⚠️ Bu parol faqat bir marta ko'rsatiladi. Moderatorga shaxsan yetkazib bering.
            </p>

            <button
              onClick={() => setCreatedCredentials(null)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* Menu tashqarisiga bosgananda yopish */}
      {menuOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
};
