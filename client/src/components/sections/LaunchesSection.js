import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { ExpandableCardDemo } from '../ui/aceternity/expandable-card';
import { launchesAPI } from '../../utils/api';

const LaunchesSection = () => {
  // Fetch featured launches
  const { data: launchesData, isLoading, error } = useQuery(
    'featured-launches',
    async () => {
      const response = await launchesAPI.get('/launches/featured');
      return response;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      onSuccess: (data) => {
      },
      onError: (error) => {
        console.error('Error loading featured launches:', error);
      }
    }
  );

  // Transform launches data for ExpandableCardDemo
  const transformLaunchesForCards = (launches) => {
    if (!launches || launches.length === 0) {
      return [];
    }
    
    return launches.map(launch => ({
      title: launch.title,
      description: launch.developer,
      src: launch.image,
      ctaText: 'View Details',
      ctaLink: `/launches/${launch._id}`,
      content: () => (
        <div>
          <p className="mb-4">{launch.content}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Location:</strong> {launch.location}
            </div>
            <div>
              <strong>Property Type:</strong> {launch.propertyType}
            </div>
            <div>
              <strong>Starting Price:</strong> {launch.currency} {launch.startingPrice.toLocaleString()}
            </div>
            <div>
              <strong>Status:</strong> {launch.status}
            </div>
            <div>
              <strong>Area:</strong> {launch.area} {launch.areaUnit}
            </div>
            <div>
              <strong>Launch Date:</strong> {new Date(launch.launchDate).toLocaleDateString()}
            </div>
          </div>
          {launch.features && launch.features.length > 0 && (
            <div className="mt-4">
              <strong>Features:</strong>
              <ul className="list-disc list-inside mt-2">
                {launch.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    }));
  };

  return (
    <section className="relative py-24 ">
      

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-basira-gold/10 border border-basira-gold/20 rounded-full text-basira-gold text-sm font-medium mb-6">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Exclusive Launches
          </div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Available
            <span className="block bg-gradient-to-r from-basira-gold to-yellow-400 bg-clip-text text-transparent">
              Launches
            </span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Discover exclusive property launches from Egypt's leading developers. 
            Get early access to the most sought-after developments before they hit the market.
          </p>
        </div>

        {/* Expandable Cards */}
        <div className="mb-20">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-basira-gold mx-auto"></div>
              <p className="mt-4 text-slate-300">Loading launches...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">Error loading launches: {error.message}</p>
              <p className="text-red-400 text-sm mt-2">Check browser console for more details</p>
            </div>
          ) : launchesData?.data?.data?.length > 0 ? (
            <>
              <ExpandableCardDemo cards={transformLaunchesForCards(launchesData.data.data)} />
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-300">No launches available at the moment.</p>
              <p className="text-slate-400 text-sm mt-2">
                Data received: {launchesData ? 'Yes' : 'No'} | 
                Data length: {launchesData?.data?.data?.length || 0}
              </p>
              <p className="text-slate-400 text-sm mt-2">
                Full data structure: {JSON.stringify(launchesData, null, 2)}
              </p>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="relative bg-white/5 backdrop-blur-md rounded-3xl p-12 shadow-2xl border border-white/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-basira-gold/10 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
            <div className="relative">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Don't Miss Out on
                <span className="block text-basira-gold">Exclusive Launches</span>
              </h3>
              <p className="text-slate-300 mb-8 max-w-2xl mx-auto text-lg leading-relaxed">
                Be the first to know about new property launches and get exclusive access 
                to pre-launch pricing and early bird offers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/launches" className="group px-8 py-4 bg-gradient-to-r from-basira-gold to-yellow-400 text-slate-900 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-basira-gold/25 transition-all duration-300 transform hover:-translate-y-1 inline-flex items-center justify-center">
                  <span className="flex items-center gap-2">
                    View All Launches
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>
                <Link to="/properties" className="px-8 py-4 border-2 border-basira-gold text-basira-gold rounded-xl font-bold text-lg hover:bg-basira-gold hover:text-slate-900 transition-all duration-300 backdrop-blur-sm inline-flex items-center justify-center">
                  View All Properties
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LaunchesSection;