import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FiArrowRight } from "../../icons/feather";
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/shadcn";
import { showSuccess, showError } from "../../utils/sonner";
import { inquiriesAPI } from "../../utils/api";

const LeadCaptureForm = ({
  badgeText,
  titleText,
  subtitleText,
  sectionId = "lead-capture-anchor",
  source = "landing-page",
  className = "",
  enableFade = true,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      leadName: "",
      leadEmail: "",
      leadPhone: "",
      leadService: "buy",
      leadPropertyType: "apartment",
      leadPurpose: "investment",
      leadBudgetMin: "",
      leadBudgetMax: "",
      leadLocation: "",
      leadMessage: "",
    },
  });

  const onSubmit = handleSubmit(async (formData) => {
    try {
      let budgetValue = null;
      if (formData.leadBudgetMin || formData.leadBudgetMax) {
        budgetValue = {
          min: formData.leadBudgetMin ? parseFloat(formData.leadBudgetMin) : null,
          max: formData.leadBudgetMax ? parseFloat(formData.leadBudgetMax) : null,
          currency: "EGP",
        };
      }

      const leadData = {
        name: formData.leadName,
        email: formData.leadEmail,
        phone: formData.leadPhone,
        requiredService: formData.leadService || "buy",
        propertyType: formData.leadPropertyType || "apartment",
        purpose: formData.leadPurpose || "investment",
        budget: budgetValue,
        preferredLocation: formData.leadLocation ? [formData.leadLocation] : [],
        message: formData.leadMessage || "",
        source,
      };

      await inquiriesAPI.createLead(leadData);
      showSuccess(
        t("home.leadForm.toast.successTitle"),
        t("home.leadForm.toast.successSubtitle")
      );
      reset();
    } catch (error) {
      console.error("Lead form error:", error);
      showError(
        t("home.leadForm.toast.errorTitle"),
        error.response?.data?.message || t("home.leadForm.toast.errorSubtitle")
      );
    }
  });

  const resolvedBadge = badgeText ?? t("home.leadForm.badge");
  const resolvedTitle = titleText ?? t("home.leadForm.title");
  const resolvedSubtitle = subtitleText ?? t("home.leadForm.subtitle");

  const fadeProps = enableFade ? { "data-fade-section": true } : {};

  return (
    <section
      id={sectionId}
      className={`bg-transparent py-8 sm:py-12 md:py-16 lg:py-24 relative overflow-hidden ${className}`}
      {...fadeProps}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 via-transparent to-[#A88B32]/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] md:w-[600px] lg:w-[800px] h-[300px] sm:h-[400px] md:h-[600px] lg:h-[800px] bg-[#A88B32]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="container-max relative z-10 px-3 sm:px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-3 sm:mb-4 md:mb-5 lg:mb-6">
              <div className="h-px flex-1 max-w-[60px] sm:max-w-none bg-gradient-to-r from-transparent to-[#A88B32]"></div>
              <p className="font-heading text-[0.625rem] sm:text-xs md:text-sm uppercase tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] text-[#A88B32] font-bold whitespace-nowrap px-1">
                {resolvedBadge}
              </p>
              <div className="h-px flex-1 max-w-[60px] sm:max-w-none bg-gradient-to-l from-transparent to-[#A88B32]"></div>
            </div>
            <h2
              className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2 sm:mb-3 md:mb-4 px-2 sm:px-4 leading-tight ${
                isRTL ? "rtl-heading" : ""
              }`}
            >
              {resolvedTitle}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-400 px-2 sm:px-4 leading-relaxed">
              {resolvedSubtitle}
            </p>
          </div>

          <div className="relative rounded-xl sm:rounded-2xl md:rounded-3xl border border-[#A88B32]/30 sm:border-2 bg-[#131c2b]/40 backdrop-blur-xl p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#A88B32]/5 via-transparent to-[#A88B32]/10"></div>
            </div>

            <form
              onSubmit={onSubmit}
              className="relative z-10 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                <div>
                  <label className="block text-[0.625rem] sm:text-xs md:text-sm font-semibold text-gray-300 mb-1 sm:mb-1.5 md:mb-2">
                    {t("home.leadForm.fields.name.label")}
                  </label>
                  <input
                    type="text"
                    {...register("leadName", {
                      required: t("home.leadForm.validation.nameRequired"),
                    })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-white/5 border border-white/10 sm:border-2 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#A88B32] focus:border-[#A88B32] text-white placeholder-gray-500 transition-all text-sm sm:text-base"
                    placeholder={t("home.leadForm.fields.name.placeholder")}
                  />
                  {errors.leadName && (
                    <p className="text-red-400 text-[0.625rem] sm:text-xs md:text-sm mt-0.5 sm:mt-1">
                      {errors.leadName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[0.625rem] sm:text-xs md:text-sm font-semibold text-gray-300 mb-1 sm:mb-1.5 md:mb-2">
                    {t("home.leadForm.fields.email.label")}
                  </label>
                  <input
                    type="email"
                    {...register("leadEmail", {
                      required: t("home.leadForm.validation.emailRequired"),
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: t("home.leadForm.validation.emailInvalid"),
                      },
                    })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-white/5 border border-white/10 sm:border-2 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#A88B32] focus:border-[#A88B32] text-white placeholder-gray-500 transition-all text-sm sm:text-base"
                    placeholder={t("home.leadForm.fields.email.placeholder")}
                  />
                  {errors.leadEmail && (
                    <p className="text-red-400 text-[0.625rem] sm:text-xs md:text-sm mt-0.5 sm:mt-1">
                      {errors.leadEmail.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[0.625rem] sm:text-xs md:text-sm font-semibold text-gray-300 mb-1 sm:mb-1.5 md:mb-2">
                    {t("home.leadForm.fields.phone.label")}
                  </label>
                  <input
                    type="tel"
                    {...register("leadPhone", {
                      required: t("home.leadForm.validation.phoneRequired"),
                    })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-white/5 border border-white/10 sm:border-2 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#A88B32] focus:border-[#A88B32] text-white placeholder-gray-500 transition-all text-sm sm:text-base"
                    placeholder={t("home.leadForm.fields.phone.placeholder")}
                  />
                  {errors.leadPhone && (
                    <p className="text-red-400 text-[0.625rem] sm:text-xs md:text-sm mt-0.5 sm:mt-1">
                      {errors.leadPhone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[0.625rem] sm:text-xs md:text-sm font-semibold text-gray-300 mb-1 sm:mb-1.5 md:mb-2">
                    {t("home.leadForm.fields.service.label")}
                  </label>
                  <ShadcnSelect
                    onValueChange={(value) =>
                      setValue("leadService", value, { shouldValidate: true })
                    }
                    defaultValue="buy"
                  >
                    <SelectTrigger className="w-full h-10 sm:h-11 md:h-12 bg-white/5 border border-white/10 sm:border-2 text-white rounded-lg sm:rounded-xl text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">
                        {t("home.leadForm.fields.service.options.buy")}
                      </SelectItem>
                      <SelectItem value="rent">
                        {t("home.leadForm.fields.service.options.rent")}
                      </SelectItem>
                      <SelectItem value="sell">
                        {t("home.leadForm.fields.service.options.sell")}
                      </SelectItem>
                      <SelectItem value="invest">
                        {t("home.leadForm.fields.service.options.invest")}
                      </SelectItem>
                    </SelectContent>
                  </ShadcnSelect>
                </div>

                <div>
                  <label className="block text-[0.625rem] sm:text-xs md:text-sm font-semibold text-gray-300 mb-1 sm:mb-1.5 md:mb-2">
                    {t("home.leadForm.fields.propertyType.label")}
                  </label>
                  <ShadcnSelect
                    onValueChange={(value) =>
                      setValue("leadPropertyType", value, { shouldValidate: true })
                    }
                    defaultValue="apartment"
                  >
                    <SelectTrigger className="w-full h-10 sm:h-11 md:h-12 bg-white/5 border border-white/10 sm:border-2 text-white rounded-lg sm:rounded-xl text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">
                        {t("home.leadForm.fields.propertyType.options.apartment")}
                      </SelectItem>
                      <SelectItem value="villa">
                        {t("home.leadForm.fields.propertyType.options.villa")}
                      </SelectItem>
                      <SelectItem value="duplex">
                        {t("home.leadForm.fields.propertyType.options.duplex")}
                      </SelectItem>
                      <SelectItem value="twin-villa">
                        {t("home.leadForm.fields.propertyType.options.twinVilla")}
                      </SelectItem>
                      <SelectItem value="land">
                        {t("home.leadForm.fields.propertyType.options.land")}
                      </SelectItem>
                      <SelectItem value="commercial">
                        {t("home.leadForm.fields.propertyType.options.commercial")}
                      </SelectItem>
                    </SelectContent>
                  </ShadcnSelect>
                </div>

                <div>
                  <label className="block text-[0.625rem] sm:text-xs md:text-sm font-semibold text-gray-300 mb-1 sm:mb-1.5 md:mb-2">
                    {t("home.leadForm.fields.purpose.label")}
                  </label>
                  <ShadcnSelect
                    onValueChange={(value) =>
                      setValue("leadPurpose", value, { shouldValidate: true })
                    }
                    defaultValue="investment"
                  >
                    <SelectTrigger className="w-full h-10 sm:h-11 md:h-12 bg-white/5 border border-white/10 sm:border-2 text-white rounded-lg sm:rounded-xl text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investment">
                        {t("home.leadForm.fields.purpose.options.investment")}
                      </SelectItem>
                      <SelectItem value="personal-use">
                        {t("home.leadForm.fields.purpose.options.personal")}
                      </SelectItem>
                    </SelectContent>
                  </ShadcnSelect>
                </div>

                <div>
                  <label className="block text-[0.625rem] sm:text-xs md:text-sm font-semibold text-gray-300 mb-1 sm:mb-1.5 md:mb-2">
                    {t("home.leadForm.fields.budgetFrom.label")}
                  </label>
                  <input
                    type="number"
                    {...register("leadBudgetMin")}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-white/5 border border-white/10 sm:border-2 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#A88B32] focus:border-[#A88B32] text-white placeholder-gray-500 transition-all text-sm sm:text-base"
                    placeholder={t("home.leadForm.fields.budgetFrom.placeholder")}
                  />
                </div>

                <div>
                  <label className="block text-[0.625rem] sm:text-xs md:text-sm font-semibold text-gray-300 mb-1 sm:mb-1.5 md:mb-2">
                    {t("home.leadForm.fields.budgetTo.label")}
                  </label>
                  <input
                    type="number"
                    {...register("leadBudgetMax")}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-white/5 border border-white/10 sm:border-2 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#A88B32] focus:border-[#A88B32] text-white placeholder-gray-500 transition-all text-sm sm:text-base"
                    placeholder={t("home.leadForm.fields.budgetTo.placeholder")}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[0.625rem] sm:text-xs md:text-sm font-semibold text-gray-300 mb-1 sm:mb-1.5 md:mb-2">
                    {t("home.leadForm.fields.location.label")}
                  </label>
                  <input
                    type="text"
                    {...register("leadLocation")}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-white/5 border border-white/10 sm:border-2 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#A88B32] focus:border-[#A88B32] text-white placeholder-gray-500 transition-all text-sm sm:text-base"
                    placeholder={t("home.leadForm.fields.location.placeholder")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.625rem] sm:text-xs md:text-sm font-semibold text-gray-300 mb-1 sm:mb-1.5 md:mb-2">
                  {t("home.leadForm.fields.message.label")}
                </label>
                <textarea
                  {...register("leadMessage")}
                  rows="3"
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-white/5 border border-white/10 sm:border-2 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#A88B32] focus:border-[#A88B32] text-white placeholder-gray-500 transition-all resize-none text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                  placeholder={t("home.leadForm.fields.message.placeholder")}
                ></textarea>
              </div>

              <div className="text-center pt-1 sm:pt-2 md:pt-4">
                <button
                  type="submit"
                  className="group relative w-full sm:w-auto min-w-[200px] px-6 sm:px-8 md:px-10 lg:px-12 py-2.5 sm:py-3 md:py-3.5 lg:py-4 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-bold text-sm sm:text-base md:text-lg rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[#A88B32]/50 active:scale-95"
                >
                  <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3">
                    {t("home.leadForm.submit")}
                    <FiArrowRight
                      className={`h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-transform ${
                        isRTL ? "scale-x-[-1] group-hover:-translate-x-1" : "group-hover:translate-x-1"
                      }`}
                    />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeadCaptureForm;

