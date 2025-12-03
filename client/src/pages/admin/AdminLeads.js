import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiTrash2, FiEye, FiSearch, FiPhone, FiCalendar, FiUser, FiRefreshCw, FiArchive, FiRotateCcw, FiUpload } from '../../icons/feather';
import { inquiriesAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import BulkUploadModal from '../../components/admin/BulkUploadModal';
import { showSuccess, showError } from '../../utils/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../components/ui/shadcn/select';

const getEntityId = (entity) => {
  if (!entity) return '';
  if (typeof entity === 'string') return entity;
  if (typeof entity === 'object') {
    return entity._id || entity.id || '';
  }
  return '';
};

const AdminLeads = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPropertyType, setFilterPropertyType] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [leadToArchive, setLeadToArchive] = useState(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const queryClient = useQueryClient();
  const { user, logout, isAuthenticated, isAdminRole, canBulkUpload } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    } else if (isAuthenticated && !isAdminRole()) {
      navigate('/');
    }
  }, [isAuthenticated, isAdminRole, navigate]);

  // Fetch leads
  const { data: leadsData, isLoading, error, refetch, isFetching } = useQuery(
    ['admin-leads', searchTerm, filterStatus, filterPropertyType, showArchived],
    async () => {
      try {
        const params = { limit: 50 };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterStatus) params.status = filterStatus;
        if (filterPropertyType) params.propertyType = filterPropertyType;
        params.archived = showArchived;

        params._t = Date.now();
        const response = await inquiriesAPI.getLeads(params);
        return response.data;
      } catch (err) {
        console.error('AdminLeads: API Error:', err);
        throw err;
      }
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: 1000,
      onError: (err) => {
        console.error('AdminLeads: Query Error:', err);
        showError('Failed to load leads');
      }
    }
  );

  // Update lead mutation
  const updateLeadMutation = useMutation(
    ({ id, status, priority, assignedTo, notes }) =>
      inquiriesAPI.updateLead(id, { status, priority, assignedTo, notes }),
    {
      onSuccess: () => {
        showSuccess('Lead updated successfully');
        queryClient.invalidateQueries('admin-leads');
      },
      onError: () => {
        showError('Failed to update lead');
      }
    }
  );

  // Delete lead mutation
  const deleteLeadMutation = useMutation(
    (id) => inquiriesAPI.deleteLead(id),
    {
      onSuccess: () => {
        showSuccess('Lead deleted successfully');
        queryClient.invalidateQueries('admin-leads');
      },
      onError: () => {
        showError('Failed to delete lead');
      }
    }
  );

  // Archive lead mutation
  const archiveLeadMutation = useMutation(
    (id) => inquiriesAPI.archiveLead(id),
    {
      onSuccess: () => {
        showSuccess('Lead archived successfully');
        queryClient.invalidateQueries('admin-leads');
      },
      onError: () => {
        showError('Failed to archive lead');
      }
    }
  );

  // Restore lead mutation
  const restoreLeadMutation = useMutation(
    (id) => inquiriesAPI.restoreLead(id),
    {
      onSuccess: () => {
        showSuccess('Lead restored successfully');
        queryClient.invalidateQueries('admin-leads');
      },
      onError: () => {
        showError('Failed to restore lead');
      }
    }
  );

  const handleStatusChange = (id, newStatus) => {
    updateLeadMutation.mutate({ id, status: newStatus });
  };

  const handlePriorityChange = (id, newPriority) => {
    updateLeadMutation.mutate({ id, priority: newPriority });
  };

  const handleDelete = (id, name) => {
    setLeadToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (leadToDelete) {
      deleteLeadMutation.mutate(leadToDelete.id);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setLeadToDelete(null);
  };

  const handleArchive = (id, name) => {
    setLeadToArchive({ id, name });
    setShowArchiveModal(true);
  };

  const confirmArchive = () => {
    if (leadToArchive) {
      archiveLeadMutation.mutate(leadToArchive.id);
    }
  };

  const cancelArchive = () => {
    setShowArchiveModal(false);
    setLeadToArchive(null);
  };

  const handleRestore = (id, name) => {
    if (window.confirm(`Are you sure you want to restore lead from "${name}"?`)) {
      restoreLeadMutation.mutate(id);
    }
  };

  const handleRefresh = async () => {
    try {
      await inquiriesAPI.clearCache();
      queryClient.invalidateQueries(['admin-leads']);
      await refetch();
      showSuccess('Leads refreshed successfully');
    } catch (error) {
      console.error('AdminLeads: Refresh error:', error);
      showError('Failed to refresh leads');
    }
  };

  const leads = leadsData?.leads || [];

  return (
    <>
      <Helmet>
        <title>Manage Leads - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Leads" user={user} onLogout={logout}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">All Leads</h2>
            <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700/50 whitespace-nowrap">
              {leads.length} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canBulkUpload() && (
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 shadow-lg"
              >
                <FiUpload className="w-4 h-4" />
                Bulk Upload
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
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
                  <span className="text-xs sm:text-sm text-slate-300 truncate">Updating leads...</span>
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
              {isFetching ? 'Refreshing...' : 'Refresh'}
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

            <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[150px]">
                <span>
                  {filterStatus ? filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1).replace('-', ' ') : 'All Status'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal-sent">Proposal Sent</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPropertyType || 'all'} onValueChange={(v) => setFilterPropertyType(v === 'all' ? '' : v)}>
              <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[170px]">
                <span>
                  {filterPropertyType ? filterPropertyType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'All Property Types'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Property Types</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="twin-villa">Twin Villa</SelectItem>
                <SelectItem value="duplex">Duplex</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="land">Land</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={showArchived ? 'archived' : 'active'}
              onValueChange={(v) => setShowArchived(v === 'archived')}
            >
              <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[150px]">
                <span>{showArchived ? 'Archived Leads' : 'Active Leads'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Leads</SelectItem>
                <SelectItem value="archived">Archived Leads</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('');
                setFilterPropertyType('');
                setShowArchived(false);
              }}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden mx-1 sm:mx-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-slate-300">Loading leads...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400 mb-2">Error loading leads</p>
              <p className="text-sm text-slate-400 mb-4">
                {error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                Try Again
              </button>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-300">No leads found</p>
              <p className="text-sm text-slate-400 mt-2">
                Try adjusting your search criteria or check back later for new leads.
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
                      Service & Type
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Budget
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Priority
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
                  {leads.map((lead) => {
                    const leadId = getEntityId(lead);
                    return (
                    <tr key={leadId} className="hover:bg-slate-800/50">
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                              <FiUser className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                            </div>
                          </div>
                          <div className="ml--2 sm:ml-3 md:ml-4 min-w-0">
                            <div className="text-sm font-medium text-white">
                              {lead.name}
                            </div>
                            <div className="text-sm text-slate-400">
                              {lead.email}
                            </div>
                            {lead.phone && (
                              <div className="text-sm text-slate-400 flex items-center gap-1">
                                <FiPhone className="w-3 h-3" />
                                {lead.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white capitalize">
                          {lead.requiredService}
                        </div>
                        <div className="text-sm text-slate-400 capitalize">
                          {lead.propertyType?.replace('-', ' ')}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {lead.budget?.min && lead.budget?.max
                            ? `${lead.budget.min.toLocaleString()} - ${lead.budget.max.toLocaleString()} ${lead.budget.currency}`
                            : 'Not specified'
                          }
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <select
                          value={lead.status || 'new'}
                          onChange={(e) => handleStatusChange(leadId, e.target.value)}
                          className={`px-2 py-1 text-xs rounded-full border-0 bg-transparent focus:ring-2 focus:ring-blue-500 ${
                            lead.status === 'new' ? 'bg-yellow-500/20 text-yellow-400' :
                            lead.status === 'contacted' ? 'bg-blue-500/20 text-blue-400' :
                            lead.status === 'qualified' ? 'bg-green-500/20 text-green-400' :
                            lead.status === 'proposal-sent' ? 'bg-purple-500/20 text-purple-400' :
                            lead.status === 'negotiating' ? 'bg-orange-500/20 text-orange-400' :
                            lead.status === 'closed' ? 'bg-slate-500/20 text-slate-400' :
                            'bg-red-500/20 text-red-400'
                          }`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="proposal-sent">Proposal Sent</option>
                          <option value="negotiating">Negotiating</option>
                          <option value="closed">Closed</option>
                          <option value="lost">Lost</option>
                        </select>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <select
                          value={lead.priority || 'low'}
                          onChange={(e) => handlePriorityChange(leadId, e.target.value)}
                          className={`px-2 py-1 text-xs rounded-full border-0 bg-transparent focus:ring-2 focus:ring-blue-500 ${
                            lead.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            lead.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        <div className="flex items-center gap-1">
                          <FiCalendar className="w-3 h-3" />
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/leads/${leadId}`}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            aria-label={`View lead ${lead.name || lead.email}`}
                            title="View Details"
                          >
                            <FiEye className="w-4 h-4" />
                          </Link>
                          {showArchived ? (
                            <button
                              onClick={() => handleRestore(leadId, lead.name)}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              type="button"
                              aria-label={`Restore lead ${lead.name || lead.email}`}
                              title="Restore"
                              disabled={restoreLeadMutation.isLoading}
                            >
                              <FiRotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchive(leadId, lead.name)}
                              className="text-orange-400 hover:text-orange-300 transition-colors"
                              type="button"
                              aria-label={`Archive lead ${lead.name || lead.email}`}
                              title="Archive"
                              disabled={archiveLeadMutation.isLoading}
                            >
                              <FiArchive className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(leadId, lead.name)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            type="button"
                            aria-label={`Delete lead ${lead.name || lead.email}`}
                            title="Delete"
                            disabled={deleteLeadMutation.isLoading}
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
          title="Delete Lead"
          message={`Are you sure you want to delete lead from "${leadToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Archive Confirmation Modal */}
        <ConfirmationModal
          isOpen={showArchiveModal}
          onClose={cancelArchive}
          onConfirm={confirmArchive}
          title="Archive Lead"
          message={`Are you sure you want to archive lead from "${leadToArchive?.name}"? You can restore it later from the archived leads.`}
          confirmText="Archive"
          cancelText="Cancel"
          type="warning"
        />

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          entityType="leads"
          onUploadSuccess={() => {
            handleRefresh();
            setShowBulkUploadModal(false);
          }}
        />
      </AdminLayout>
    </>
  );
};

export default AdminLeads;
