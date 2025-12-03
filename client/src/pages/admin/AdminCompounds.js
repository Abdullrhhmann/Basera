import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiLayers,
  FiMapPin,
} from '../../icons/feather';
import { useAuth } from '../../context/AuthContext';
import { compoundsAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { showSuccess, showError } from '../../utils/sonner';

const AdminCompounds = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [compoundToDelete, setCompoundToDelete] = useState(null);
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery(
    ['admin-compounds', searchTerm],
    async () => {
      const params = {
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      const response = await compoundsAPI.getCompounds(params);
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
      onError: (err) => {
        console.error('AdminCompounds: query error', err);
        showError('Failed to load compounds');
      },
    }
  );

  const deleteCompoundMutation = useMutation(
    (id) => compoundsAPI.deleteCompound(id),
    {
      onSuccess: () => {
        showSuccess('Compound deleted successfully');
        queryClient.invalidateQueries('admin-compounds');
      },
      onError: (err) => {
        const message = err.response?.data?.message || 'Failed to delete compound';
        showError(message);
      },
    }
  );

  const handleDeleteClick = (compound) => {
    setCompoundToDelete(compound);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!compoundToDelete) return;
    deleteCompoundMutation.mutate(compoundToDelete._id);
    setShowDeleteModal(false);
    setCompoundToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setCompoundToDelete(null);
  };

  const handleRefresh = async () => {
    queryClient.invalidateQueries(['admin-compounds']);
    await refetch();
    showSuccess('Compounds refreshed successfully');
  };

  const compounds = data?.compounds || [];

  const formatLocation = (compound) => {
    const segments = [
      compound.area_ref?.name,
      compound.city_ref?.name,
      compound.governorate_ref?.name,
    ].filter(Boolean);
    return segments.join(' • ') || 'Location not linked';
  };

  return (
    <>
      <Helmet>
        <title>Manage Compounds - Admin Panel</title>
      </Helmet>
      <AdminLayout title="Compounds" user={user} onLogout={logout}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">All Compounds</h2>
            <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700/50 whitespace-nowrap">
              {compounds.length} total
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/admin/compounds/new"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex-1 sm:flex-none justify-center"
            >
              <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline">Add Compound</span>
              <span className="xs:hidden">Add</span>
            </Link>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 mb-4 sm:mb-6 shadow-xl mx-1 sm:mx-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isFetching ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm text-slate-300">Refreshing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full" />
                  <span className="text-xs sm:text-sm text-slate-300">Up to date</span>
                </div>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors whitespace-nowrap flex-shrink-0"
            >
              {isFetching ? '🔄 Refreshing…' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 mx-1 sm:mx-0">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <input
              type="text"
              placeholder="Search compounds..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden mx-1 sm:mx-0">
          <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b border-slate-700/50">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <FiLayers className="w-4 h-4 text-blue-400" />
              Compounds ({compounds.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
              <p className="mt-2 text-slate-300">Loading compounds...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400 mb-2">Error loading compounds</p>
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
          ) : compounds.length === 0 ? (
            <div className="p-8 text-center">
              <FiLayers className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-300 mb-2">No compounds found</p>
              <p className="text-sm text-slate-400 mb-4">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first compound'}
              </p>
              <Link
                to="/admin/compounds/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
              >
                <FiPlus className="w-4 h-4" />
                Add Compound
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Compound
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Developer
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Linked Properties
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
                  {compounds.map((compoundRow) => (
                    <tr key={compoundRow._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 sm:px-4 md:px-6 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white">
                            {compoundRow.name}
                          </span>
                          {compoundRow.slug && (
                            <span className="text-xs text-slate-400">{compoundRow.slug}</span>
                          )}
                          {compoundRow.isFeatured && (
                            <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 w-fit">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2.5 whitespace-nowrap text-sm text-slate-300">
                        {compoundRow.developer?.name || '—'}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2.5 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                          <span className="w-2 h-2 bg-blue-400 rounded-full" />
                          {compoundRow.status || 'planning'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2.5 whitespace-nowrap text-sm text-slate-300">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-500/20 text-purple-300">
                          {compoundRow.propertiesCount ?? 0}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2.5 whitespace-nowrap text-sm text-slate-300">
                        <div className="flex items-center gap-2">
                          <FiMapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span>{formatLocation(compoundRow)}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2.5 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/compounds/${compoundRow._id}/edit`}
                            className="text-green-500 hover:text-green-300"
                            aria-label={`Edit ${compoundRow.name}`}
                          >
                            <FiEdit className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(compoundRow)}
                            className="text-red-500 hover:text-red-300 disabled:opacity-50"
                            disabled={deleteCompoundMutation.isLoading}
                            aria-label={`Delete ${compoundRow.name}`}
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

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Delete Compound"
          message={`Are you sure you want to delete "${compoundToDelete?.name}"? Compounds with linked properties cannot be deleted.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </AdminLayout>
    </>
  );
};

export default AdminCompounds;


