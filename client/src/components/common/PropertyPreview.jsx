import React from 'react';
import { motion } from 'framer-motion';
import { Bed, Bath, Maximize2, MapPin, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PropertyPreview = ({ property, isLaunch = false }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (isLaunch) {
      navigate(`/launches`);
    } else {
      navigate(`/property/${property._id}`);
    }
  };

  const image = isLaunch ? property.image : property.images?.[0]?.url;
  const price = isLaunch 
    ? `${property.currency} ${property.startingPrice?.toLocaleString() || 'N/A'}`
    : `${property.currency} ${property.price?.toLocaleString() || 'N/A'}`;
  const location = isLaunch 
    ? property.location 
    : `${property.location?.city || ''}, ${property.location?.state || ''}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border-2 border-[#202D46]/10 rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:shadow-[#A88B32]/10 hover:border-[#A88B32]/30 transition-all duration-300 cursor-pointer my-2 max-w-[320px]"
      onClick={handleClick}
    >
      {/* Property Image */}
      <div className="relative h-40 bg-gray-200">
        {image ? (
          <img 
            src={image} 
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
            <span className="text-gray-500 text-sm">No Image</span>
          </div>
        )}
        
        {/* Type Badge */}
        <div className="absolute top-2 left-2">
          <span className="bg-gradient-to-r from-[#202D46] to-[#2a3a5a] text-white px-3 py-1 rounded-full text-xs font-heading font-semibold uppercase tracking-wider shadow-lg border border-[#A88B32]/20">
            {isLaunch ? property.propertyType : property.type}
          </span>
        </div>

        {/* New Launch Badge */}
        {isLaunch && (
          <div className="absolute top-2 right-2">
            <span className="bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white px-3 py-1 rounded-full text-xs font-heading font-semibold uppercase tracking-wider shadow-lg">
              New Launch
            </span>
          </div>
        )}
      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Title */}
        <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
          {property.title}
        </h4>

        {/* Developer (for launches) */}
        {isLaunch && property.developer && (
          <p className="text-xs text-gray-600 mb-2">
            by {property.developer}
          </p>
        )}

        {/* Location */}
        <div className="flex items-center text-xs text-gray-600 mb-3">
          <MapPin className="w-3 h-3 mr-1" />
          <span className="line-clamp-1">{location}</span>
        </div>

        {/* Specifications */}
        <div className="flex items-center space-x-3 mb-3 text-xs text-gray-700">
          {property.bedrooms && (
            <div className="flex items-center">
              <Bed className="w-3.5 h-3.5 mr-1" />
              <span>{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center">
              <Bath className="w-3.5 h-3.5 mr-1" />
              <span>{property.bathrooms}</span>
            </div>
          )}
          {property.area && (
            <div className="flex items-center">
              <Maximize2 className="w-3.5 h-3.5 mr-1" />
              <span>{property.area} m²</span>
            </div>
          )}
        </div>

        {/* Price and View Button */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-[#A88B32]/20">
          <div>
            <p className="text-xs text-[#202D46]/60 mb-0.5 uppercase tracking-wide font-medium">
              {isLaunch ? 'Starting from' : 'Price'}
            </p>
            <p className="font-heading font-bold text-[#A88B32] text-sm">
              {price}
            </p>
          </div>
          <button className="flex items-center bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white px-3 py-1.5 rounded-full text-xs font-heading font-semibold uppercase tracking-wider hover:shadow-md hover:scale-105 transition-all duration-300">
            View
            <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyPreview;

