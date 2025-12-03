import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "react-query";
import { Marquee, MarqueeContent, MarqueeItem } from "./shadcn/marquee";
import { developersAPI } from "../../utils/api";

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  if (typeof entity === "object") {
    return entity._id || entity.id || entity.slug || entity.value || "";
  }
  return "";
};

export default function MarqueeSection() {
  // Fetch developers from database
  const { data: developersData, isLoading } = useQuery(
    'developers-marquee',
    async () => {
      const response = await developersAPI.getDevelopers({ 
        limit: 50,
        sortBy: 'name',
        sortOrder: 'asc'
      });
      return response.data;
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    }
  );

  const developers = developersData?.developers || [];

  // Don't render if loading or no developers
  if (isLoading || developers.length === 0) {
    return null;
  }

  return (
    <section className="bg-transparent py-8 sm:py-12 md:py-16 lg:py-20 relative overflow-hidden w-full">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full "></div>
      </div>

      <div className="relative z-10 w-full">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12 md:mb-16 px-4 sm:px-6">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="h-px w-8 sm:w-12 md:w-16 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
            <p className="font-heading text-[0.625rem] sm:text-xs md:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.5em] text-[#A88B32] font-bold">
              Trusted By
            </p>
            <div className="h-px w-8 sm:w-12 md:w-16 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white leading-tight font-bold px-2">
            Our Partners & Developers
          </h2>
        </div>

        {/* Marquee - Full Width */}
        <Marquee className="w-screen py-4 sm:py-6 md:py-8 marquee-mobile-fast">
          <MarqueeContent speed="normal" pauseOnHover={true} className="gap-4 sm:gap-6 md:gap-8 lg:gap-12 xl:gap-16">
            {developers.map((developer, index) => {
              const developerId = getEntityId(developer) || developer.slug || `developer-${index}`;
              const developerSlug = developer.slug || developerId;
              return (
              <MarqueeItem 
                className="flex-shrink-0 w-24 h-16 sm:w-32 sm:h-20 md:w-40 md:h-24 lg:w-48 lg:h-28" 
                key={developerId}
              >
                <Link
                  to={`/properties?developer=${encodeURIComponent(developerSlug)}`}
                  className="group relative h-full w-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110"
                  title={`View properties by ${developer.name}`}
                >
                  {developer.logo ? (
                    <img
                      alt={developer.name}
                      className="h-full w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                      src={developer.logo}
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <div 
                    className="text-center px-1"
                    style={{ display: developer.logo ? 'none' : 'block' }}
                  >
                    <p className="font-heading text-xs sm:text-sm md:text-base font-bold text-white/70 group-hover:text-[#A88B32] transition-colors duration-300 line-clamp-2">
                      {developer.name}
                    </p>
                  </div>
                </Link>
              </MarqueeItem>
            );
            })}
          </MarqueeContent>
        </Marquee>
      </div>
    </section>
  );
}

