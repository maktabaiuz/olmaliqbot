import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFeedback } from '../context/FeedbackContext';
import { IosHeader } from '../components/ios/IosHeader';
import { IosSection, IosRow } from '../components/ios/IosCard';

interface SettingsLanguageThemeScreenProps {
  onBack: () => void;
}

/**
 * Faqat interfeys (admin panel) tilini va temasini boshqaradi — botning
 * o'zi hozircha faqat o'zbek tilida javob beradi, shuning uchun "bot javob
 * tili" bo'limi shu yerda YO'Q (soxta/tarjima qilinmagan tanlov ko'rsatish
 * o'rniga, real ishlaydigan narsa qoldirildi).
 *
 * "Saytdan kirish" bo'limi (2026-09, standalone web-login): admin shu
 * yerda o'zi tanlagan login o'rnatadi — shundan keyin admin panelga
 * Telegram tashqarisida, oddiy brauzerdan (masalan olmaliq.online) ham,
 * shu login + Telegram orqali allaqachon o'rnatilgan parol bilan kirish
 * mumkin bo'ladi.
 */
export const SettingsLanguageThemeScreen: React.FC<SettingsLanguageThemeScreenProps> = ({ onBack }) => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useFeedback();

  const [currentLoginUsername, setCurrentLoginUsername] = useState<string | null | undefined>(undefined);
  const [newLoginUsername, setNewLoginUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData || '';
    fetch('/api/auth/login-username', { headers: { 'x-init-data': initData } })
      .then((r) => r.json())
      .then((data) => setCurrentLoginUsername(data.loginUsername ?? null))
      .catch(() => setCurrentLoginUsername(null));
  }, []);

  const handleSaveLoginUsername = async () => {
    const clean = newLoginUsername.trim().toLowerCase();
    if (!clean) return;
    setIsSaving(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('/api/auth/set-login-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-init-data': initData },
        body: JSON.stringify({ loginUsername: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setCurrentLoginUsername(data.loginUsername);
        setNewLoginUsername('');
        showToast('Sayt-login o\'rnatildi', 'success');
      } else {
        showToast(data.message || 'Saqlashda xatolik yuz berdi', 'error');
      }
    } catch {
      showToast('Aloqa xatosi', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 -mx-4 px-4 pt-1 pb-16">
      <IosHeader title={t('settings_title')} subtitle={t('settings_subtitle')} onBack={onBack} backLabel={t('action_back')} />

      <IosSection title={t('settings_section_interface_lang')}>
        <IosRow onClick={() => setLanguage('uz')}>
          <span className="text-[15px] text-ios-label">{t('settings_lang_uz')}</span>
          {language === 'uz' && <span className="material-symbols-outlined text-[20px] text-ios-blue">check</span>}
        </IosRow>
        <IosRow onClick={() => setLanguage('ru')} last>
          <span className="text-[15px] text-ios-label">{t('settings_lang_ru')}</span>
          {language === 'ru' && <span className="material-symbols-outlined text-[20px] text-ios-blue">check</span>}
        </IosRow>
      </IosSection>

      <IosSection title={t('settings_section_theme')}>
        <IosRow onClick={() => setTheme('light')}>
          <span className="flex items-center gap-2.5 text-[15px] text-ios-label">
            <span className="material-symbols-outlined text-[18px] text-ios-orange">light_mode</span>
            {t('settings_theme_light')}
          </span>
          {theme === 'light' && <span className="material-symbols-outlined text-[20px] text-ios-blue">check</span>}
        </IosRow>
        <IosRow onClick={() => setTheme('dark')} last>
          <span className="flex items-center gap-2.5 text-[15px] text-ios-label">
            <span className="material-symbols-outlined text-[18px] text-ios-purple">dark_mode</span>
            {t('settings_theme_dark')}
          </span>
          {theme === 'dark' && <span className="material-symbols-outlined text-[20px] text-ios-blue">check</span>}
        </IosRow>
      </IosSection>

      <IosSection title="Saytdan kirish" footer="O'rnatgandan keyin admin panelga Telegram tashqarisida, oddiy brauzerdan ham shu login va (Telegram orqali o'rnatilgan) parolingiz bilan kirishingiz mumkin bo'ladi.">
        <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
          <p className="text-[13px] text-ios-label-secondary/70">Joriy login</p>
          <p className="text-[15px] text-ios-label mt-0.5">
            {currentLoginUsername === undefined ? '…' : currentLoginUsername || "Hali o'rnatilmagan"}
          </p>
        </div>
        <div className="px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            value={newLoginUsername}
            onChange={(e) => setNewLoginUsername(e.target.value)}
            placeholder="yangi_login"
            autoCapitalize="none"
            autoCorrect="off"
            className="flex-1 bg-transparent text-[15px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none"
          />
          <button
            onClick={handleSaveLoginUsername}
            disabled={isSaving || !newLoginUsername.trim()}
            className="text-ios-blue text-[15px] font-medium disabled:opacity-40 active:opacity-60"
          >
            {isSaving ? 'Saqlanmoqda…' : "O'rnatish"}
          </button>
        </div>
      </IosSection>
    </div>
  );
};
