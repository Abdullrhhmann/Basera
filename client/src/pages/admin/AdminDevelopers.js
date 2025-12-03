import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiBuilding, FiUpload } from '../../icons/feather';
import { developersAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import BulkUploadModal from '../../components/admin/BulkUploadModal';
import { showSuccess, showError } from '../../utils/sonner';

const getEntityId = (entity) => {
  if (!entity) return '';
  if (typeof entity === 'string') return entity;
  if (typeof entity === 'object') {
    return entity._id || entity.id || '';
  }
  return '';
};

const AdminDevelopers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [developerToDelete, setDeveloperToDelete] = useState(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const queryClient = useQueryClient();
  const { user, logout, canBulkUpload } = useAuth();

  // Fetch developers
  const { data: developersData, isLoading, error, refetch, isFetching } = useQuery(
    ['admin-developers', searchTerm],
    async () => {
      try {
        const params = { limit: 100 };
        if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
        
        params._t = Date.now();
        const response = await developersAPI.getDevelopers(params);
        return response.data;
      } catch (err) {
        console.error('AdminDevelopers: API Error:', err);
        throw err;
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 3,
      retryDelay: 1000,
      onError: (err) => {
        console.error('AdminDevelopers: Query Error:', err);
        showError('Failed to load developers');
      }
    }
  );

  // Delete developer mutation
  const deleteDeveloperMutation = useMutation(
    (id) => developersAPI.deleteDeveloper(id),
    {
      onSuccess: () => {
        showSuccess('Developer deleted successfully');
        queryClient.invalidateQueries('admin-developers');
        queryClient.invalidateQueries('developers');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to delete developer';
        showError(message);
      }
    }
  );

  const handleDelete = (id, name) => {
    setDeveloperToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (developerToDelete) {
      deleteDeveloperMutation.mutate(developerToDelete.id);
      setShowDeleteModal(false);
      setDeveloperToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeveloperToDelete(null);
  };

  const handleRefresh = async () => {
    queryClient.invalidateQueries(['admin-developers']);
    await refetch();
    showSuccess('Developers refreshed successfully');
  };

  const developers = developersData?.developers || [];

  return (
    <>
      <Helmet>
        <title>Manage Developers - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Developers" user={user} onLogout={logout}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">All Developers</h2>
            <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700/50 whitespace-nowrap">
              {developers.length} total
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
              to="/admin/developers/new"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex-1 sm:flex-none justify-center"
            >
              <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline">Add Developer</span>
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
                  <span className="text-xs sm:text-sm text-slate-300 truncate">Refreshing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm text-slate-300">Up to date</span>
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

        {/* Search */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 mx-1 sm:mx-0">
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
        </div>

        {/* Developers Table */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden mx-1 sm:mx-0">
          <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b border-slate-700/50">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Developers ({developers.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-slate-300">Loading developers...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400 mb-2">Error loading developers</p>
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
          ) : developers.length === 0 ? (
            <div className="p-8 text-center">
              <FiBuilding className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-300 mb-2">No developers found</p>
              <p className="text-sm text-slate-400 mb-4">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first developer'}
              </p>
              <Link
                to="/admin/developers/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
              >
                <FiPlus className="w-4 h-4" />
                Add Developer
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Developer
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Projects
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Slug
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900/30 divide-y divide-slate-700/50">
                  {developers.map((developer) => {
                    const devId = getEntityId(developer);
                    return (
                    <tr key={devId} className="hover:bg-slate-800/50">
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                            {developer.logo ? (
                              <img
                                className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-contain bg-white p-1"
                                src={developer.logo}
                                alt={developer.name}
                              />
                            ) : (
                              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                <FiBuilding className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-2 sm:ml-3 md:ml-4 min-w-0">
                            <div className="text-sm font-medium text-white">
                              {developer.name}
                            </div>
                            {developer.description && (
                              <div className="text-sm text-slate-400 truncate max-w-md">
                                {developer.description.substring(0, 60)}
                                {developer.description.length > 60 && '...'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-400">
                          {developer.propertiesCount || 0} {developer.propertiesCount === 1 ? 'property' : 'properties'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-sm text-slate-400">
                        {developer.slug}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/developers/${developer.slug}`}
                            className="text-blue-600 hover:text-blue-900"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`View ${developer.name}`}
                            title="View Public Page"
                          >
                            <FiBuilding className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/admin/developers/${devId}/edit`}
                            className="text-green-600 hover:text-green-900"
                            aria-label={`Edit ${developer.name}`}
                            title="Edit"
                          >
                            <FiEdit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(devId, developer.name)}
                            className="text-red-600 hover:text-red-900"
                            type="button"
                            aria-label={`Delete ${developer.name}`}
                            title="Delete"
                            disabled={deleteDeveloperMutation.isLoading}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
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
          title="Delete Developer"
          message={`Are you sure you want to delete "${developerToDelete?.name}"? This action cannot be undone. If this developer has properties, deletion will fail.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          entityType="developers"
          onUploadSuccess={() => {
            handleRefresh();
            setShowBulkUploadModal(false);
          }}
        />
      </AdminLayout>
    </>
  );
};

export default AdminDevelopers;

