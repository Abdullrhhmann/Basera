import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiSearch, FiArchive, FiRotateCcw, FiUpload, FiAward } from '../../icons/feather';
import { propertiesAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import BulkUploadModal from '../../components/admin/BulkUploadModal';
import { showSuccess, showError } from '../../utils/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../components/ui/shadcn/select';

const AdminProperties = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterApprovalStatus, setFilterApprovalStatus] = useState('');
  const [filterFeatured, setFilterFeatured] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showSoldArchive, setShowSoldArchive] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [propertyToArchive, setPropertyToArchive] = useState(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const queryClient = useQueryClient();
  const { user, logout, canApproveProperties, hasHierarchyLevel, canBulkUpload } = useAuth();

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

  // Fetch properties with pagination
  const { data: propertiesData, isLoading, error, refetch, isFetching } = useQuery(
    ['admin-properties', searchTerm, filterType, filterStatus, filterApprovalStatus, filterFeatured, showArchived, showSoldArchive, currentPage, itemsPerPage],
    async () => {
      try {
        // If viewing sold/rented archive
        if (showSoldArchive) {
          const params = { 
            limit: itemsPerPage,
            page: currentPage
          };
          if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
          if (filterType && filterType.trim()) params.type = filterType.trim();
          params._t = Date.now();
          const response = await propertiesAPI.getSoldArchive(params);
          return response.data;
        }
        
        // Regular properties view with proper pagination
        const params = { 
          limit: itemsPerPage,
          page: currentPage
        };
        if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
        if (filterType && filterType.trim()) params.type = filterType.trim();
        if (filterStatus && filterStatus.trim()) params.status = filterStatus.trim();
        if (filterApprovalStatus && filterApprovalStatus.trim()) params.approvalStatus = filterApprovalStatus.trim();
        if (filterFeatured && filterFeatured.trim()) params.featured = filterFeatured.trim();
        params.archived = showArchived;
        
        // Add cache-busting parameter
        params._t = Date.now();
        const response = await propertiesAPI.getProperties(params);
        return response.data;
      } catch (err) {
        console.error('AdminProperties: API Error:', err);
        console.error('AdminProperties: Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        throw err;
      }
    },
    { 
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: 1000,
      onError: (err) => {
        console.error('AdminProperties: Query Error:', err);
        showError('Failed to load properties');
      }
    }
  );

  // Delete property mutation
  const deletePropertyMutation = useMutation(
    (id) => propertiesAPI.deleteProperty(id),
    {
      onMutate: async (deletedPropertyId) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries('admin-properties');

        // Snapshot the previous value
        const previousProperties = queryClient.getQueryData('admin-properties');

        // Optimistically remove the property from the cache
        queryClient.setQueryData('admin-properties', (old) => {
          if (!old) return old;
          return {
            ...old,
            properties: old.properties.filter(property => property._id !== deletedPropertyId)
          };
        });

        return { previousProperties };
      },
      onSuccess: () => {
        showSuccess('Property deleted successfully');
      },
      onError: (err, deletedPropertyId, context) => {
        // Rollback on error
        if (context?.previousProperties) {
          queryClient.setQueryData('admin-properties', context.previousProperties);
        }
        showError('Failed to delete property');
      },
      onSettled: () => {
        // Always refetch after error or success
        queryClient.invalidateQueries('admin-properties');
      }
    }
  );

  // Archive property mutation
  const archivePropertyMutation = useMutation(
    (id) => propertiesAPI.archiveProperty(id),
    {
      onSuccess: () => {
        showSuccess('Property archived successfully');
        queryClient.invalidateQueries('admin-properties');
      },
      onError: () => {
        showError('Failed to archive property');
      }
    }
  );

  // Restore property mutation
  const restorePropertyMutation = useMutation(
    (id) => propertiesAPI.restoreProperty(id),
    {
      onSuccess: () => {
        showSuccess('Property restored successfully');
        queryClient.invalidateQueries('admin-properties');
      },
      onError: () => {
        showError('Failed to restore property');
      }
    }
  );

  // Toggle Featured mutation
  const toggleFeaturedMutation = useMutation(
    async ({ id, isFeatured }) => {
      const response = await propertiesAPI.updateProperty(id, { isFeatured: !isFeatured });
      return response.data;
    },
    {
      onSuccess: (data) => {
        showSuccess(data.property?.isFeatured ? 'Property marked as most popular' : 'Property removed from most popular');
        queryClient.invalidateQueries('admin-properties');
        queryClient.invalidateQueries('featured-properties');
      },
      onError: () => {
        showError('Failed to update popular status');
      }
    }
  );

  const handleDelete = (id, title) => {
    setPropertyToDelete({ id, title });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (propertyToDelete) {
      deletePropertyMutation.mutate(propertyToDelete.id);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPropertyToDelete(null);
  };

  const handleArchive = (id, title) => {
    setPropertyToArchive({ id, title });
    setShowArchiveModal(true);
  };

  const confirmArchive = () => {
    if (propertyToArchive) {
      archivePropertyMutation.mutate(propertyToArchive.id);
    }
  };

  const cancelArchive = () => {
    setShowArchiveModal(false);
    setPropertyToArchive(null);
  };

  const handleRestore = (id, title) => {
    if (window.confirm(`Are you sure you want to restore "${title}"?`)) {
      restorePropertyMutation.mutate(id);
    }
  };

  const handleToggleFeatured = (id, isFeatured, title) => {
    const action = isFeatured ? 'remove from most popular' : 'mark as most popular';
    if (window.confirm(`Are you sure you want to ${action} "${title}"?`)) {
      toggleFeaturedMutation.mutate({ id, isFeatured });
    }
  };

  const handleRefresh = async () => {
    try {
      // Clear server cache first
      try {
        await propertiesAPI.clearCache();
      } catch (cacheError) {
        console.warn('AdminProperties: Failed to clear server cache:', cacheError);
        // Continue with refresh even if cache clear fails
      }
      
      // Invalidate client cache and refetch
      queryClient.invalidateQueries(['admin-properties']);
      await refetch();
      showSuccess('Properties refreshed successfully');
    } catch (error) {
      console.error('AdminProperties: Refresh error:', error);
      showError('Failed to refresh properties');
    }
  };

  const properties = propertiesData?.properties || [];
  const totalCount = propertiesData?.pagination?.totalProperties || 0;
  const totalPages = propertiesData?.pagination?.totalPages || 1;
  const hasNext = propertiesData?.pagination?.hasNext || false;
  const hasPrev = propertiesData?.pagination?.hasPrev || false;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus, filterApprovalStatus, filterFeatured, showArchived, showSoldArchive]);

  return (
    <>
      <Helmet>
        <title>Manage Properties - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Properties" user={user} onLogout={logout}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">All Properties</h2>
            <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700/50 whitespace-nowrap">
              {isLoading ? 'Loading...' : `${totalCount} total`}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {canBulkUpload() && (
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 shadow-lg flex-1 sm:flex-none justify-center"
              >
                <FiUpload className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden xs:inline">Bulk Upload</span>
                <span className="xs:hidden">Upload</span>
              </button>
            )}
            <Link
              to="/admin/properties/new"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex-1 sm:flex-none justify-center"
            >
              <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline">Add Property</span>
              <span className="xs:hidden">Add</span>
            </Link>
          </div>
        </div>

        {/* Auto-refresh Status */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg p-2 sm:p-3 mb-4 sm:mb-6 shadow-xl mx-1 sm:mx-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {isFetching ? (
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm text-slate-300 truncate">
                    {isFetching ? '🔄 Refreshing...' : 'Auto-refresh active'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm text-slate-300">Auto-refresh active</span>
                </div>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors whitespace-nowrap flex-shrink-0"
            >
              {isFetching ? <span className="hidden xs:inline">🔄 Refreshing...</span> : <span><span className="hidden xs:inline">🔄 Manual </span>Refresh</span>}
            </button>
          </div>
        </div>

          {/* Filters */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 mx-1 sm:mx-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>
              
              <Select value={filterType || 'all'} onValueChange={(v) => setFilterType(v === 'all' ? '' : v)}>
                <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[150px]">
                  <span>{filterType ? filterType.charAt(0).toUpperCase() + filterType.slice(1) : 'All Types'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="duplex">Duplex</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[150px]">
                  <span>{filterStatus ? filterStatus.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'All Status'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="for-sale">For Sale</SelectItem>
                  <SelectItem value="for-rent">For Rent</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Approval Status Filter - Only for team leaders+ */}
              {canApproveProperties() && (
                <Select value={filterApprovalStatus || 'all'} onValueChange={(v) => setFilterApprovalStatus(v === 'all' ? '' : v)}>
                  <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[180px]">
                    <span>{filterApprovalStatus ? filterApprovalStatus.charAt(0).toUpperCase() + filterApprovalStatus.slice(1) + (filterApprovalStatus !== 'approved' && filterApprovalStatus !== 'rejected' ? ' Approval' : '') : 'All Approval Status'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Approval Status</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Select value={filterFeatured || 'all'} onValueChange={(v) => setFilterFeatured(v === 'all' ? '' : v)}>
                <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[150px]">
                  <span>{filterFeatured === 'true' ? 'Most Popular Only' : filterFeatured === 'false' ? 'Not Popular' : 'All Properties'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  <SelectItem value="true">Most Popular Only</SelectItem>
                  <SelectItem value="false">Not Popular</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={showSoldArchive ? 'sold' : (showArchived ? 'archived' : 'active')} 
                onValueChange={(value) => {
                  setShowArchived(value === 'archived');
                  setShowSoldArchive(value === 'sold');
                }}
              >
                <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[170px]">
                  <span>{showSoldArchive ? 'Sold/Rented Properties' : showArchived ? 'Archived Properties' : 'Active Properties'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Properties</SelectItem>
                  <SelectItem value="archived">Archived Properties</SelectItem>
                  <SelectItem value="sold">Sold/Rented Properties</SelectItem>
                </SelectContent>
              </Select>
              
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('');
                  setFilterStatus('');
                  setFilterApprovalStatus('');
                  setFilterFeatured('');
                  setShowArchived(false);
                  setShowSoldArchive(false);
                }}
                className="sm:col-span-2 lg:col-span-3 xl:col-span-1 px-3 sm:px-4 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Properties Table */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden mx-1 sm:mx-0">
            <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b border-slate-700/50">
              <h2 className="text-base sm:text-lg font-semibold text-white">
                Properties ({properties.length})
              </h2>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-slate-300">Loading properties...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-red-400 mb-2">Error loading properties</p>
                <p className="text-sm text-slate-400 mb-4">
                  {error?.message || 'An unexpected error occurred'}
                </p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                >
                  Try Again
                </button>
              </div>
            ) : properties.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-300">No properties found</p>
                <p className="text-sm text-slate-400 mt-2">
                  Try adjusting your search criteria or add a new property.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Property
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Type
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                      {showSoldArchive && (
                        <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                          Sold/Rented Date
                        </th>
                      )}
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Developer
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Price
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Location
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-900/30 divide-y divide-slate-700/50">
                    {properties.map((property) => (
                      <tr key={property._id} className="hover:bg-slate-800/50">
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                              {property.images && property.images.length > 0 ? (
                                <img
                                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover"
                                  src={property.images.find(img => img.isHero)?.url || property.images[0].url}
                                  alt={property.title}
                                />
                              ) : (
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                  <span className="text-slate-400 text-xs">No Image</span>
                                </div>
                              )}
                            </div>
                            <div className="ml-2 sm:ml-3 md:ml-4 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-white">
                                  {property.title}
                                </div>
                                {/* Approval Status Badge */}
                                {property.approvalStatus && canApproveProperties() && (
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    property.approvalStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                    property.approvalStatus === 'approved' ? 'bg-green-500/20 text-green-400' :
                                    property.approvalStatus === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                    'bg-slate-500/20 text-slate-400'
                                  }`}>
                                    {property.approvalStatus === 'pending' ? '⏱ Pending' :
                                     property.approvalStatus === 'approved' ? '✓ Approved' :
                                     property.approvalStatus === 'rejected' ? '✗ Rejected' :
                                     property.approvalStatus}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-400">
                                Created: {new Date(property.createdAt).toLocaleDateString()}
                              </div>
                              {property.rejectionReason && property.approvalStatus === 'rejected' && (
                                <div className="text-xs text-red-400 mt-1">
                                  Reason: {property.rejectionReason}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-400 capitalize">
                            {property.type}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            property.status === 'for-sale' ? 'bg-green-500/20 text-green-400' :
                            property.status === 'for-rent' ? 'bg-blue-500/20 text-blue-400' :
                            property.status === 'sold' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {property.status?.replace('-', ' ')}
                          </span>
                        </td>
                        {showSoldArchive && (
                          <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-sm text-slate-400">
                            {property.soldDate ? new Date(property.soldDate).toLocaleDateString() :
                             property.rentedDate ? new Date(property.rentedDate).toLocaleDateString() :
                             '—'}
                          </td>
                        )}
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-sm text-slate-300">
                          <div className="space-y-2">
                            {property.developerStatus && (
                              <div className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs capitalize">
                                {property.developerStatus.replace('-', ' ')}
                              </div>
                            )}
                            {property.developer ? (
                              <Link
                                to={`/developers/${property.developer.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:bg-slate-700/30 rounded px-2 py-1 transition-colors group"
                                title={`View ${property.developer.name}`}
                              >
                                {property.developer.logo && (
                                  <div className="w-6 h-6 bg-white rounded flex items-center justify-center p-0.5 flex-shrink-0">
                                    <img
                                      src={typeof property.developer.logo === 'string' ? property.developer.logo : property.developer.logo.url}
                                      alt={property.developer.name}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                )}
                                <span className="text-xs text-slate-300 group-hover:text-blue-400 truncate max-w-32">
                                  {property.developer.name}
                                </span>
                              </Link>
                            ) : (
                              !property.developerStatus && (
                                <span className="text-slate-500 text-xs">—</span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-sm text-white">
                          {property.price?.toLocaleString()} {property.currency}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-sm text-slate-400">
                          {getLocationLabel(property)}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/properties/${property._id}`}
                              className="text-blue-600 hover:text-blue-900"
                              aria-label={`View property ${property.title || property._id}`}
                              title="View"
                            >
                              <FiEye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin/properties/${property._id}/edit`}
                              className="text-green-600 hover:text-green-900"
                              aria-label={`Edit property ${property.title || property._id}`}
                              title="Edit"
                            >
                              <FiEdit className="w-4 h-4" />
                            </Link>
                            {/* Featured toggle button */}
                            <button
                              onClick={() => handleToggleFeatured(property._id, property.isFeatured, property.title)}
                              className={`${property.isFeatured ? 'text-yellow-500 hover:text-yellow-700' : 'text-slate-400 hover:text-yellow-500'} transition-colors`}
                              type="button"
                              aria-label={`${property.isFeatured ? 'Remove from' : 'Mark as'} most popular`}
                              title={property.isFeatured ? 'Remove from Most Popular' : 'Mark as Most Popular'}
                              disabled={toggleFeaturedMutation.isLoading}
                            >
                              <FiAward className="w-4 h-4" />
                            </button>
                            {showArchived ? (
                              <button
                                onClick={() => handleRestore(property._id, property.title)}
                                className="text-green-600 hover:text-green-900"
                                type="button"
                                aria-label={`Restore property ${property.title || property._id}`}
                                title="Restore"
                                disabled={restorePropertyMutation.isLoading}
                              >
                                <FiRotateCcw className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchive(property._id, property.title)}
                                className="text-yellow-600 hover:text-yellow-900"
                                type="button"
                                aria-label={`Archive property ${property.title || property._id}`}
                                title="Archive"
                                disabled={archivePropertyMutation.isLoading}
                              >
                                <FiArchive className="w-4 h-4" />
                              </button>
                            )}
                            {/* Delete button - Only for Team Leaders+ (hierarchy 3 or lower) */}
                            {hasHierarchyLevel(3) && (
                              <button
                                onClick={() => handleDelete(property._id, property.title)}
                                className="text-red-600 hover:text-red-900"
                                type="button"
                                aria-label={`Delete property ${property.title || property._id}`}
                                title="Delete"
                                disabled={deletePropertyMutation.isLoading}
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
              <div className="mt-4 sm:mt-6 px-3 sm:px-4 md:px-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-slate-300 whitespace-nowrap"><span className="hidden xs:inline">Items per page:</span><span className="xs:hidden">Show:</span></label>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(v) => {
                      setItemsPerPage(parseInt(v));
                      setCurrentPage(1); // Reset to page 1
                    }}
                  >
                    <SelectTrigger className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs sm:text-sm h-auto min-w-[70px]">
                      <span>{itemsPerPage}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={!hasPrev}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded border border-slate-700"
                  >
                    <span className="hidden xs:inline">First</span>
                    <span className="xs:hidden">««</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={!hasPrev}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded border border-slate-700"
                  >
                    <span className="hidden xs:inline">Previous</span>
                    <span className="xs:hidden">«</span>
                  </button>
                  
                  <span className="text-xs sm:text-sm text-slate-300 px-2 sm:px-3 whitespace-nowrap">
                    <span className="hidden xs:inline">Page </span>{currentPage}<span className="hidden xs:inline"> of {totalPages}</span><span className="xs:inline hidden sm:hidden">/{totalPages}</span>
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={!hasNext}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded border border-slate-700"
                  >
                    <span className="hidden xs:inline">Next</span>
                    <span className="xs:hidden">»</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={!hasNext}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded border border-slate-700"
                  >
                    <span className="hidden xs:inline">Last</span>
                    <span className="xs:hidden">»»</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Delete Property"
          message={`Are you sure you want to delete "${propertyToDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Archive Confirmation Modal */}
        <ConfirmationModal
          isOpen={showArchiveModal}
          onClose={cancelArchive}
          onConfirm={confirmArchive}
          title="Archive Property"
          message={`Are you sure you want to archive "${propertyToArchive?.title}"? You can restore it later from the archived properties.`}
          confirmText="Archive"
          cancelText="Cancel"
          type="warning"
        />

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          entityType="properties"
          onUploadSuccess={() => {
            handleRefresh();
            setShowBulkUploadModal(false);
          }}
        />
      </AdminLayout>
    </>
  );
};

export default AdminProperties;
