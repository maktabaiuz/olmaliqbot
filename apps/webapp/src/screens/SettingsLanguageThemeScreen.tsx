import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
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
 */
export const SettingsLanguageThemeScreen: React.FC<SettingsLanguageThemeScreenProps> = ({ onBack }) => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

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
    </div>
  );
};
