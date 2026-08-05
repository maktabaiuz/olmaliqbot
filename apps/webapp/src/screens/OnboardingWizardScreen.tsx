import React, { useState } from 'react';

export interface OnboardingWizardScreenProps {
  onSubmitApplication: (appData: {
    fullName: string;
    phone: string;
    cityName: string;
    groupLink: string;
    groupName: string;
    groupMembersCount: number;
    channelLink: string;
    channelName: string;
    channelSubsCount: number;
    about: string;
  }) => Promise<void>;
}

export const OnboardingWizardScreen: React.FC<OnboardingWizardScreenProps> = ({
  onSubmitApplication,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // 1-qadam fields
  const [fullName, setFullName] = useState('');
  const [phone] = useState('+998 90 123 45 67'); // Telegram Contact Shared
  const [cityName, setCityName] = useState('Olmaliq');

  // 2-qadam fields
  const [isGroupConnected, setIsGroupConnected] = useState(false);
  const [groupName] = useState('Olmaliq Rasmiy Chat');
  const [groupMembersCount] = useState(1420);
  const [groupLink] = useState('https://t.me/olmaliq_chat');

  const [channelLink, setChannelLink] = useState('https://t.me/olmaliq_news');
  const [channelName] = useState('Olmaliq Yangiliklari');
  const [channelSubsCount] = useState(3850);

  // 3-qadam fields
  const [about, setAbout] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGroupConnect = () => {
    // Open Telegram startgroup link
    window.open(
      'https://t.me/aikimyo_bot?startgroup=true&admin=post_messages+edit_messages+delete_messages',
      '_blank'
    );
    // Simulate immediate connection check
    setTimeout(() => {
      setIsGroupConnected(true);
    }, 1500);
  };

  const handleFinalSubmit = async () => {
    if (!about.trim()) return;
    setIsSubmitting(true);

    try {
      await onSubmitApplication({
        fullName,
        phone,
        cityName,
        groupLink,
        groupName,
        groupMembersCount,
        channelLink,
        channelName,
        channelSubsCount,
        about,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans max-w-container-max mx-auto p-4 flex flex-col justify-between">
      <div>
        {/* Wizard Header & Step Progress Bar */}
        <div className="pt-2 pb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
              {step}-qadam / 3
            </span>
            <span className="text-xs text-slate-400">
              {step === 1 ? "Shaxsiy ma'lumotlar" : step === 2 ? 'Guruh va Kanal' : 'Yakuniy ariza'}
            </span>
          </div>

          {/* Progress Indicator */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-brand-500 h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: SHAXS */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-100">1-qadam: Shaxsiy ma'lumotlar</h2>
              <p className="text-xs text-slate-400">F.I.SH, telefon va shahar nomini kiriting</p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">F.I.SH (Ism va Familiya)</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masalan: Bobur Mahmudov"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Telefon raqam (Telegram Contact)</label>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300">
                  <span className="text-emerald-400 text-lg">📱</span>
                  <input
                    type="text"
                    value={phone}
                    readOnly
                    className="w-full bg-transparent text-slate-300 focus:outline-none font-mono text-sm cursor-not-allowed opacity-90"
                  />
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    ✅ Telegram Kontakt
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Telefon raqami Telegram kontaktingizdan avtomatik olindi.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Shahar / tuman nomi</label>
                <input
                  type="text"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="Masalan: Olmaliq"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: GURUH VA KANAL */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-100">2-qadam: Guruh va Kanal ulash</h2>
              <p className="text-xs text-slate-400">Telegram guruhingizga botni admin qilib qo'shing va kanal havolasini kiriting</p>
            </div>

            <div className="space-y-4 pt-2">
              {/* Group Connection */}
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">👥 Telegram Guruh</span>
                  {isGroupConnected && (
                    <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-medium">
                      ✅ Ulandi · Bot Admin
                    </span>
                  )}
                </div>

                {isGroupConnected ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-emerald-300">✅ {groupName} ulandi</p>
                    <p className="text-slate-400 text-[11px]">A'zolar soni: <b>{groupMembersCount} ta</b> · Bot Adminlik huquqi tasdiqlandi</p>
                  </div>
                ) : (
                  <button
                    onClick={handleGroupConnect}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <span>➕ Guruhga qo'shish</span>
                  </button>
                )}
              </div>

              {/* Channel Connection */}
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-semibold text-slate-300">📢 Telegram Kanal Havolasi (Majburiy)</span>
                <input
                  type="text"
                  value={channelLink}
                  onChange={(e) => setChannelLink(e.target.value)}
                  placeholder="https://t.me/kanal_nomi"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />

                {channelLink && (
                  <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-brand-300">✅ Kanal tekshirildi: {channelName}</p>
                    <p className="text-slate-400 text-[11px]">Obunachilar soni: <b>{channelSubsCount} ta</b></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: YAKUN */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-100">3-qadam: O'zingiz haqida</h2>
              <p className="text-xs text-slate-400">Super-Admin ko'rib chiqishi uchun 2-3 gap yozing</p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">O'zingiz va tajribangiz haqida</label>
                <textarea
                  rows={4}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Masalan: Men Olmaliq shahri kanali administratoriman. 5 yildan beri shahar yangiliklarini yuritaman..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Summary Preview */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs space-y-2 text-slate-300">
                <p className="font-bold text-slate-100 border-b border-slate-700 pb-1.5">📋 Ariza ma'lumotlari xulosasi:</p>
                <p>• Arizachi: <b>{fullName}</b> ({phone})</p>
                <p>• Shahar: <b>{cityName}</b></p>
                <p>• Guruh: <b>{groupName}</b> ({groupMembersCount} a'zo)</p>
                <p>• Kanal: <b>{channelName}</b> ({channelSubsCount} obunachi)</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Navigation Buttons */}
      <div className="pt-6 pb-2 flex items-center justify-between gap-3 border-t border-slate-800">
        {step > 1 ? (
          <button
            onClick={() => setStep((step - 1) as any)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-5 rounded-xl text-xs transition-all border border-slate-700"
          >
            ← Ortga
          </button>
        ) : <div />}

        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 1 && (!fullName.trim() || !cityName.trim())) {
                alert("Iltimos, barcha maydonlarni to'ldiring!");
                return;
              }
              if (step === 2 && (!isGroupConnected || !channelLink.trim())) {
                alert("Iltimos, guruhni ulang va kanal havolasini kiriting!");
                return;
              }
              setStep((step + 1) as any);
            }}
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-6 rounded-xl text-xs transition-all shadow-lg ml-auto"
          >
            Davom etish →
          </button>
        ) : (
          <button
            onClick={handleFinalSubmit}
            disabled={isSubmitting || !about.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl text-xs transition-all shadow-xl ml-auto flex items-center gap-2"
          >
            {isSubmitting ? 'Yuborilmoqda...' : '🚀 Arizani Yuborish'}
          </button>
        )}
      </div>
    </div>
  );
};
