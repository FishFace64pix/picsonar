import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'ro',
        supportedLngs: ['en', 'ro'],
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
        detection: {
            // Only use localStorage — new visitors get 'ro' (fallbackLng).
            // Clicking the EN/RO button in Navbar saves to localStorage.
            order: ['localStorage'],
            caches: ['localStorage'],
        },
    });

export default i18n;
