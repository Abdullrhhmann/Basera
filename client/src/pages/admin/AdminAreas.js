import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiMapPin } from '../../icons/feather';
import { areasAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { showSuccess, showError } from '../../utils/sonner';

const AdminAreas = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState(null);
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  // Fetch areas
  const { data: areasData, isLoading, error, refetch, isFetching } = useQuery(
    ['admin-areas', searchTerm],
    async () => {
      try {
        const params = { limit: 100 };
        if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
        
        params._t = Date.now();
        const response = await areasAPI.getAreas(params);
        return response.data;
      } catch (err) {
        console.error('AdminAreas: API Error:', err);
        throw err;
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 3,
      retryDelay: 1000,
      onError: (err) => {
        console.error('AdminAreas: Query Error:', err);
        showError('Failed to load areas');
      }
    }
  );

  // Delete area mutation
  const deleteAreaMutation = useMutation(
    (id) => areasAPI.deleteArea(id),
    {
      onSuccess: () => {
        showSuccess('Area deleted successfully');
        queryClient.invalidateQueries('admin-areas');
        queryClient.invalidateQueries('areas');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to delete area';
        showError(message);
      }
    }
  );

  const handleDelete = (id, name) => {
    setAreaToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (areaToDelete) {
      deleteAreaMutation.mutate(areaToDelete.id);
      setShowDeleteModal(false);
      setAreaToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setAreaToDelete(null);
  };

  const handleRefresh = async () => {
    queryClient.invalidateQueries(['admin-areas']);
    await refetch();
    showSuccess('Areas refreshed successfully');
  };

  const areas = areasData?.areas || [];

  return (
    <>
      <Helmet>
        <title>Manage Areas - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Areas" user={user} onLogout={logout}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">All Areas</h2>
            <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700/50 whitespace-nowrap">
              {areas.length} total
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/areas/new"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              <FiPlus className="w-4 h-4" />
              Add Area
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
                  <span className="text-xs sm:text-sm text-slate-300 truncate">Refreshing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="w-2 h-2 bg-slate-400 rounded-full flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm text-slate-300 truncate">Up to date</span>
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

        {/* Search Bar */}
        <div className="relative mb-6">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-xl"
          />
        </div>

        {/* Areas Table */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-slate-300">Loading areas...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-400 mb-4">Failed to load areas</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : areas.length === 0 ? (
            <div className="p-12 text-center">
              <FiMapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No areas found</h3>
              <p className="text-slate-400 mb-4">Get started by creating your first area</p>
              <Link
                to="/admin/areas/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Add Area
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Governorate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Appreciation Rate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Properties
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {areas.map((area) => (
                    <tr key={area._id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{area.name}</div>
                        <div className="text-xs text-slate-400">/{area.slug}</div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-slate-300 truncate">{area.city?.name || '-'}</div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-slate-300 truncate">{area.city?.governorate?.name || '-'}</div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-slate-300 truncate">{area.annualAppreciationRate}%</div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-slate-300 truncate">{area.propertiesCount || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/areas/edit/${area._id}`}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="Edit"
                          >
                            <FiEdit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(area._id, area.name)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete"
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
        {showDeleteModal && (
          <ConfirmationModal
            title="Delete Area"
            message={`Are you sure you want to delete "${areaToDelete?.name}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
            type="danger"
          />
        )}
      </AdminLayout>
    </>
  );
};

export default AdminAreas;

