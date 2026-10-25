import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nManager } from 'react-native';
import { getLocales } from 'expo-localization';
import { getTypedSetting, setTypedSetting } from '../services/database/settings';
import { resolveLanguage, translate, type AppLanguage, type LanguagePreference, type TranslationKey,
  type TranslationParams } from './index';

export function systemLanguage(): AppLanguage {
  return getLocales()[0]?.languageCode?.toLowerCase() === 'ar' ? 'ar' : 'en';
}
export function applyLayoutDirection(language: AppLanguage): void {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(language === 'ar');
}

type LanguageContextValue = {
  language: AppLanguage;
  preference: LanguagePreference;
  isRTL: boolean;
  restartRequired: boolean;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  setLanguage: (next: LanguagePreference) => Promise<boolean>;
  resetLanguage: () => void;
};
const Context = createContext<LanguageContextValue | null>(null);

/** Resolves persisted language and RTL behind the native splash, before any routes render. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<LanguagePreference>('system');
  const [device, setDevice] = useState<AppLanguage>(systemLanguage);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    void getTypedSetting('language').then(saved => {
      if (!mounted) return;
      const initial = saved.ok ? saved.value : 'system';
      const detected = systemLanguage();
      setDevice(detected);
      applyLayoutDirection(resolveLanguage(initial, detected));
      setPreference(initial);
    }).catch(() => {
      if (mounted) applyLayoutDirection(resolveLanguage('system', systemLanguage()));
    }).finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);
  const language = resolveLanguage(preference, device);
  const value = useMemo<LanguageContextValue>(() => ({
    preference, language, isRTL: I18nManager.isRTL,
    restartRequired: (language === 'ar') !== I18nManager.isRTL,
    t: (key, params) => translate(language, key, params),
    setLanguage: async next => {
      const saved = await setTypedSetting('language', next);
      if (!saved.ok) return false;
      setPreference(next);
      applyLayoutDirection(resolveLanguage(next, systemLanguage()));
      return true;
    },
    resetLanguage: () => {
      setPreference('system');
      const detected = systemLanguage();
      setDevice(detected);
      applyLayoutDirection(detected);
    },
  }), [preference, language, device]);
  return <Context.Provider value={value}>{ready ? children : null}</Context.Provider>;
}
export function useLanguage(): LanguageContextValue {
  const context = useContext(Context);
  if (!context) throw new Error('useLanguage requires LanguageProvider');
  return context;
}
