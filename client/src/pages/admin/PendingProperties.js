import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { propertiesAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import { FiCheck, FiX, FiEye, FiUser, FiCalendar, FiMapPin, FiDollarSign, FiHome, FiClock } from '../../icons/feather';

const PendingProperties = () => {
  const { isAuthenticated, canApproveProperties, hasHierarchyLevel } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Helper function to get location label (prioritize hierarchical location)
  const getLocationLabel = (property) => {
    if (!property) return 'N/A';
    
    // Priority 1: Use hierarchical location structure (Area, City, Governorate)
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
    const segments = [
      property.location?.city,
      property.location?.state,
    ].filter(Boolean);
    
    return segments.length > 0 ? segments.join(', ') : 'N/A';
  };

  // Redirect if not authorized
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    } else if (!canApproveProperties() || !hasHierarchyLevel(3)) {
      navigate('/admin/dashboard');
      showError('You do not have permission to access pending properties');
    }
  }, [isAuthenticated, canApproveProperties, hasHierarchyLevel, navigate]);

  // Fetch pending properties
  const { data, isLoading, error } = useQuery(
    ['pending-properties'],
    async () => {
      const response = await propertiesAPI.getPendingProperties();
      return response.data;
    },
    {
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true
    }
  );

  // Approve property mutation
  const approveMutation = useMutation(
    (propertyId) => propertiesAPI.approveProperty(propertyId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pending-properties']);
        queryClient.invalidateQueries(['properties']);
        showSuccess('Property approved successfully');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to approve property');
      }
    }
  );

  // Reject property mutation
  const rejectMutation = useMutation(
    ({ propertyId, reason }) => propertiesAPI.rejectProperty(propertyId, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pending-properties']);
        queryClient.invalidateQueries(['properties']);
        setShowRejectModal(false);
        setSelectedProperty(null);
        setRejectionReason('');
        showSuccess('Property rejected');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to reject property');
      }
    }
  );

  const handleApprove = (property) => {
    if (window.confirm(`Are you sure you want to approve "${property.title}"?`)) {
      approveMutation.mutate(property._id);
    }
  };

  const handleReject = (property) => {
    setSelectedProperty(property);
    setShowRejectModal(true);
  };

  const submitRejection = () => {
    if (!rejectionReason.trim()) {
      showError('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({
      propertyId: selectedProperty._id,
      reason: rejectionReason
    });
  };

  const properties = data?.properties || [];
  const pagination = data?.pagination || {};

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-300 text-sm">Loading pending properties...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <FiX className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-400 font-semibold text-lg mb-2">Error loading pending properties</p>
            <p className="text-slate-400 text-sm">{error.message || 'Please try again later.'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Pending Properties - Admin Dashboard</title>
      </Helmet>

      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Pending Properties</h1>
            <p className="text-slate-300 text-sm sm:text-base">
              Review and approve properties submitted by sales agents
            </p>
          </div>

          {/* Summary Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FiClock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">
                    {properties.length} {properties.length === 1 ? 'property' : 'properties'} awaiting approval
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Properties List */}
          {properties.length === 0 ? (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl p-8 sm:p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-500/20 rounded-full">
                  <FiCheck className="h-8 w-8 sm:h-12 sm:w-12 text-green-400" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">All caught up!</h3>
              <p className="text-slate-400 text-sm sm:text-base">There are no pending properties at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map((property) => (
                <div 
                  key={property._id} 
                  className="group relative bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-slate-600/50 overflow-hidden"
                >
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-2xl group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                      {/* Property Image */}
                      {property.images && property.images.length > 0 && (
                        <div className="flex-shrink-0">
                          <img
                            src={property.images[0].url}
                            alt={property.title}
                            className="w-full sm:w-32 sm:h-32 object-cover rounded-xl border border-slate-700/50"
                          />
                        </div>
                      )}
                      
                      {/* Property Details */}
                      <div className="flex-1 min-w-0 w-full">
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-1">{property.title}</h3>
                        <p className="text-slate-300 text-sm line-clamp-2 mb-4">{property.description}</p>
                        
                        {/* Property Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                          <div className="flex items-center gap-2 text-slate-300 text-sm">
                            <FiHome className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span className="capitalize truncate">{property.type?.replace('-', ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300 text-sm">
                            <FiDollarSign className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="truncate">{property.price?.toLocaleString()} {property.currency}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300 text-sm">
                            <FiMapPin className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span className="truncate">{getLocationLabel(property)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300 text-sm">
                            <span className="truncate">{property.specifications?.area} sqm</span>
                          </div>
                        </div>

                        {/* Submitter Info */}
                        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-400 pt-4 border-t border-slate-700/50">
                          <div className="flex items-center gap-1.5">
                            <FiUser className="w-4 h-4" />
                            <span>Submitted by: <span className="font-medium text-slate-300">{property.submittedBy?.name || 'Unknown'}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FiCalendar className="w-4 h-4" />
                            <span>{new Date(property.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex sm:flex-col gap-2 w-full sm:w-auto sm:min-w-[120px]">
                        <button
                          onClick={() => navigate(`/admin/properties/${property._id}`)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-all duration-200"
                        >
                          <FiEye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <button
                          onClick={() => handleApprove(property)}
                          disabled={approveMutation.isLoading}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiCheck className="w-4 h-4" />
                          <span className="hidden sm:inline">Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(property)}
                          disabled={rejectMutation.isLoading}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiX className="w-4 h-4" />
                          <span className="hidden sm:inline">Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg px-4 py-2">
                <p className="text-sm text-slate-300">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Reject Property</h3>
              <p className="text-sm text-slate-300 mb-4">
                You are about to reject "<span className="font-semibold text-white">{selectedProperty?.title}</span>". Please provide a reason:
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 mb-4 min-h-[100px] text-white placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-red-500/50 transition-all"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedProperty(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-sm text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRejection}
                  disabled={rejectMutation.isLoading || !rejectionReason.trim()}
                  className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rejectMutation.isLoading ? 'Rejecting...' : 'Reject Property'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default PendingProperties;

