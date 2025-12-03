import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { CardContainer, CardBody, CardItem } from '../ui/aceternity/3d-card';
import { FiMapPin, FiArrowRight } from '../../icons/feather';

const PropertyCard3DComponent = ({ property }) => {
  const getPrimaryImage = (property) =>
    property?.images?.find((img) => img.isHero)?.url ||
    property?.images?.[0]?.url ||
    property?.heroImage ||
    property?.image ||
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=80';

  const getLocationLabel = (property) => {
    if (!property) return 'Cairo, Egypt';
    
    // Priority 1: Use hierarchical location structure (Governorate > City > Area)
    if (property.useNewLocationStructure || property.governorate_ref || property.city_ref || property.area_ref) {
      const segments = [
        property.area_ref?.name,
        property.city_ref?.name,
        property.governorate_ref?.name,
      ].filter(Boolean);
      
      if (segments.length > 0) {
        return segments.join(', ');
      }
    }
    
    // Priority 2: Use old location structure
    if (typeof property.location === 'string') {
      return property.location;
    }

    const segments = [
      property.location?.community,
      property.location?.city,
      property.location?.state,
      property.location?.country,
    ].filter(Boolean);

    return segments.length > 0 ? segments.join(', ') : 'Cairo, Egypt';
  };

  const formatCurrency = (value) => {
    if (!value || Number.isNaN(Number(value))) {
      return 'Price on request';
    }

    try {
      return new Intl.NumberFormat('en-EG', {
        style: 'currency',
        currency: 'EGP',
        maximumFractionDigits: 0,
      }).format(Number(value));
    } catch (error) {
      return `EGP ${Number(value).toLocaleString()}`;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'for-sale': 'For Sale',
      'for-rent': 'For Rent',
      'sold': 'Sold',
      'rented': 'Rented',
    };
    return labels[status] || 'Available';
  };

  const image = getPrimaryImage(property);
  const title = property?.title || property?.name || 'Basira Exclusives';
  const statusLabel = getStatusLabel(property.status);
  const priceLabel = formatCurrency(property.price);
  const locationLabel = getLocationLabel(property);

  return (
    <CardContainer className="inter-var">
      <CardBody className="group/card relative h-auto w-auto rounded-xl border border-white/20 bg-white/5 p-6 shadow-lg hover:shadow-2xl">
        <CardItem
          translateZ="50"
          className="font-heading text-xl font-bold text-white"
        >
          {title}
        </CardItem>
        
        <CardItem
          as="p"
          translateZ="60"
          className="mt-2 flex items-center gap-2 text-sm text-gray-300"
        >
          <FiMapPin className="h-4 w-4 text-[#A88B32]" />
          {locationLabel}
        </CardItem>

        <CardItem translateZ="100" className="mt-4 w-full">
          <img
            src={image}
            className="h-60 w-full rounded-xl object-cover group-hover/card:shadow-xl"
            alt={title}
          />
          <span className="absolute left-8 top-6 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white border border-white/30">
            {statusLabel}
          </span>
        </CardItem>

        <CardItem
          translateZ="50"
          className="mt-4 text-lg font-semibold text-[#A88B32]"
        >
          {priceLabel}
        </CardItem>

        <div className="mt-6 flex gap-3">
          <CardItem
            translateZ={20}
            as={Link}
            to={`/properties/${property._id}`}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 font-heading text-xs font-semibold uppercase tracking-[0.3em] text-white transition-all hover:border-[#A88B32] hover:bg-[#A88B32]/20 hover:text-[#A88B32]"
          >
            View Details
          </CardItem>
          
          <CardItem
            translateZ={20}
            as={Link}
            to="/contact"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#A88B32] px-6 py-3 font-heading text-xs font-semibold uppercase tracking-[0.3em] text-white transition-transform hover:-translate-y-0.5 hover:bg-[#C09C3D]"
          >
            <span>Inquire</span>
            <FiArrowRight className="h-4 w-4" />
          </CardItem>
        </div>
      </CardBody>
    </CardContainer>
  );
};

PropertyCard3DComponent.displayName = 'PropertyCard3D';

const PropertyCard3D = memo(PropertyCard3DComponent, (prevProps, nextProps) => {
  const prev = prevProps.property;
  const next = nextProps.property;

  if (prev === next) {
    return true;
  }

  if (!prev || !next) {
    return false;
  }

  return (
    prev._id === next._id &&
    prev.status === next.status &&
    prev.price === next.price &&
    prev.title === next.title &&
    prev.images?.[0]?.url === next.images?.[0]?.url
  );
});

export default PropertyCard3D;


