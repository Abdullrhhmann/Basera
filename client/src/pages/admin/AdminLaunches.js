import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiSearch, FiUpload } from '../../icons/feather';
import { launchesAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import BulkUploadModal from '../../components/admin/BulkUploadModal';
import { showSuccess, showError } from '../../utils/sonner';

const AdminLaunches = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [launchToDelete, setLaunchToDelete] = useState(null);
  // const [launchToArchive, setLaunchToArchive] = useState(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const queryClient = useQueryClient();
  const { user, logout, canBulkUpload, isAuthenticated, isAdminRole, canManageLaunches } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    } else if (isAuthenticated && (!isAdminRole() || !canManageLaunches())) {
      navigate('/admin/dashboard');
      showError('You do not have permission to manage launches');
    }
  }, [isAuthenticated, isAdminRole, canManageLaunches, navigate]);

  // Fetch launches (no auto-refresh for better performance)
  const { data: launchesData, isLoading, error, refetch, isFetching } = useQuery(
    ['admin-launches', searchTerm, filterStatus, filterType],
    async () => {
      try {
        // Only send non-empty parameters
        const params = { limit: 50 };
        if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
        if (filterStatus && filterStatus.trim()) params.status = filterStatus.trim();
        if (filterType && filterType.trim()) params.propertyType = filterType.trim();
        
        // Add cache-busting parameter
        params._t = Date.now();
        const response = await launchesAPI.getLaunches(params);
        return response.data;
      } catch (err) {
        console.error('AdminLaunches: API Error:', err);
        console.error('AdminLaunches: Error details:', {
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
        console.error('AdminLaunches: Query Error:', err);
        showError('Failed to load launches');
      }
    }
  );

  // Delete launch mutation
  const deleteLaunchMutation = useMutation(
    (id) => launchesAPI.deleteLaunch(id),
    {
      onMutate: async (deletedLaunchId) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries('admin-launches');

        // Snapshot the previous value
        const previousLaunches = queryClient.getQueryData('admin-launches');

        // Optimistically remove the launch from the cache
        queryClient.setQueryData('admin-launches', (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter(launch => launch._id !== deletedLaunchId)
          };
        });

        return { previousLaunches };
      },
      onSuccess: () => {
        showSuccess('Launch deleted successfully');
        // Close the delete modal after successful deletion
        setShowDeleteModal(false);
        setLaunchToDelete(null);
      },
      onError: (err, deletedLaunchId, context) => {
        // Rollback on error
        if (context?.previousLaunches) {
          queryClient.setQueryData('admin-launches', context.previousLaunches);
        }
        showError('Failed to delete launch');
      },
      onSettled: () => {
        // Always refetch after error or success
        queryClient.invalidateQueries('admin-launches');
      }
    }
  );

  // Archive launch mutation
  // const archiveLaunchMutation = useMutation(
  //   (id) => launchesAPI.archiveLaunch(id),
  //   {
  //     onSuccess: () => {
  //       showSuccess('Launch archived successfully');
  //       // Close the archive modal after successful archiving
  //       setShowArchiveModal(false);
  //       setLaunchToArchive(null);
  //       queryClient.invalidateQueries('admin-launches');
  //     },
  //     onError: () => {
  //       showError('Failed to archive launch');
  //     }
  //   }
  // );

  // Restore launch mutation
  // const restoreLaunchMutation = useMutation(
  //   (id) => launchesAPI.restoreLaunch(id),
  //   {
  //     onSuccess: () => {
  //       showSuccess('Launch restored successfully');
  //       queryClient.invalidateQueries('admin-launches');
  //     },
  //     onError: () => {
  //       showError('Failed to restore launch');
  //     }
  //   }
  // );

  const handleDelete = (id, title) => {
    setLaunchToDelete({ id, title });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (launchToDelete) {
      deleteLaunchMutation.mutate(launchToDelete.id);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setLaunchToDelete(null);
  };

  // const confirmArchive = () => {
  //   // Archive functionality can be added here if needed
  // };

  // const cancelArchive = () => {
  //   setShowArchiveModal(false);
  //   setLaunchToArchive(null);
  // };

  const handleRefresh = async () => {
    try {
      // Clear server cache first
      try {
        await launchesAPI.clearCache();
      } catch (cacheError) {
        console.warn('AdminLaunches: Failed to clear server cache:', cacheError);
        // Continue with refresh even if cache clear fails
      }
      
      // Invalidate client cache and refetch
      queryClient.invalidateQueries(['admin-launches']);
      await refetch();
      showSuccess('Launches refreshed successfully');
    } catch (error) {
      console.error('AdminLaunches: Refresh error:', error);
      showError('Failed to refresh launches');
    }
  };

  const launches = launchesData?.data || [];

  return (
    <>
      <Helmet>
        <title>Manage Launches - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Launches" user={user} onLogout={logout}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">All Launches</h2>
            <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700/50 whitespace-nowrap">
              {launches.length} total
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {canBulkUpload() && (
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 shadow-lg"
              >
                <FiUpload className="w-4 h-4" />
                Bulk Upload
              </button>
            )}
            <Link
              to="/admin/launches/add"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              <FiPlus className="w-4 h-4" />
              Add Launch
            </Link>
          </div>
        </div>

        {/* Auto-refresh Status */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg p-2 sm:p-3 mb-4 sm:mb-6 shadow-xl mx-1 sm:mx-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {isFetching ? (
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 animate-pulse"></div>
                  <span className="text-xs sm:text-sm text-slate-300 truncate">
                    {isFetching ? '🔄 Double refresh in progress...' : 'Auto-refresh active'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="w-2 h-2 bg-slate-400 rounded-full flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm text-slate-300 truncate">Auto-refresh active</span>
                </div>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
            >
              {isFetching ? '🔄 Refreshing...' : '🔄 Manual Refresh'}
            </button>
          </div>
        </div>

          {/* Filters */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 mx-1 sm:mx-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="">All Status</option>
                <option value="Available">Available</option>
                <option value="Coming Soon">Coming Soon</option>
                <option value="Pre-Launch">Pre-Launch</option>
                <option value="Sold Out">Sold Out</option>
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="">All Types</option>
                <option value="Villa">Villa</option>
                <option value="Apartment">Apartment</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Penthouse">Penthouse</option>
                <option value="Duplex">Duplex</option>
                <option value="Studio">Studio</option>
                <option value="Commercial">Commercial</option>
                <option value="Land">Land</option>
              </select>
              
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('');
                  setFilterType('');
                }}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Launches Table */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden mx-1 sm:mx-0">
            <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b border-slate-700/50">
              <h2 className="text-base sm:text-lg font-semibold text-white">
                Launches ({launches.length})
              </h2>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-slate-300">Loading launches...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-red-400 mb-2">Error loading launches</p>
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
            ) : launches.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-300">No launches found</p>
                <p className="text-sm text-slate-400 mt-2">
                  Try adjusting your search criteria or add a new launch.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Launch
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Type
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Price
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Location
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Launch Date
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-900/30 divide-y divide-slate-700/50">
                    {launches.map((launch) => (
                      <tr key={launch._id} className="hover:bg-slate-800/50">
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                              {launch.image ? (
                                <img
                                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover"
                                  src={launch.image}
                                  alt={launch.title}
                                />
                              ) : (
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                  <span className="text-slate-400 text-xs">No Image</span>
                                </div>
                              )}
                            </div>
                            <div className="ml--2 sm:ml-3 md:ml-4 min-w-0">
                              <div className="text-sm font-medium text-white">
                                {launch.title}
                              </div>
                              <div className="text-sm text-slate-400">
                                {launch.developer}
                              </div>
                              <div className="text-sm text-slate-400">
                                Created: {new Date(launch.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-400 capitalize">
                            {launch.propertyType}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            launch.status === 'Available' ? 'bg-green-500/20 text-green-400' :
                            launch.status === 'Coming Soon' ? 'bg-blue-500/20 text-blue-400' :
                            launch.status === 'Pre-Launch' ? 'bg-orange-500/20 text-orange-400' :
                            launch.status === 'Sold Out' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {launch.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {launch.startingPrice?.toLocaleString()} {launch.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {launch.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {new Date(launch.launchDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/launches/${launch._id}`}
                              className="text-blue-600 hover:text-blue-900"
                              aria-label={`View launch ${launch.title || launch._id}`}
                              title="View"
                            >
                              <FiEye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin/launches/${launch._id}/edit`}
                              className="text-green-600 hover:text-green-900"
                              aria-label={`Edit launch ${launch.title || launch._id}`}
                              title="Edit"
                            >
                              <FiEdit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(launch._id, launch.title)}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              type="button"
                              aria-label={`Delete launch ${launch.title || launch._id}`}
                              title={canManageLaunches() ? "Delete" : "No permission to delete"}
                              disabled={deleteLaunchMutation.isLoading || !canManageLaunches()}
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Delete Launch"
          message={`Are you sure you want to delete "${launchToDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />


        {/* Bulk Upload Modal */}
        <BulkUploadModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          entityType="launches"
          onUploadSuccess={() => {
            handleRefresh();
            setShowBulkUploadModal(false);
          }}
        />
      </AdminLayout>
    </>
  );
};

export default AdminLaunches;
