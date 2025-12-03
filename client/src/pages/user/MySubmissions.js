import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { propertiesAPI } from '../../utils/api';
import { FiCheckCircle, FiX, FiClock, FiEye, FiMapPin, FiDollarSign, FiHome } from '../../icons/feather';
import PageLayout from '../../components/layout/PageLayout';

const MySubmissions = () => {

  const { data, isLoading, error } = useQuery(
    'my-submissions',
    async () => {
      const response = await propertiesAPI.getMySubmissions();
      return response.data;
    },
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: true
    }
  );

  const properties = data?.properties || [];
  const pagination = data?.pagination || {};

  const getStatusBadge = (property) => {
    const status = property.approvalStatus;
    
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
          <FiCheckCircle className="w-3.5 h-3.5" />
          Approved
        </span>
      );
    }
    
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
          <FiX className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
        <FiClock className="w-3.5 h-3.5" />
        Pending Review
      </span>
    );
  };

  const getLocationLabel = (property) => {
    if (!property) return 'N/A';
    
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
    
    const segments = [
      property.location?.city,
      property.location?.state,
    ].filter(Boolean);
    
    return segments.length > 0 ? segments.join(', ') : 'N/A';
  };

  return (
    <>
      <Helmet>
        <title>My Property Submissions - Basira Real Estate</title>
        <meta name="description" content="View all properties you've submitted and their approval status." />
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
            <div className="mb-8">
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-basira-gold transition-colors mb-6"
              >
                <span>←</span>
                <span>Back to Profile</span>
              </Link>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                My Property Submissions
              </h1>
              <p className="text-gray-300 text-lg">
                Track the status of all properties you've submitted for review
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-basira-gold mx-auto mb-4"></div>
                <p className="text-gray-400">Loading your submissions...</p>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                <p className="text-red-400">Error loading your submissions. Please try again.</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-[#131c2b]/20 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
                <FiHome className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Submissions Yet</h3>
                <p className="text-gray-400 mb-6">You haven't submitted any properties yet.</p>
                <Link
                  to="/submit-property"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-basira-gold to-yellow-400 text-black font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  Submit Your First Property
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {properties.map((property) => (
                  <div
                    key={property._id}
                    className="bg-[#131c2b]/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-basira-gold/30 transition-all"
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Property Image */}
                      {property.images && property.images.length > 0 ? (
                        <div className="w-full md:w-48 h-48 rounded-xl overflow-hidden flex-shrink-0">
                          <img
                            src={property.images[0].url}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full md:w-48 h-48 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <FiHome className="w-12 h-12 text-gray-600" />
                        </div>
                      )}

                      {/* Property Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1">{property.title}</h3>
                            <p className="text-gray-400 text-sm line-clamp-2">{property.description}</p>
                          </div>
                          {getStatusBadge(property)}
                        </div>

                        {/* Property Info Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-gray-300">
                            <FiHome className="w-4 h-4" />
                            <span className="text-sm capitalize">{property.type?.replace('-', ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <FiDollarSign className="w-4 h-4" />
                            <span className="text-sm">
                              {property.price?.toLocaleString()} {property.currency}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <FiMapPin className="w-4 h-4" />
                            <span className="text-sm">{getLocationLabel(property)}</span>
                          </div>
                          <div className="text-gray-300 text-sm">
                            {property.specifications?.area} sqm
                          </div>
                        </div>

                        {/* Rejection Reason */}
                        {property.approvalStatus === 'rejected' && property.rejectionReason && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                            <p className="text-sm text-red-400">
                              <strong>Rejection Reason:</strong> {property.rejectionReason}
                            </p>
                          </div>
                        )}

                        {/* Submission Date */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-500">
                            Submitted on {new Date(property.createdAt).toLocaleDateString()}
                          </p>
                          {property.approvalStatus === 'approved' && (
                            <Link
                              to={`/properties/${property._id}`}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-basira-gold hover:text-yellow-400 transition-colors"
                            >
                              <FiEye className="w-4 h-4" />
                              View Property
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-400">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default MySubmissions;

