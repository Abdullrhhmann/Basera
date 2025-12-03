import React, { useRef } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { citiesAPI } from '../../utils/api';

const ImageSlider = () => {
  const slideRef = useRef(null);
  const navigate = useNavigate();

  // Fetch cities from database
  const { data: citiesData, isLoading } = useQuery(
    ['slider-cities'],
    async () => {
      const response = await citiesAPI.getCities({
        limit: 20,
        sortBy: 'propertiesCount',
        sortOrder: 'desc',
      });
      return response.data;
    },
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
    }
  );

  // Default city images as fallback
  const defaultCityImages = {
    'Cairo': 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?q=80&w=1074&auto=format&fit=crop',
    'Alexandria': 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?q=80&w=1074&auto=format&fit=crop',
    'Giza': 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?q=80&w=1074&auto=format&fit=crop',
    'New Cairo': 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=1074&auto=format&fit=crop',
    '6th of October City': 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=1074&auto=format&fit=crop',
    'Sheikh Zayed': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1074&auto=format&fit=crop',
    'New Administrative Capital': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1074&auto=format&fit=crop',
  };

  const getDefaultImage = () => 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=1074&auto=format&fit=crop';

  // Map city data directly from database
  const destinations = citiesData?.cities
    ?.slice(0, 8) // Get first 8 cities
    .map((city) => ({
      id: city._id,
      name: city.name,
      description: city.description || `Discover ${city.propertiesCount || 0} premium properties with ${city.annualAppreciationRate}% annual appreciation rate.`,
      image: city.image || city.imageUrl || defaultCityImages[city.name] || getDefaultImage(),
      propertiesCount: city.propertiesCount || 0,
      annualAppreciationRate: city.annualAppreciationRate || 0,
    })) || [];


  // Show loading state
  if (isLoading || destinations.length === 0) {
    return (
      <div className="image-slider-container">
        <div className="flex items-center justify-center h-full">
          <div className="w-12 h-12 border-4 border-[#A88B32]/30 border-t-[#A88B32] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (slideRef.current) {
      const items = slideRef.current.querySelectorAll('.image-slider-item');
      if (items.length > 0) {
        slideRef.current.appendChild(items[0]);
      }
    }
  };

  const handlePrev = () => {
    if (slideRef.current) {
      const items = slideRef.current.querySelectorAll('.image-slider-item');
      if (items.length > 0) {
        slideRef.current.prepend(items[items.length - 1]);
      }
    }
  };

  const handleSeeMore = (cityName) => {
    navigate(`/properties?city=${encodeURIComponent(cityName)}`);
  };

  return (
    <div className="image-slider-container">
      <div className="image-slider-slide" ref={slideRef}>
        {destinations.map((destination) => (
          <div
            key={destination.id}
            className="image-slider-item"
            style={{ backgroundImage: `url('${destination.image}')` }}
          >
            <div className="image-slider-content">
              <div className="image-slider-name">{destination.name}</div>
              <div className="image-slider-description">
                {destination.description}
              </div>
              <button
                type="button"
                className="image-slider-see-more"
                onClick={() => handleSeeMore(destination.name)}
              >
                See More →
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="image-slider-buttons">
        <button 
          className="image-slider-button image-slider-prev" 
          onClick={handlePrev}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <button 
          className="image-slider-button image-slider-next" 
          onClick={handleNext}
          aria-label="Next slide"
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default ImageSlider;

