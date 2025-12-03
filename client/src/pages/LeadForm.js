import React from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
import LeadCaptureForm from "../components/lead/LeadCaptureForm";
import { FiArrowRight } from "../icons/feather";

const LeadForm = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  return (
    <>
      <Helmet>
        <title>{t("leadPage.metaTitle")}</title>
        <meta name="description" content={t("leadPage.metaDescription")} />
      </Helmet>

      <PageLayout showMobileNav>
        <div className="bg-gradient-to-b from-[#0c1424] via-[#111b2d] to-[#0c1424] text-white min-h-screen">
          <section className="relative overflow-hidden pt-28 pb-12 sm:pt-32 sm:pb-16">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-[#A88B32]/15 via-transparent to-transparent" />
              <div className="absolute -top-16 right-10 w-40 h-40 sm:w-60 sm:h-60 bg-[#A88B32]/10 blur-[120px]" />
              <div className="absolute bottom-0 left-0 w-44 h-44 sm:w-64 sm:h-64 bg-[#C09C3D]/10 blur-[140px]" />
            </div>
            <div className="relative z-10 container-max px-4 sm:px-6">
              <div className={`max-w-4xl ${isRTL ? "text-right ml-auto" : "text-left"} space-y-6`}>
                <p className="font-heading text-xs uppercase tracking-[0.4em] text-[#A88B32] font-semibold">
                  {t("leadPage.hero.badge")}
                </p>
                <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl leading-[1.1] font-bold">
                  {t("leadPage.hero.title")}
                </h1>
                <p className="text-base sm:text-lg text-gray-300 max-w-3xl">
                  {t("leadPage.hero.subtitle")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const form = document.getElementById("lead-capture-anchor");
                    form?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#A88B32] to-[#C09C3D] px-6 sm:px-8 py-3 font-heading text-sm uppercase tracking-[0.3em] text-white shadow-lg shadow-[#A88B32]/40 hover:-translate-y-0.5 transition-all"
                >
                  {t("leadPage.hero.primaryCta")}
                  <FiArrowRight
                    className={`h-4 w-4 transition-transform ${isRTL ? "scale-x-[-1]" : ""}`}
                  />
                </button>
              </div>
            </div>
          </section>

          <div className="pb-16">
            <LeadCaptureForm
              badgeText={t("leadPage.form.badge")}
              titleText={t("leadPage.form.title")}
              subtitleText={t("leadPage.form.subtitle")}
              source="lead-page"
              enableFade={false}
            />
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default LeadForm;

