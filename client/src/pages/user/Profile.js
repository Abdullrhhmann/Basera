import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../utils/api';
import { FiHeart, FiMapPin, FiMaximize, FiFileText } from '../../icons/feather';
import PageLayout from '../../components/layout/PageLayout';

const Profile = () => {
  const { user } = useAuth();

  // Fetch user favorites
  const { data: favoritesData, isLoading: favoritesLoading } = useQuery(
    'user-favorites',
    async () => {
      const response = await usersAPI.getFavorites();
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const favorites = favoritesData?.favorites || [];

  return (
    <>
      <Helmet>
        <title>Profile - Basira Real Estate</title>
        <meta name="description" content="Manage your profile and preferences on Basira Real Estate." />
      </Helmet>

      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b] relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-basira-gold/5 via-transparent to-basira-gold/5"></div>
            <div className="absolute top-20 right-20 w-96 h-96 bg-basira-gold/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-6xl "style={{ color: 'white' }}>
                My Profile
              </h1>
              <br />

              
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Manage your account, preferences, and view your favorite properties
              </p>
            </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-[#131c2b]/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
                <div className="relative mb-6">
                  <div className="w-32 h-32 bg-gradient-to-r from-basira-gold to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
                    <span className="text-4xl font-bold text-black">
                      {user?.name?.charAt(0)}
                    </span>
                  </div>
                  <div className="absolute inset-0 w-32 h-32 mx-auto bg-basira-gold/20 rounded-full blur-xl"></div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{user?.name}</h2>
                <p className="text-gray-300 mb-4">{user?.email}</p>
                <div className="inline-block px-4 py-2 bg-basira-gold/20 border border-basira-gold/30 rounded-full">
                  <span className="text-basira-gold font-semibold capitalize">{user?.role}</span>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="lg:col-span-2">
              <div className="bg-[#131c2b]/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <div className="w-2 h-8 bg-gradient-to-b from-basira-gold to-yellow-400 rounded-full"></div>
                  Profile Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={user?.name || ''}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-basira-gold/50 focus:border-basira-gold/50 transition-all"
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={user?.email || ''}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-basira-gold/50 focus:border-basira-gold/50 transition-all"
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={user?.phone || ''}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-basira-gold/50 focus:border-basira-gold/50 transition-all"
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={user?.role || ''}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-basira-gold/50 focus:border-basira-gold/50 transition-all capitalize"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* My Submissions Section */}
            <div className="lg:col-span-3 mt-12">
              <div className="bg-[#131c2b]/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-basira-gold to-yellow-400 rounded-full"></div>
                    <FiFileText className="w-6 h-6 text-basira-gold" />
                    My Property Submissions
                  </h3>
                  <Link
                    to="/my-submissions"
                    className="px-4 py-2 text-sm text-basira-gold hover:text-yellow-400 hover:bg-basira-gold/10 rounded-lg transition-colors border border-basira-gold/30 hover:border-basira-gold/50"
                  >
                    View All
                  </Link>
                </div>
                <p className="text-gray-400 mb-6">
                  Track the status of properties you've submitted for review
                </p>
                <Link
                  to="/my-submissions"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-basira-gold/20 to-yellow-400/20 border border-basira-gold/30 text-basira-gold font-semibold rounded-xl hover:from-basira-gold/30 hover:to-yellow-400/30 transition-all"
                >
                  <FiFileText className="w-5 h-5" />
                  View My Submissions
                </Link>
              </div>
            </div>

            {/* Favorites Section */}
            <div className="lg:col-span-3 mt-12">
              <div className="bg-[#131c2b]/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-red-500 to-pink-500 rounded-full"></div>
                    <FiHeart className="w-6 h-6 text-red-500" />
                    My Favorite Properties
                  </h3>
                  <div className="px-4 py-2 bg-basira-gold/20 border border-basira-gold/30 rounded-full">
                    <span className="text-basira-gold font-semibold">{favorites.length} Properties</span>
                  </div>
                </div>

                {favoritesLoading ? (
                  <div className="text-center py-16">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-basira-gold mx-auto"></div>
                      <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-basira-gold/20 mx-auto"></div>
                    </div>
                    <p className="text-gray-300 mt-6 text-lg">Loading your favorites...</p>
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="relative mb-8">
                      <FiHeart className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                      <div className="absolute inset-0 w-20 h-20 mx-auto bg-red-500/20 rounded-full blur-xl"></div>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-4">No Favorites Yet</h4>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">Start building your collection by saving properties that catch your eye</p>
                    <Link 
                      to="/properties"
                      className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-basira-gold to-yellow-400 text-black font-bold rounded-xl hover:from-yellow-400 hover:to-basira-gold transition-all transform hover:scale-105 shadow-lg hover:shadow-basira-gold/25"
                    >
                      Browse Properties
                      <FiMaximize className="ml-2 w-5 h-5" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {favorites.map((property) => (
                      <Link
                        key={property._id}
                        to={`/properties/${property._id}`}
                        className="group bg-[#131c2b]/30 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-basira-gold/10 transition-all duration-300 hover:scale-105 hover:border-basira-gold/30"
                      >
                        {/* Property Image */}
                        <div className="relative h-56 overflow-hidden">
                          {property.images && property.images.length > 0 ? (
                            <>
                              <img
                                src={property.images[0].url}
                                alt={property.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#131c2b]/50 via-transparent to-transparent"></div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <span className="text-gray-400">No Image</span>
                            </div>
                          )}
                          {property.isFeatured && (
                            <div className="absolute top-4 left-4 px-3 py-1 bg-gradient-to-r from-basira-gold to-yellow-400 text-black text-xs font-bold rounded-full">
                              ⭐ Featured
                            </div>
                          )}
                          <div className="absolute top-4 right-4 p-2 bg-red-500 rounded-full shadow-lg">
                            <FiHeart className="w-4 h-4 text-white fill-current" />
                          </div>
                        </div>

                        {/* Property Details */}
                        <div className="p-6">
                          <h4 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-basira-gold transition-colors leading-tight">
                            {property.title}
                          </h4>

                          {/* Location */}
                          {property.location && (
                            <div className="flex items-start gap-2 text-sm text-gray-300 mb-4">
                              <FiMapPin className="w-4 h-4 flex-shrink-0 mt-1 text-basira-gold" />
                              <span className="line-clamp-1">
                                {property.location.address}, {property.location.city}
                              </span>
                            </div>
                          )}

                          {/* Specifications */}
                          {property.specifications && (
                            <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                              {property.specifications.bedrooms && (
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-white">{property.specifications.bedrooms}</span>
                                  <span>Beds</span>
                                </div>
                              )}
                              {property.specifications.bathrooms && (
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-white">{property.specifications.bathrooms}</span>
                                  <span>Baths</span>
                                </div>
                              )}
                              {property.specifications.area && (
                                <div className="flex items-center gap-1">
                                  <FiMaximize className="w-3.5 h-3.5" />
                                  <span className="font-semibold text-white">{property.specifications.area}</span>
                                  <span>m²</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Price */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold bg-gradient-to-r from-basira-gold to-yellow-400 bg-clip-text text-transparent">
                                {property.currency === 'USD' ? '$' : 'EGP'} {property.price?.toLocaleString()}
                              </span>
                            </div>
                            {property.type && (
                              <span className="text-xs px-2 py-1 bg-white/10 text-gray-300 rounded-full capitalize border border-white/20">
                                {property.type}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </PageLayout>
    </>
  );
};

export default Profile;
