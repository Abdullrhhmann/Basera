import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const VARIANT_CLASSES = {
  desktop:
    "hidden lg:inline-flex items-center justify-center text-white hover:border-[#A88B32] hover:text-[#A88B32] hover:bg-[#A88B32]/10",
  navbar:
    "inline-flex items-center justify-center text-white hover:border-[#A88B32] hover:text-[#A88B32] hover:bg-[#A88B32]/10",
  mobile:
    "w-full text-white text-sm text-center mt-2 hover:border-[#A88B32] hover:text-[#A88B32] hover:bg-[#A88B32]/10",
};

const LanguageSwitcher = ({ variant = "desktop" }) => {
  const { i18n, t } = useTranslation();

  const currentLanguage = i18n.language?.split("-")[0] || "en";
  const isArabic = currentLanguage === "ar";
  const nextLanguage = isArabic ? "en" : "ar";

  const labels = useMemo(() => {
    const toggleLabel = isArabic ? t("language.english") : t("language.arabic");
    const ariaLabel = isArabic
      ? t("language.switchToEnglish")
      : t("language.switchToArabic");
    return { toggleLabel, ariaLabel };
  }, [isArabic, t]);

  const handleChangeLanguage = () => {
    i18n.changeLanguage(nextLanguage);
  };

  const baseClasses =
    "rounded-xl border border-white/30 px-4 py-2 font-heading text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-300";
  const variantClasses = VARIANT_CLASSES[variant] || VARIANT_CLASSES.desktop;
  const buttonLabel =
    variant === "navbar" ? nextLanguage.toUpperCase() : labels.toggleLabel;

  return (
    <button
      type="button"
      onClick={handleChangeLanguage}
      className={`${baseClasses} ${variantClasses}`}
      aria-label={labels.ariaLabel}
    >
      {buttonLabel}
    </button>
  );
};

LanguageSwitcher.propTypes = {
  variant: PropTypes.oneOf(["desktop", "navbar", "mobile"]),
};

export default LanguageSwitcher;

