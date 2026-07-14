import { createContext, useContext, useState, useEffect } from "react";
import { translations, ENUM_LABELS } from "@/org/lib/i18n";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("smk_lang") || "fr");

  useEffect(() => {
    localStorage.setItem("smk_lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key) => translations[lang][key] ?? key;
  const label = (val) => ENUM_LABELS[lang][val] ?? val;
  const toggleLang = () => setLang((l) => (l === "fr" ? "en" : "fr"));

  return (
    <LangContext.Provider value={{ lang, setLang, toggleLang, t, label }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
