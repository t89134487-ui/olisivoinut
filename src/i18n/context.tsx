import { createContext, useContext, createSignal, JSX } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import en from "./en.json";
import fi from "./fi.json";

const dict = { en, fi };
export type Locale = keyof typeof dict;

const I18nContext = createContext<{
  locale: () => Locale;
  setLocale: (l: Locale) => void;
  t: i18n.NullableTranslator<typeof en>;
}>();

export function I18nProvider(props: { children: JSX.Element }) {
  const [locale, setLocale] = createSignal<Locale>("en");
  const t = i18n.translator(() => dict.en, i18n.resolveTemplate);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {props.children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
