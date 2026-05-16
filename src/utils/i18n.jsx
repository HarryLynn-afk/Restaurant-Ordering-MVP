import { createContext, useContext, useMemo, useState } from 'react';
import { translations } from './translations';

const LANGUAGE_STORAGE_KEYS = {
  customer: 'language_customer',
  admin: 'language_admin',
};

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = new Set(['en', 'my']);

const LanguageContext = createContext(null);

const getStoredLanguage = (scope) => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEYS[scope]);
  return SUPPORTED_LANGUAGES.has(stored) ? stored : DEFAULT_LANGUAGE;
};

const setStoredLanguage = (scope, language) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEYS[scope], language);
};

const lookupTranslation = (language, key) => {
  const parts = key.split('.');
  let value = translations[language];

  for (const part of parts) {
    value = value?.[part];
  }

  if (typeof value === 'string') return value;

  value = translations.en;
  for (const part of parts) {
    value = value?.[part];
  }

  return typeof value === 'string' ? value : key;
};

const interpolate = (template, values = {}) => (
  template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    return values[trimmed] == null ? '' : String(values[trimmed]);
  })
);

export const getLanguageLocale = (language) => (
  language === 'my' ? 'my-MM' : 'en-US'
);

export const LanguageProvider = ({ children }) => {
  const [customerLanguage, setCustomerLanguageState] = useState(() => getStoredLanguage('customer'));
  const [adminLanguage, setAdminLanguageState] = useState(() => getStoredLanguage('admin'));

  const setCustomerLanguage = (language) => {
    if (!SUPPORTED_LANGUAGES.has(language)) return;
    setCustomerLanguageState(language);
    setStoredLanguage('customer', language);
  };

  const setAdminLanguage = (language) => {
    if (!SUPPORTED_LANGUAGES.has(language)) return;
    setAdminLanguageState(language);
    setStoredLanguage('admin', language);
  };

  const value = useMemo(() => ({
    customerLanguage,
    adminLanguage,
    setCustomerLanguage,
    setAdminLanguage,
  }), [customerLanguage, adminLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

const useScopedLanguage = (scope) => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useScopedLanguage must be used within LanguageProvider');
  }

  const language = scope === 'admin' ? context.adminLanguage : context.customerLanguage;
  const setLanguage = scope === 'admin' ? context.setAdminLanguage : context.setCustomerLanguage;
  const locale = getLanguageLocale(language);

  const t = useMemo(() => (
    (key, values) => interpolate(lookupTranslation(language, key), values)
  ), [language]);

  return { language, setLanguage, locale, t };
};

export const useCustomerLanguage = () => useScopedLanguage('customer');
export const useAdminLanguage = () => useScopedLanguage('admin');
