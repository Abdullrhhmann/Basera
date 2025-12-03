import React from "react";
import { useTranslation } from "react-i18next";

const FloatingLanguageToggle = () => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language?.split("-")[0] || "en";
  const nextLang = currentLang === "ar" ? "en" : "ar";
  const isRTL = currentLang === "ar";

  const handleToggle = () => {
    i18n.changeLanguage(nextLang);
  };

  const ariaLabel =
    nextLang === "ar"
      ? t("language.switchToArabic")
      : t("language.switchToEnglish");

  return (
    <div
      className={`fixed z-[100] ${
        isRTL ? "left-4" : "right-4"
      } bottom-6 flex flex-col items-${isRTL ? "start" : "end"} gap-2`}
    >
      <span className="text-xs font-medium text-white/70 bg-[#131c2b]/60 px-3 py-1 rounded-full backdrop-blur-sm shadow-lg">
        {t(`language.${currentLang === "ar" ? "arabic" : "english"}`)}
      </span>
      <button
        type="button"
        onClick={handleToggle}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#A88B32] to-[#C09C3D] text-white font-bold text-sm md:text-base shadow-[0_10px_30px_-10px_rgba(168,139,50,0.7)] hover:shadow-[0_12px_40px_-8px_rgba(168,139,50,0.8)] transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A88B32] focus:ring-offset-black/50"
        aria-label={ariaLabel}
      >
        {nextLang.toUpperCase()}
      </button>
    </div>
  );
};

export default FloatingLanguageToggle;

