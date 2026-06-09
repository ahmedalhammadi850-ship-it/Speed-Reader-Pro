import { useState, useEffect } from "react";
import { Lang } from "@/lib/i18n";

export function useLanguage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("sr-lang");
    if (stored === "ar" || stored === "en") return stored;
    const browser = navigator.language.startsWith("ar") ? "ar" : "en";
    return browser;
  });

  useEffect(() => {
    localStorage.setItem("sr-lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = () => setLang((l) => (l === "ar" ? "en" : "ar"));

  return { lang, toggle };
}
