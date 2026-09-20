/**
 * Admin panel interfeys tarjimalari (o'zbek/rus). Bot foydalanuvchilarga
 * yuboradigan xabarlar BU YERGA kirmaydi — faqat admin panelning o'zi
 * (tugmalar, menyular, sarlavhalar) tarjima qilinadi. Yangi ekran
 * qayta ishlanganda shu yerga kalit qo'shib, useLanguage().t(key) orqali
 * ishlatiladi. Hali tarjima qilinmagan matn — o'zbekcha ko'rinadi
 * (fallback), bu xato emas, bosqichma-bosqich kengaytiriladi.
 */
export type TranslationKey = keyof typeof translations;

export const translations = {
  // Pastki navigatsiya
  nav_home: { uz: 'Bosh sahifa', ru: 'Главная' },
  nav_database: { uz: 'Baza', ru: 'База' },
  nav_users: { uz: 'Userlar', ru: 'Пользователи' },
  nav_more: { uz: 'Yana', ru: 'Ещё' },

  // "Yana" (More) — bo'lim nomlari
  more_title: { uz: 'Yana', ru: 'Ещё' },
  more_section_catalog: { uz: 'Katalog', ru: 'Каталог' },
  more_section_city: { uz: 'Shahar', ru: 'Город' },
  more_section_moderation: { uz: 'Moderatsiya', ru: 'Модерация' },
  more_section_system: { uz: 'Tizim', ru: 'Система' },
  more_item_categories: { uz: 'Kategoriyalar', ru: 'Категории' },
  more_item_landmarks: { uz: 'Mo‘ljallar', ru: 'Ориентиры' },
  more_item_groups: { uz: 'Guruhlar', ru: 'Группы' },
  more_item_community_link: { uz: 'Kanal/Guruh havolasi', ru: 'Ссылка на канал/группу' },
  more_item_emergency: { uz: 'Favqulodda raqamlar', ru: 'Экстренные номера' },
  more_item_moderators: { uz: 'Moderatorlar', ru: 'Модераторы' },
  more_item_useful_bots: { uz: 'Moderatsiya filtrlari', ru: 'Фильтры модерации' },
  more_item_moderation_logs: { uz: 'Moderatsiya jurnali', ru: 'Журнал модерации' },
  more_item_broadcast: { uz: 'Xabar yuborish', ru: 'Рассылка' },
  more_item_bot_messages: { uz: 'Bot xabarlari', ru: 'Сообщения бота' },
  more_item_dictionary: { uz: 'Umumiy lug‘at', ru: 'Общий словарь' },
  more_item_settings_lang_theme: { uz: 'Til va mavzu', ru: 'Язык и тема' },
  more_item_logout: { uz: 'Chiqish', ru: 'Выйти' },

  // Til va mavzu ekrani
  settings_title: { uz: 'Til va Mavzu', ru: 'Язык и тема' },
  settings_subtitle: { uz: 'Interfeys sozlamalari', ru: 'Настройки интерфейса' },
  settings_section_interface_lang: { uz: 'Interfeys tili', ru: 'Язык интерфейса' },
  settings_section_theme: { uz: 'Interfeys ko‘rinishi', ru: 'Внешний вид' },
  settings_theme_light: { uz: 'Kunduzgi rejim', ru: 'Светлая тема' },
  settings_theme_dark: { uz: 'Tungi rejim', ru: 'Тёмная тема' },
  settings_lang_uz: { uz: 'O‘zbekcha', ru: 'Узбекский' },
  settings_lang_ru: { uz: 'Ruscha', ru: 'Русский' },

  // Umumiy amallar
  action_save: { uz: 'Saqlash', ru: 'Сохранить' },
  action_cancel: { uz: 'Bekor qilish', ru: 'Отмена' },
  action_delete: { uz: 'O‘chirish', ru: 'Удалить' },
  action_edit: { uz: 'Tahrirlash', ru: 'Изменить' },
  action_done: { uz: 'Tayyor', ru: 'Готово' },
  action_back: { uz: 'Orqaga', ru: 'Назад' },
  action_search: { uz: 'Qidirish', ru: 'Поиск' },
  action_loading: { uz: 'Yuklanmoqda…', ru: 'Загрузка…' },
  action_saved: { uz: 'Saqlandi', ru: 'Сохранено' },
  action_error: { uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка' },

  // Auth
  auth_login_title: { uz: 'Kirish', ru: 'Вход' },
  auth_password_placeholder: { uz: 'Parol', ru: 'Пароль' },
  auth_login_button: { uz: 'Kirish', ru: 'Войти' },
  auth_setup_title: { uz: 'Parolni o‘rnatish', ru: 'Установите пароль' },

  // Bosh sahifa
  dashboard_title: { uz: 'Bosh sahifa', ru: 'Главная' },
} as const;
