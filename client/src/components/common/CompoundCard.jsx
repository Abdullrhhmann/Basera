import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMapPin, FiCalendar, FiArrowRight, FiLayers } from '../../icons/feather';
import { useTranslation } from 'react-i18next';

const statusGradientMap = {
  planning: 'from-cyan-500/90 to-cyan-600/90',
  launching: 'from-indigo-500/90 to-indigo-600/90',
  active: 'from-emerald-500/90 to-emerald-600/90',
  delivered: 'from-amber-500/90 to-amber-600/90',
  'on-hold': 'from-rose-500/90 to-rose-600/90',
};

const CompoundCard = ({ compound }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === 'rtl';
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
  });

  const launchLabel = compound.launchDate
    ? dateFormatter.format(new Date(compound.launchDate))
    : null;
  const handoverLabel = compound.handoverDate
    ? dateFormatter.format(new Date(compound.handoverDate))
    : null;

  const statusLabel = compound.status
    ? t(`compound.status.${compound.status}`, { defaultValue: compound.status })
    : null;

  const statusGradient = statusGradientMap[compound.status] || 'from-slate-500/90 to-slate-600/90';

  const locationLabel = [
    compound.area_ref?.name,
    compound.city_ref?.name,
    compound.governorate_ref?.name,
  ]
    .filter(Boolean)
    .join(isRTL ? '، ' : ', ');

  const heroImage =
    compound.heroImage?.url ||
    compound.gallery?.find((item) => item.isHero)?.url ||
    compound.gallery?.[0]?.url ||
    null;

  const compoundId = compound._id || compound.id;
  const compoundUrl = compoundId ? `/compounds/${compoundId}` : '#';

  return (
    <Link to={compoundUrl} className="block w-full h-full">
      <article className="group launch-card block w-full h-full">
        <div className="relative flex flex-col h-full overflow-hidden rounded-2xl border-2 border-white/5 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:border-[#A88B32]/40 hover:shadow-2xl hover:shadow-[#A88B32]/20 cursor-pointer">
        <div className="relative h-48 overflow-hidden">
          {heroImage ? (
            <img
              src={heroImage}
              alt={compound.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 text-slate-200">
              <FiLayers className="h-10 w-10" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 via-transparent to-transparent" />

          {compound.isFeatured && (
            <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#A88B32] to-[#C09C3D] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                <FiLayers className="h-3.5 w-3.5" />
                Featured
              </span>
            </div>
          )}

          {statusLabel && (
            <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'}`}>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${statusGradient} px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm`}
              >
                <FiLayers className="h-3.5 w-3.5" />
                {statusLabel}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-white transition-colors duration-300 group-hover:text-[#A88B32]">
              {compound.name}
            </h3>
            {compound.propertiesCount != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                <FiLayers className="h-3.5 w-3.5" />
                {compound.propertiesCount}
              </span>
            )}
          </div>

          {compound.developer?.name && (
            <p className="mt-1 text-sm text-gray-300">
              {t('propertyDetail.compound.developer', { developer: compound.developer.name })}
            </p>
          )}

          {locationLabel && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-300">
              <FiMapPin className="h-4 w-4 text-[#A88B32]" />
              <span className="line-clamp-1">{locationLabel}</span>
            </div>
          )}

          {compound.description && (
            <p className="mt-3 line-clamp-3 text-sm text-gray-400">{compound.description}</p>
          )}

          {(launchLabel || handoverLabel) && (
            <div className="mt-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              {launchLabel && (
                <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    {t('propertyDetail.compound.launchDate')}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-gray-100">
                    <FiCalendar className="h-4 w-4 text-[#A88B32]" />
                    <span>{launchLabel}</span>
                  </div>
                </div>
              )}
              {handoverLabel && (
                <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    {t('propertyDetail.compound.handoverDate')}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-gray-100">
                    <FiCalendar className="h-4 w-4 text-[#A88B32]" />
                    <span>{handoverLabel}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {compound.amenities?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {compound.amenities.slice(0, 4).map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-gray-300"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-5 flex items-center justify-between border-t border-white/5">
            <span className="text-xs text-gray-500">
              {compound.updatedAt
                ? dateFormatter.format(new Date(compound.updatedAt))
                : dateFormatter.format(new Date(compound.createdAt))}
            </span>
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/properties?compound=${compound.slug || compound._id}`);
              }}
              className="inline-flex items-center gap-1.5 text-[#A88B32] text-sm font-semibold transition-all group-hover:gap-2.5 hover:underline cursor-pointer"
            >
              {t('properties.actions.seeMore')}
              <FiArrowRight className={`h-4 w-4 ${isRTL ? 'transform scale-x-[-1]' : ''}`} />
            </div>
          </div>
        </div>
      </div>
    </article>
    </Link>
  );
};

export default CompoundCard;



