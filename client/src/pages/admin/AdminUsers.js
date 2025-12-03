import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiSearch, FiShield, FiUser, FiUpload } from '../../icons/feather';
import { usersAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import BulkUploadModal from '../../components/admin/BulkUploadModal';
import { showSuccess, showError } from '../../utils/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../components/ui/shadcn/select';

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const queryClient = useQueryClient();
  const { user, logout, isAuthenticated, canManageUsers, hasHierarchyLevel, canBulkUpload } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated or not admin (hierarchy 1)
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    } else if (isAuthenticated && (!canManageUsers() || !hasHierarchyLevel(1))) {
      navigate('/admin/dashboard');
      showError('You do not have permission to manage users');
    }
  }, [isAuthenticated, canManageUsers, hasHierarchyLevel, navigate]);

  // Fetch users
  const { data: usersData, isLoading, error, refetch, isFetching } = useQuery(
    ['admin-users', searchTerm, filterRole],
    async () => {
      try {
        // Only send non-empty parameters
        const params = { limit: 50 };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterRole) params.role = filterRole;
        
        // Add cache-busting parameter
        params._t = Date.now();
        const response = await usersAPI.getUsers(params);
        return response.data;
      } catch (err) {
        console.error('AdminUsers: API Error:', err);
        console.error('AdminUsers: Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        throw err;
      }
    },
    { 
      staleTime: 5 * 60 * 1000,
      retry: 3,
      retryDelay: 1000,
      onError: (err) => {
        console.error('AdminUsers: Query Error:', err);
        showError('Failed to load users');
      }
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    (id) => usersAPI.deleteUser(id),
    {
      onSuccess: () => {
        showSuccess('User deleted successfully');
        queryClient.invalidateQueries('admin-users');
      },
      onError: () => {
        showError('Failed to delete user');
      }
    }
  );

  const handleDelete = (id, name) => {
    setUserToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleRefresh = async () => {
    try {
      // Clear server cache first
      try {
        await usersAPI.clearCache();
      } catch (cacheError) {
        console.warn('AdminUsers: Failed to clear server cache:', cacheError);
        // Continue with refresh even if cache clear fails
      }
      
      // Invalidate client cache and refetch
      queryClient.invalidateQueries(['admin-users']);
      await refetch();
      showSuccess('Users refreshed successfully');
    } catch (error) {
      console.error('AdminUsers: Refresh error:', error);
      showError('Failed to refresh users');
    }
  };

  const getEntityId = (entity) => {
    if (!entity) return '';
    if (typeof entity === 'string') return entity;
    if (typeof entity === 'object') {
      return entity._id || entity.id || '';
    }
    return '';
  };

  const users = usersData?.users || [];

  return (
    <>
      <Helmet>
        <title>Manage Users - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Users" user={user} onLogout={logout}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">All Users</h2>
            <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700/50 whitespace-nowrap">
              {users.length} total
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
              to="/admin/users/new"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex-1 sm:flex-none justify-center"
            >
              <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline">Add User</span>
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
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 animate-pulse"></div>
                  <span className="text-xs sm:text-sm text-slate-300 truncate">Updating users...</span>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              
              <Select value={filterRole || 'all'} onValueChange={(v) => setFilterRole(v === 'all' ? '' : v)}>
                <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[150px]">
                  <span>
                    {filterRole === 'user' ? 'Users' : 
                     filterRole === 'sales_agent' ? 'Sales Agents' :
                     filterRole === 'sales_team_leader' ? 'Team Leaders' :
                     filterRole === 'sales_manager' ? 'Sales Managers' :
                     filterRole === 'admin' ? 'Admins' : 'All Roles'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="sales_agent">Sales Agents</SelectItem>
                  <SelectItem value="sales_team_leader">Team Leaders</SelectItem>
                  <SelectItem value="sales_manager">Sales Managers</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
              
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterRole('');
                }}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden mx-1 sm:mx-0">
            <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b border-slate-700/50">
              <h2 className="text-base sm:text-lg font-semibold text-white">
                Users ({users.length})
              </h2>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-slate-300">Loading users...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-red-400">Error loading users</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-300">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        User
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Email
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Role
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Phone
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Joined
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-900/30 divide-y divide-slate-700/50">
                    {users.map((user) => {
                      const userId = getEntityId(user);
                      return (
                      <tr key={userId} className="hover:bg-slate-800/50">
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-slate-700/50 flex items-center justify-center">
                                {user.role === 'admin' ? (
                                  <FiShield className="w-5 h-5 text-red-400" />
                                ) : (
                                  <FiUser className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                            </div>
                            <div className="ml--2 sm:ml-3 md:ml-4 min-w-0">
                              <div className="text-sm font-medium text-white">
                                {user.name}
                              </div>
                              <div className="text-sm text-slate-400">
                                ID: {userId ? userId.slice(-8) : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {user.email}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                              user.role === 'sales_manager' ? 'bg-orange-500/20 text-orange-400' :
                              user.role === 'sales_team_leader' ? 'bg-blue-500/20 text-blue-400' :
                              user.role === 'sales_agent' ? 'bg-green-500/20 text-green-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {user.role === 'admin' ? 'Admin' :
                               user.role === 'sales_manager' ? 'Sales Manager' :
                               user.role === 'sales_team_leader' ? 'Team Leader' :
                               user.role === 'sales_agent' ? 'Sales Agent' :
                               'User'}
                            </span>
                            {user.hierarchy && (
                              <span className="text-xs text-slate-500">
                                Lvl {user.hierarchy}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {user.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/users/${userId}`}
                              className="text-blue-600 hover:text-blue-900"
                              aria-label={`View user ${user.name || user.email}`}
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin/users/${userId}/edit`}
                              className="text-green-600 hover:text-green-900"
                              aria-label={`Edit user ${user.name || user.email}`}
                              title="Edit"
                            >
                              <FiEdit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(userId, user.name)}
                              className="text-red-600 hover:text-red-900"
                              type="button"
                              aria-label={`Delete user ${user.name || user.email}`}
                              title="Delete"
                              disabled={deleteUserMutation.isLoading}
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

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Delete User"
          message={`Are you sure you want to delete user "${userToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          entityType="users"
          onUploadSuccess={() => {
            handleRefresh();
            setShowBulkUploadModal(false);
          }}
        />
      </AdminLayout>
    </>
  );
};

export default AdminUsers;
