import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiMapPin, FiUpload } from '../../icons/feather';
import { citiesAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import BulkUploadModal from '../../components/admin/BulkUploadModal';
import { showSuccess, showError } from '../../utils/sonner';

const AdminCities = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cityToDelete, setCityToDelete] = useState(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const queryClient = useQueryClient();
  const { user, logout, canBulkUpload } = useAuth();

  // Fetch cities
  const { data: citiesData, isLoading, error, refetch, isFetching } = useQuery(
    ['admin-cities', searchTerm],
    async () => {
      try {
        const params = { limit: 100 };
        if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
        
        params._t = Date.now();
        const response = await citiesAPI.getCities(params);
        return response.data;
      } catch (err) {
        console.error('AdminCities: API Error:', err);
        throw err;
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 3,
      retryDelay: 1000,
      onError: (err) => {
        console.error('AdminCities: Query Error:', err);
        showError('Failed to load cities');
      }
    }
  );

  // Delete city mutation
  const deleteCityMutation = useMutation(
    (id) => citiesAPI.deleteCity(id),
    {
      onSuccess: () => {
        showSuccess('City deleted successfully');
        queryClient.invalidateQueries('admin-cities');
        queryClient.invalidateQueries('cities');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to delete city';
        showError(message);
      }
    }
  );

  const handleDelete = (id, name) => {
    setCityToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (cityToDelete) {
      deleteCityMutation.mutate(cityToDelete.id);
      setShowDeleteModal(false);
      setCityToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCityToDelete(null);
  };

  const handleRefresh = async () => {
    queryClient.invalidateQueries(['admin-cities']);
    await refetch();
    showSuccess('Cities refreshed successfully');
  };

  const cities = citiesData?.cities || [];

  return (
    <>
      <Helmet>
        <title>Manage Cities - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Cities" user={user} onLogout={logout}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">All Cities</h2>
            <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700/50 whitespace-nowrap">
              {cities.length} total
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
              to="/admin/cities/new"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              <FiPlus className="w-4 h-4" />
              Add City
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

        {/* Cities Table */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden mx-1 sm:mx-0">
          <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b border-slate-700/50">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Cities ({cities.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-slate-300">Loading cities...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400 mb-2">Error loading cities</p>
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
          ) : cities.length === 0 ? (
            <div className="p-8 text-center">
              <FiMapPin className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-300 mb-2">No cities found</p>
              <p className="text-sm text-slate-400 mb-4">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first city'}
              </p>
              <Link
                to="/admin/cities/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
              >
                <FiPlus className="w-4 h-4" />
                Add City
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      City
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Governorate
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Appreciation Rate
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Properties
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
                  {cities.map((city) => (
                    <tr key={city._id} className="hover:bg-slate-800/50">
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                              <FiMapPin className="w-6 h-6 text-blue-400" />
                            </div>
                          </div>
                          <div className="ml--2 sm:ml-3 md:ml-4 min-w-0">
                            <div className="text-sm font-medium text-white">
                              {city.name}
                            </div>
                            {city.description && (
                              <div className="text-sm text-slate-400 truncate max-w-md">
                                {city.description.substring(0, 60)}
                                {city.description.length > 60 && '...'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-slate-300 truncate">
                          {city.governorate?.name || '-'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">
                          {city.annualAppreciationRate}% / year
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-400">
                          {city.propertiesCount || 0} {city.propertiesCount === 1 ? 'property' : 'properties'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {city.slug}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/cities/${city._id}/edit`}
                            className="text-green-600 hover:text-green-900"
                            aria-label={`Edit ${city.name}`}
                            title="Edit"
                          >
                            <FiEdit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(city._id, city.name)}
                            className="text-red-600 hover:text-red-900"
                            type="button"
                            aria-label={`Delete ${city.name}`}
                            title="Delete"
                            disabled={deleteCityMutation.isLoading}
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
          title="Delete City"
          message={`Are you sure you want to delete "${cityToDelete?.name}"? This action cannot be undone. If this city has properties, deletion will fail.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          entityType="cities"
          onUploadSuccess={() => {
            handleRefresh();
            setShowBulkUploadModal(false);
          }}
        />
      </AdminLayout>
    </>
  );
};

export default AdminCities;

