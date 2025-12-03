import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { FiArrowRight, FiBarChart2, FiUser, FiPlus } from "../../icons/feather";
import { useTranslation } from "react-i18next";

const NAV_LINKS = [
  { labelKey: "navigation.home", path: "/" },
  { labelKey: "navigation.ourDevelopments", scrollTo: "listings" },
  { labelKey: "navigation.developers", path: "/developers" },
  { labelKey: "navigation.compounds", path: "/compounds" },
  { labelKey: "navigation.leadForm", path: "/lead-form" },
  { labelKey: "navigation.careers", path: "/careers" },
  { labelKey: "navigation.blog", path: "/blog" },
  { labelKey: "navigation.about", path: "/about" },
  { labelKey: "navigation.contact", path: "/contact" },
];

const WebsiteNavbar = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAdmin, isAdminRole, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Check if user has any admin-type role
  const hasAdminAccess = isAdminRole();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Don't show navbar on admin pages
  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/profile');
  
  if (isAdminPage) {
    return null;
  }

  const handleScrollTo = (id) => {
    const element = document.getElementById(id);
    if (!element) return;

    const yOffset = -96;
    const y = element.getBoundingClientRect().top + window.scrollY + yOffset;

    window.scrollTo({ top: y, behavior: "smooth" });
    setMobileNavOpen(false);
  };

  const scrollToLead = () => handleScrollTo("lead-capture-anchor");

  const handleOurDevelopments = () => {
    if (location.pathname === '/') {
      // If already on home page, just scroll to listings
      handleScrollTo("listings");
    } else {
      // If on other pages, navigate to home and then scroll
      navigate('/');
      // Use setTimeout to ensure the page loads before scrolling
      setTimeout(() => {
        const element = document.getElementById("listings");
        if (element) {
          const yOffset = -96;
          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
    }
    setMobileNavOpen(false);
  };

  const renderNavLinks = (isMobile = false) =>
    NAV_LINKS.map((link) => {
      const textTreatment = isRTL ? "rtl-menu-link" : "uppercase tracking-wide";
      const baseClasses = isMobile
        ? `px-4 py-3 font-heading text-sm font-medium transition-all duration-300 rounded-xl hover:bg-white/10 ${textTreatment}`
        : `px-4 py-2 font-heading text-sm font-medium transition-all duration-300 rounded-xl hover:bg-white/10 ${textTreatment}`;
      const colorClasses = "text-white/90 hover:text-white";

      const handleClick = () => {
        if (link.scrollTo === "listings") {
          handleOurDevelopments();
        } else if (link.scrollTo) {
          handleScrollTo(link.scrollTo);
        } else if (link.path) {
          setIsNavigating(true);
          navigate(link.path);
          setMobileNavOpen(false);
          // Reset navigation state after a short delay
          setTimeout(() => setIsNavigating(false), 1000);
        }
      };

      return (
        <button
          key={link.labelKey}
          type="button"
          onClick={handleClick}
          disabled={isNavigating}
          className={`${baseClasses} ${colorClasses} ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isNavigating && link.path ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              <span>{t("common.loading")}</span>
            </div>
          ) : (
            t(link.labelKey)
          )}
        </button>
      );
    });

  const renderAuthButtons = (isMobile = false) => {
    if (isAuthenticated) {
      return (
        <div
          className={`flex items-center gap-3 ${isMobile ? "flex-col" : ""}`}
        >
          {!hasAdminAccess && (
            <Link
              to="/submit-property"
              className={`rounded-xl border border-white/30 px-6 py-3 font-heading text-xs font-semibold text-white transition-all duration-300 hover:border-[#A88B32] hover:text-[#A88B32] hover:bg-[#A88B32]/10 ${
                isRTL ? "rtl-menu-link" : "uppercase tracking-[0.2em]"
              } ${isMobile ? "text-white text-sm text-center w-full py-4" : ""}`}
              onClick={() => isMobile && setMobileNavOpen(false)}
            >
              {t("navigation.submitProperty")}
            </Link>
          )}
          {!hasAdminAccess && (
            <Link
              to="/profile"
              className={`rounded-xl border border-white/30 p-3 font-heading text-xs font-semibold transition-all duration-300 hover:border-[#A88B32] hover:text-[#A88B32] hover:bg-[#A88B32]/10 ${
                isRTL ? "rtl-menu-link" : "uppercase tracking-[0.2em]"
              } ${isMobile
                  ? "text-white w-full flex items-center justify-center gap-2 py-4"
                  : "text-white"
                }`}
              onClick={() => isMobile && setMobileNavOpen(false)}
              aria-label={t("navigation.profile")}
            >
              <FiUser className="h-4 w-4" />
              {isMobile && <span>{t("navigation.profile")}</span>}
            </Link>
          )}
          {hasAdminAccess && (
            <Link
              to="/admin"
              className={`rounded-xl bg-[#A88B32] p-3 text-white shadow-[0_10px_30px_-15px_rgba(168,139,50,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#C09C3D] hover:shadow-[0_15px_40px_-15px_rgba(168,139,50,0.9)] ${isMobile
                  ? "w-full flex items-center justify-center gap-2 py-4"
                  : ""
                }`}
              onClick={() => isMobile && setMobileNavOpen(false)}
              aria-label={t("navigation.dashboard")}
            >
              <FiBarChart2 className="h-4 w-4" />
              {isMobile && <span>{t("navigation.dashboard")}</span>}
            </Link>
          )}
          <button
            onClick={() => {
              logout();
              if (isMobile) setMobileNavOpen(false);
            }}
            className={`rounded-xl bg-[#202D46] px-6 py-3 font-heading text-xs font-semibold text-white shadow-[0_10px_30px_-15px_rgba(32,45,70,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1B243A] ${
              isRTL ? "rtl-menu-link" : "uppercase tracking-[0.2em]"
            } ${isMobile ? "w-full text-sm py-4" : ""
              }`}
          >
            {t("navigation.logout")}
          </button>
        </div>
      );
    }

    return (
      <Link
        to="/login"
        className={`rounded-xl border border-white/30 px-6 py-3 font-heading text-xs font-semibold transition-all duration-300 hover:border-[#A88B32] hover:text-[#A88B32] hover:bg-[#A88B32]/10 ${
          isRTL ? "rtl-menu-link" : "uppercase tracking-[0.2em]"
        } ${isMobile ? "text-white text-sm text-center w-full py-4" : "text-white"
          }`}
        onClick={() => isMobile && setMobileNavOpen(false)}
      >
        {t("navigation.login")}
      </Link>
    );
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div
          className={`flex items-center justify-between rounded-2xl border px-6 py-4 transition-all duration-500 ${isScrolled
              ? "border-white/30 bg-gradient-to-r from-[#121f36]/95 via-[#202D46]/90 to-[#2E3D32]/95 shadow-[0_20px_60px_-20px_rgba(12,18,32,0.8)] backdrop-blur-2xl"
              : "border-white/20 bg-gradient-to-r from-[#121f36]/80 via-[#202D46]/75 to-[#2E3D32]/80 backdrop-blur-2xl"
            }`}
        >
          {/* Logo */}
          <div className="flex h-18 w-18 items-center justify-center ">
            <img
              style={{ width: "100px", height: "50px" }}
              src="/logos/basiralogo.png"
              alt="Basera Real Estate"
              className="h-12 w-12 object-contain"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 lg:flex">
            {renderNavLinks()}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-4 lg:flex">
            <LanguageSwitcher variant="navbar" />
            {renderAuthButtons()}
            {!isAdmin && (
              <button
                type="button"
                onClick={scrollToLead}
                className={`group rounded-full bg-[#A88B32] px-8 py-3 font-heading text-sm font-semibold text-white shadow-[0_10px_30px_-15px_rgba(168,139,50,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#C09C3D] hover:shadow-[0_15px_40px_-15px_rgba(168,139,50,0.9)] ${
                  isRTL ? "rtl-menu-link" : "uppercase tracking-[0.2em]"
                }`}
              >
                <span className="flex items-center gap-2">
                  {t("cta.inquireNow")}
                  <FiArrowRight
                    className={`h-4 w-4 transition-transform ${
                      isRTL ? "scale-x-[-1] group-hover:-translate-x-1" : "group-hover:translate-x-1"
                    }`}
                  />
                </span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button and Language Switcher */}
          <div className={`flex items-center gap-2 lg:hidden ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Language Button */}
            <button
              type="button"
              onClick={() => {
                const currentLang = i18n.language?.split('-')[0] || 'en';
                const nextLang = currentLang === 'ar' ? 'en' : 'ar';
                i18n.changeLanguage(nextLang);
              }}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 text-white transition-all duration-300 hover:bg-white/10 hover:border-white/30"
              aria-label={t('language.switchLanguage', { defaultValue: 'Switch language' })}
            >
              <span className="text-sm font-semibold uppercase">
                {i18n.language?.split('-')[0] === 'ar' ? 'EN' : 'AR'}
              </span>
            </button>
            
            {/* Mobile Menu Button */}
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 text-white transition-all duration-300 hover:bg-white/10 hover:border-white/30"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              <div className="relative w-6 h-6">
                <span
                  className={`absolute top-1 left-0 w-6 h-0.5 bg-white transition-all duration-300 ${mobileNavOpen ? "rotate-45 top-3" : ""
                    }`}
                />
                <span
                  className={`absolute top-3 left-0 w-6 h-0.5 bg-white transition-all duration-300 ${mobileNavOpen ? "opacity-0" : ""
                    }`}
                />
                <span
                  className={`absolute top-5 left-0 w-6 h-0.5 bg-white transition-all duration-300 ${mobileNavOpen ? "-rotate-45 top-3" : ""
                    }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileNavOpen && (
          <div className="lg:hidden">
            <nav className="mx-4 mt-3 flex flex-col gap-1 rounded-3xl border border-white/30 bg-gradient-to-r from-[#121f36]/95 via-[#202D46]/90 to-[#2E3D32]/95 px-6 py-6 shadow-[0_20px_60px_-20px_rgba(12,18,32,0.9)] backdrop-blur-2xl">
              {renderNavLinks(true)}
              <div className="border-t border-white/10 my-4"></div>
              <LanguageSwitcher variant="mobile" />
              {renderAuthButtons(true)}
              {!isAdmin && (
                <button
                  type="button"
                  onClick={scrollToLead}
                  className={`mt-2 rounded-full bg-[#A88B32] px-6 py-4 font-heading text-sm font-semibold text-white transition-all duration-300 hover:bg-[#C09C3D] hover:scale-105 shadow-lg ${
                    isRTL ? "rtl-menu-link" : "uppercase tracking-[0.2em]"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {t("cta.inquireNow")}
                    <FiArrowRight className={`h-4 w-4 ${isRTL ? "scale-x-[-1]" : ""}`} />
                  </span>
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default WebsiteNavbar;
