import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import tr from './tr.json';

const SUPPORTED = ['en', 'tr'];

// Cihaz dili desteklenenlerden biriyse onu kullan, değilse İngilizce.
const deviceLang = getLocales()[0]?.languageCode ?? 'en';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, tr: { translation: tr } },
  lng: SUPPORTED.includes(deviceLang) ? deviceLang : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;