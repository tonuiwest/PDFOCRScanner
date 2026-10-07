import { AppState, I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { reloadAppAsync } from 'expo';
import { en, Dict, StringKey } from './en';
import es from './es'; import pt from './pt'; import fr from './fr'; import de from './de'; import ru from './ru';
import tr from './tr'; import ar from './ar'; import hi from './hi'; import id from './id'; import vi from './vi';
import ja from './ja'; import ko from './ko'; import zh from './zh';

export const LANGUAGES = {
  en: { name: 'English', dict: {} as Dict },
  es: { name: 'Español', dict: es }, pt: { name: 'Português', dict: pt }, fr: { name: 'Français', dict: fr },
  de: { name: 'Deutsch', dict: de }, ru: { name: 'Русский', dict: ru }, tr: { name: 'Türkçe', dict: tr },
  ar: { name: 'العربية', dict: ar }, hi: { name: 'हिन्दी', dict: hi }, id: { name: 'Bahasa Indonesia', dict: id },
  vi: { name: 'Tiếng Việt', dict: vi }, ja: { name: '日本語', dict: ja }, ko: { name: '한국어', dict: ko }, zh: { name: '简体中文', dict: zh },
} as const;
export type LangCode = keyof typeof LANGUAGES;
export type LangSetting = LangCode | 'auto';

const RTL_LANGS: LangCode[] = ['ar'];
const LANG_KEY = 'pref_language';

const deviceLocale = () => getLocales()[0];
const deviceLang = (): LangCode => {
  const code = deviceLocale()?.languageCode ?? 'en';
  return (code in LANGUAGES ? code : 'en') as LangCode;
};

let current: LangCode = deviceLang();
let setting: LangSetting = 'auto';

/** Translate a key, filling {placeholders}. Falls back to English for missing keys. */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  let s = LANGUAGES[current].dict[key] ?? en[key];
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

export const getLanguage = () => current;
export const getLanguageSetting = () => setting;
/** BCP-47 tag for Intl/date formatting, e.g. "pt-BR". */
export const getLocaleTag = () => (setting === 'auto' ? deviceLocale()?.languageTag : current) ?? 'en';
/** Device region (ISO country), e.g. "US". */
export const getRegion = () => deviceLocale()?.regionCode ?? null;

/** Loads the saved language and makes layout direction match it. Call once before first render. */
export async function initI18n() {
  try {
    const saved = (await AsyncStorage.getItem(LANG_KEY)) as LangSetting | null;
    if (saved && (saved === 'auto' || saved in LANGUAGES)) setting = saved;
  } catch {}
  current = setting === 'auto' ? deviceLang() : setting;
  await syncDirection();
}

const DIRECTION_RELOAD_KEY = 'rtl_reload_target';

async function syncDirection() {
  const rtl = RTL_LANGS.includes(current);
  if (I18nManager.isRTL === rtl) return;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  // Direction changes only apply after a reload. Reload at most once per target direction,
  // so a device that refuses the change can never get stuck in a reload loop.
  const target = rtl ? 'rtl' : 'ltr';
  const attempted = await AsyncStorage.getItem(DIRECTION_RELOAD_KEY).catch(() => null);
  if (attempted === target) return;
  await AsyncStorage.setItem(DIRECTION_RELOAD_KEY, target).catch(() => {});
  await reloadAppAsync().catch(() => {});
}

/** Changes the app language and reloads so every screen picks it up. */
export async function setLanguageSetting(next: LangSetting) {
  setting = next;
  await AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
  current = next === 'auto' ? deviceLang() : next;
  const rtl = RTL_LANGS.includes(current);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  await AsyncStorage.setItem(DIRECTION_RELOAD_KEY, rtl ? 'rtl' : 'ltr').catch(() => {});
  await reloadAppAsync().catch(() => {});
}

/** US, Canada and a few Latin American countries use Letter paper; everyone else uses A4. */
export const regionDefaultPageSize = (): 'A4' | 'Letter' =>
  ['US', 'CA', 'MX', 'PH', 'CL', 'CO', 'VE', 'GT', 'CR', 'PR'].includes(getRegion() ?? '') ? 'Letter' : 'A4';

// In "auto" mode, follow the device: if the system language changed while the app was in
// the background, reload so every screen re-renders in the new language.
AppState.addEventListener('change', (state) => {
  if (state === 'active' && setting === 'auto' && deviceLang() !== current) reloadAppAsync().catch(() => {});
});
