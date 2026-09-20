import React, { useEffect, useState, useCallback } from 'react';
import { IosHeader } from '../components/ios/IosHeader';
import { IosSection, IosCard, IosRow } from '../components/ios/IosCard';
import { useFeedback } from '../context/FeedbackContext';
import { useLanguage } from '../context/LanguageContext';
import { avatarColorForName } from '../utils/avatarColor';

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
  const { confirm } = useFeedback();
  const { t } = useLanguage();
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
    const ok = await confirm({
      title: `"${name}" ni o'chirishni tasdiqlaysizmi?`,
      message: "Qo'shgan yozuvlari bazada qoladi.",
      confirmLabel: t('action_delete'),
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/admin/moderators/${id}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div className="flex flex-col gap-6 -mx-4 px-4 pt-1 pb-16">
      <IosHeader
        title="Moderatorlar"
        subtitle={`${moderators.length} ta xodim`}
        onBack={onBack}
        backLabel={t('action_back')}
        trailing={
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1 text-ios-blue text-[15px] font-semibold active:opacity-50 transition-opacity"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Yangi
          </button>
        }
      />

      {/* ─── HISSA BLOKI ────────────────────────────────── */}
      {contributions.length > 0 && (
        <IosSection title="Kim nechta qo'shdi">
          <div className="p-4 space-y-3">
            {contributions.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <span className={`text-[13px] font-medium w-20 truncate ${c.isSuspended ? 'text-ios-label-secondary/50 line-through' : 'text-ios-label'}`}>
                  {c.name}
                </span>
                <div className="flex-1 h-2 bg-ios-fill/[0.15] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ios-blue rounded-full transition-all duration-700"
                    style={{ width: `${(c.barWidth / 10) * 100}%` }}
                  />
                </div>
                <span className="text-[13px] font-bold text-ios-blue w-6 text-right">{c.count}</span>
              </div>
            ))}
          </div>
        </IosSection>
      )}

      {/* ─── MODERATORLAR RO'YXATI ──────────────────────── */}
      <section className="flex flex-col gap-1.5">
        <h3 className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-4">Xodimlar</h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-ios-fill/[0.08] rounded-ios-lg h-20 animate-pulse" />
            ))}
          </div>
        ) : moderators.length === 0 ? (
          <IosCard>
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-[36px] text-ios-label-secondary/40 mb-2 block">people</span>
              <p className="text-ios-label-secondary/70 text-[15px]">Hali moderator yo'q</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-3 text-ios-blue text-[15px] font-semibold active:opacity-50"
              >
                + Birinchi moderatorni qo'shing
              </button>
            </div>
          </IosCard>
        ) : (
          <IosCard>
            {moderators.map((mod, idx) => (
              <IosRow key={mod.id} last={idx === moderators.length - 1} className={mod.isSuspended ? 'opacity-60' : ''}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-[15px]"
                    style={{ backgroundColor: avatarColorForName(`${mod.firstName} ${mod.lastName}`) }}
                  >
                    {(mod.firstName[0] || '?').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-[15px] ${mod.isSuspended ? 'line-through text-ios-label-secondary/70' : 'text-ios-label'}`}>
                        {mod.firstName} {mod.lastName}
                      </span>
                      {mod.isSuspended && (
                        <span className="text-[10px] bg-ios-red/15 text-ios-red px-2 py-0.5 rounded-full font-medium">
                          To'xtatilgan
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-ios-label-secondary/70 mt-0.5">{mod.phoneNumber}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-ios-fill/[0.12] text-ios-label-secondary px-2 py-0.5 rounded-full">
                        {ROLE_LABELS[mod.role] || mod.role}
                      </span>
                      <span className="text-[10px] text-ios-label-secondary/50">
                        {mod.addedCount} ta qo'shgan
                      </span>
                    </div>
                  </div>
                </div>

                {/* ⋯ Menu */}
                <div className="relative shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen?.id === mod.id ? null : { id: mod.id }); }}
                    className="p-2 rounded-full active:bg-ios-fill/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px] text-ios-label-secondary/70">more_vert</span>
                  </button>

                  {menuOpen?.id === mod.id && (
                    <div className="absolute right-0 top-9 bg-ios-card rounded-ios-lg shadow-lg z-30 w-48 py-1 overflow-hidden animate-fade-in">
                      <button
                        onClick={() => handleSuspend(mod.id, !mod.isSuspended)}
                        className={`w-full text-left px-4 py-2.5 text-[14px] flex items-center gap-2 active:bg-ios-fill/10 transition-colors ${
                          mod.isSuspended ? 'text-ios-green' : 'text-ios-orange'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {mod.isSuspended ? 'play_circle' : 'pause_circle'}
                        </span>
                        {mod.isSuspended ? 'Hisobni tiklash' : 'To\'xtatish'}
                      </button>
                      <div style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }} />
                      <button
                        onClick={() => handleDelete(mod.id, mod.firstName)}
                        className="w-full text-left px-4 py-2.5 text-[14px] flex items-center gap-2 text-ios-red active:bg-ios-fill/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">person_remove</span>
                        {t('action_delete')}
                      </button>
                    </div>
                  )}
                </div>
              </IosRow>
            ))}
          </IosCard>
        )}
      </section>

      {/* ─── YARATISH MODALI ──────────────────────────────── */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="w-full max-w-container-max mx-auto bg-ios-card rounded-t-ios-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[17px] text-ios-label">Yangi moderator</h2>
              <button onClick={() => { setShowCreateForm(false); setFormError(''); }} className="p-1.5 rounded-full active:bg-ios-fill/10">
                <span className="material-symbols-outlined text-[22px] text-ios-label-secondary/70">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-ios-label-secondary/70 mb-1.5">Ism *</label>
                  <input
                    type="text" inputMode="text"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Aziz"
                    className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-3 text-[16px] text-ios-label outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-ios-label-secondary/70 mb-1.5">Familiya</label>
                  <input
                    type="text" inputMode="text"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Karimov"
                    className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-3 text-[16px] text-ios-label outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-ios-label-secondary/70 mb-1.5">Telefon *</label>
                <input
                  type="tel" inputMode="tel"
                  value={form.phoneNumber}
                  onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="+998901234567"
                  className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-3 text-[16px] text-ios-label outline-none"
                  enterKeyHint="next"
                />
              </div>

              <div>
                <label className="block text-[12px] text-ios-label-secondary/70 mb-1.5">Telegram ID *</label>
                <input
                  type="text" inputMode="numeric"
                  value={form.telegramId}
                  onChange={e => setForm(f => ({ ...f, telegramId: e.target.value }))}
                  placeholder="123456789"
                  className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-3 text-[16px] text-ios-label outline-none"
                  enterKeyHint="next"
                />
                <p className="text-[11px] text-ios-label-secondary/60 mt-1">@userinfobot ga /start yuboring — ID ni topasiz</p>
              </div>

              <div>
                <label className="block text-[12px] text-ios-label-secondary/70 mb-1.5">Rol</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-3 text-[16px] text-ios-label outline-none"
                >
                  <option value="MODERATOR_EDITOR">To'ldiruvchi + Tasdiqlash</option>
                  <option value="MODERATOR_APPROVER">Faqat Tasdiqlash</option>
                  <option value="MODERATOR_VIEWER">Faqat Ko'rish</option>
                </select>
              </div>

              {formError && (
                <div className="bg-ios-red/10 rounded-ios px-4 py-3 text-[13px] text-ios-red">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-ios-blue active:opacity-70 text-white font-medium py-3.5 rounded-ios text-[16px] transition-opacity disabled:opacity-40 mt-2"
              >
                {formLoading ? 'Yaratilmoqda...' : 'Moderator yaratish'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── HISOB YARATILDI — KIRISH MA'LUMOTLARI ────────── */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-ios-card rounded-ios-lg p-6 w-full max-w-sm space-y-4 shadow-lg animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ios-green/15 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-ios-green text-[22px]">check_circle</span>
              </div>
              <div>
                <h3 className="font-semibold text-[17px] text-ios-label">{createdCredentials.name} yaratildi!</h3>
                <p className="text-[12px] text-ios-label-secondary/70">Bu ma'lumotlarni yozib oling</p>
              </div>
            </div>

            <div className="bg-ios-fill/[0.06] rounded-ios-lg p-4 space-y-3">
              <div>
                <p className="text-[10px] text-ios-label-secondary/60 uppercase tracking-wider">Login kodi</p>
                <p className="text-2xl font-bold text-ios-blue tracking-widest mt-0.5">{createdCredentials.loginCode}</p>
              </div>
              <div className="pt-3" style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
                <p className="text-[10px] text-ios-label-secondary/60 uppercase tracking-wider">Parol</p>
                <p className="text-xl font-mono font-bold text-ios-orange mt-0.5">{createdCredentials.tempPassword}</p>
              </div>
            </div>

            <p className="text-[11px] text-ios-label-secondary/70 text-center">
              ⚠️ Bu parol faqat bir marta ko'rsatiladi. Moderatorga shaxsan yetkazib bering.
            </p>

            <button
              onClick={() => setCreatedCredentials(null)}
              className="w-full bg-ios-fill/[0.10] active:bg-ios-fill/20 text-ios-label font-medium py-3 rounded-ios transition-colors"
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
