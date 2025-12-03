import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiEdit, FiTrash2, FiEye, FiSearch, FiMail, FiPhone, FiCalendar, FiArchive, FiRotateCcw, FiRefreshCw } from '../../icons/feather';
import { inquiriesAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { showSuccess, showError } from '../../utils/sonner';

const AdminInquiries = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [inquiryToDelete, setInquiryToDelete] = useState(null);
  const [inquiryToArchive, setInquiryToArchive] = useState(null);
  const queryClient = useQueryClient();
  const { user, logout, isAuthenticated, isAdminRole } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    } else if (isAuthenticated && !isAdminRole()) {
      navigate('/');
    }
  }, [isAuthenticated, isAdminRole, navigate]);

  // Fetch inquiries (no auto-refresh for better performance)
  const { data: inquiriesData, isLoading, error, refetch, isFetching } = useQuery(
    ['admin-inquiries', searchTerm, filterStatus, showArchived],
    async () => {
      try {
        // Only send non-empty parameters
        const params = { limit: 50 };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterStatus) params.status = filterStatus;
        params.archived = showArchived;
        
        // Add cache-busting parameter
        params._t = Date.now();
        const response = await inquiriesAPI.getInquiries(params);
        return response.data;
      } catch (err) {
        console.error('AdminInquiries: API Error:', err);
        console.error('AdminInquiries: Error details:', {
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
        console.error('AdminInquiries: Query Error:', err);
        showError('Failed to load inquiries');
      }
    }
  );

  // Update inquiry status mutation
  // const updateInquiryMutation = useMutation(
  //   ({ id, status }) => inquiriesAPI.updateInquiry(id, { status }),
  //   {
  //onSuccess: () => {
  //       showSuccess('Inquiry status updated successfully');
  //       queryClient.invalidateQueries('admin-inquiries');
  //     },
  //     onError: () => {
  //       showError('Failed to update inquiry status');
  //     }
  //   }
  // );

  // Delete inquiry mutation
  const deleteInquiryMutation = useMutation(
    (id) => inquiriesAPI.deleteInquiry(id),
    {
      onSuccess: () => {
        showSuccess('Inquiry deleted successfully');
        queryClient.invalidateQueries('admin-inquiries');
      },
      onError: () => {
        showError('Failed to delete inquiry');
      }
    }
  );

  // Archive inquiry mutation
  const archiveInquiryMutation = useMutation(
    (id) => inquiriesAPI.archiveInquiry(id),
    {
      onSuccess: () => {
        showSuccess('Inquiry archived successfully');
        queryClient.invalidateQueries('admin-inquiries');
      },
      onError: () => {
        showError('Failed to archive inquiry');
      }
    }
  );

  // Restore inquiry mutation
  const restoreInquiryMutation = useMutation(
    (id) => inquiriesAPI.restoreInquiry(id),
    {
      onSuccess: () => {
        showSuccess('Inquiry restored successfully');
        queryClient.invalidateQueries('admin-inquiries');
      },
      onError: () => {
        showError('Failed to restore inquiry');
      }
    }
  );

  // const handleStatusChange = (id, newStatus) => {
  //   updateInquiryMutation.mutate({ id, status: newStatus });
  // };

  const handleDelete = (id, name) => {
    setInquiryToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (inquiryToDelete) {
      deleteInquiryMutation.mutate(inquiryToDelete.id);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setInquiryToDelete(null);
  };

  const handleArchive = (id, name) => {
    setInquiryToArchive({ id, name });
    setShowArchiveModal(true);
  };

  const confirmArchive = (     ) => {
    if (inquiryToArchive) {
      archiveInquiryMutation.mutate(inquiryToArchive.id);
    }
  };

  const cancelArchive = () => {
    setShowArchiveModal(false);
    setInquiryToArchive(null);
  };

  const handleRestore = (id, name) => {
    if (window.confirm(`Are you sure you want to restore inquiry from "${name}"?`)) {
      restoreInquiryMutation.mutate(id);
    }
  };

  const handleRefresh = async () => {
    try {
      // Clear server cache first
      try {
        await inquiriesAPI.clearCache();
      } catch (cacheError) {
        console.warn('AdminInquiries: Failed to clear server cache:', cacheError);
        // Continue with refresh even if cache clear fails
      }
      
      // Invalidate client cache and refetch
      queryClient.invalidateQueries(['admin-inquiries']);
      await refetch();
      showSuccess('Inquiries refreshed successfully');
    } catch (error) {
      console.error('AdminInquiries: Refresh error:', error);
      showError('Failed to refresh inquiries');
    }
  };

  const inquiries = inquiriesData?.inquiries || [];

  return (
    <>
      <Helmet>
        <title>Manage Inquiries - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Inquiries" user={user} onLogout={logout}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">All Inquiries</h2>
            <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700/50 whitespace-nowrap">
              {inquiries.length} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 flex-1 sm:flex-none justify-center"
            >
              <FiRefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline">Refresh</span>
              <span className="xs:hidden">🔄</span>
            </button>
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="not-interested">Not Interested</option>
                <option value="closed">Closed</option>
              </select>
              
              <select
                value={showArchived ? 'archived' : 'active'}
                onChange={(e) => setShowArchived(e.target.value === 'archived')}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="active">Active Inquiries</option>
                <option value="archived">Archived Inquiries</option>
              </select>
              
              <div></div>
              
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('');
                  setShowArchived(false);
                }}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Inquiries Table */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden mx-1 sm:mx-0">
            
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-slate-300">Loading inquiries...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-red-400 mb-2">Error loading inquiries</p>
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
            ) : inquiries.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-300">No inquiries found</p>
                <p className="text-sm text-slate-400 mt-2">
                  Try adjusting your search criteria or check back later for new inquiries.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Contact
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Property
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Message
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Date
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-900/30 divide-y divide-slate-700/50">
                    {inquiries.map((inquiry) => (
                      <tr key={inquiry._id} className="hover:bg-slate-800/50">
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <FiMail className="w-6 h-6 text-blue-400" />
                              </div>
                            </div>
                            <div className="ml--2 sm:ml-3 md:ml-4 min-w-0">
                              <div className="text-sm font-medium text-white">
                                {inquiry.name}
                              </div>
                              <div className="text-sm text-slate-400">
                                {inquiry.email}
                              </div>
                              {inquiry.phone && (
                                <div className="text-sm text-slate-400 flex items-center gap-1">
                                  <FiPhone className="w-3 h-3" />
                                  {inquiry.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">
                            {inquiry.property?.title || 'N/A'}
                          </div>
                          <div className="text-sm text-slate-400">
                            {inquiry.property?.type || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-200 max-w-xs truncate">
                            {inquiry.message}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            inquiry.status === 'new' ? 'bg-yellow-500/20 text-yellow-400' :
                            inquiry.status === 'contacted' ? 'bg-blue-500/20 text-blue-400' :
                            inquiry.status === 'interested' ? 'bg-green-500/20 text-green-400' :
                            inquiry.status === 'not-interested' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {inquiry.status || 'new'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          <div className="flex items-center gap-1">
                            <FiCalendar className="w-3 h-3" />
                            {new Date(inquiry.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/inquiries/${inquiry._id}`}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              aria-label={`View inquiry from ${inquiry.name || inquiry._id}`}
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin/inquiries/${inquiry._id}/edit`}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              aria-label={`Edit inquiry from ${inquiry.name || inquiry._id}`}
                              title="Edit"
                            >
                              <FiEdit className="w-4 h-4" />
                            </Link>
                            {showArchived ? (
                              <button
                                onClick={() => handleRestore(inquiry._id, inquiry.name)}
                                className="text-green-400 hover:text-green-300 transition-colors"
                                type="button"
                                aria-label={`Restore inquiry from ${inquiry.name || inquiry._id}`}
                                title="Restore"
                                disabled={restoreInquiryMutation.isLoading}
                              >
                                <FiRotateCcw className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchive(inquiry._id, inquiry.name)}
                                className="text-yellow-400 hover:text-yellow-300"
                                type="button"
                                aria-label={`Archive inquiry from ${inquiry.name || inquiry._id}`}
                                title="Archive"
                                disabled={archiveInquiryMutation.isLoading}
                              >
                                <FiArchive className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(inquiry._id, inquiry.name)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              type="button"
                              aria-label={`Delete inquiry from ${inquiry.name || inquiry._id}`}
                              title="Delete"
                              disabled={deleteInquiryMutation.isLoading}
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
          title="Delete Inquiry"
          message={`Are you sure you want to delete inquiry from "${inquiryToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Archive Confirmation Modal */}
        <ConfirmationModal
          isOpen={showArchiveModal}
          onClose={cancelArchive}
          onConfirm={confirmArchive}
          title="Archive Inquiry"
          message={`Are you sure you want to archive inquiry from "${inquiryToArchive?.name}"? You can restore it later from the archived inquiries.`}
          confirmText="Archive"
          cancelText="Cancel"
          type="warning"
        />
      </AdminLayout>
    </>
  );
};

export default AdminInquiries;
