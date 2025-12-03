import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { FiSearch, FiMail, FiCalendar, FiUser, FiRefreshCw, FiDownload } from '../../icons/feather';
import { newsletterAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { showSuccess, showError } from '../../utils/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../components/ui/shadcn/select';

const AdminNewsletterSubscriptions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('');
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

  // Fetch newsletter subscriptions
  const { data: subscriptionsData, isLoading, error, refetch, isFetching } = useQuery(
    ['admin-newsletter-subscriptions', searchTerm, filterSource],
    async () => {
      try {
        const params = { limit: 50 };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterSource) params.source = filterSource;

        params._t = Date.now();
        const response = await newsletterAPI.getSubscriptions(params);
        return response.data;
      } catch (err) {
        console.error('AdminNewsletterSubscriptions: API Error:', err);
        throw err;
      }
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: 1000,
      onError: (err) => {
        console.error('AdminNewsletterSubscriptions: Query Error:', err);
        showError('Failed to load newsletter subscriptions');
      }
    }
  );

  const handleRefresh = async () => {
    try {
      queryClient.invalidateQueries(['admin-newsletter-subscriptions']);
      await refetch();
      showSuccess('Newsletter subscriptions refreshed successfully');
    } catch (error) {
      console.error('AdminNewsletterSubscriptions: Refresh error:', error);
      showError('Failed to refresh newsletter subscriptions');
    }
  };

  const handleExport = async () => {
    try {
      const response = await newsletterAPI.exportSubscriptions();
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `newsletter-subscriptions-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showSuccess('Newsletter subscriptions exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export newsletter subscriptions');
    }
  };

  const subscriptions = subscriptionsData?.subscriptions || [];
  const pagination = subscriptionsData?.pagination || {};

  return (
    <>
      <Helmet>
        <title>Newsletter Subscriptions - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Newsletter Subscriptions" user={user} onLogout={logout}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">All Newsletter Subscriptions</h2>
            <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700/50 whitespace-nowrap">
              {pagination.totalItems || subscriptions.length} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 shadow-lg"
            >
              <FiDownload className="w-4 h-4" />
              Export to Excel
            </button>
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
                  <span className="text-xs sm:text-sm text-slate-300 truncate">Updating subscriptions...</span>
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
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              />
            </div>

            <Select value={filterSource || 'all'} onValueChange={(v) => setFilterSource(v === 'all' ? '' : v)}>
              <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[150px]">
                <span>
                  {filterSource ? filterSource.charAt(0).toUpperCase() + filterSource.slice(1) : 'All Sources'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="footer">Footer</SelectItem>
                <SelectItem value="registration">Registration</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => {
                setSearchTerm('');
                setFilterSource('');
              }}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden mx-1 sm:mx-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-slate-300">Loading subscriptions...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400 mb-2">Error loading subscriptions</p>
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
          ) : subscriptions.length === 0 ? (
            <div className="p-8 text-center">
              <FiMail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-300">No newsletter subscriptions found</p>
              <p className="text-sm text-slate-400 mt-2">
                Try adjusting your search criteria or check back later for new subscriptions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Email
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Subscribed Date
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Source
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      User
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900/30 divide-y divide-slate-700/50">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription._id} className="hover:bg-slate-800/50">
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                              <FiMail className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                            </div>
                          </div>
                          <div className="ml-3 sm:ml-4 min-w-0">
                            <div className="text-sm font-medium text-white">
                              {subscription.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                          <FiCalendar className="w-3 h-3" />
                          {subscription.subscribedAt 
                            ? new Date(subscription.subscribedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          subscription.source === 'footer' 
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {subscription.source ? subscription.source.charAt(0).toUpperCase() + subscription.source.slice(1) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        {subscription.userId ? (
                          <div className="flex items-center gap-2">
                            <FiUser className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-white">{subscription.userId.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          subscription.isActive 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {subscription.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-8 sm:mt-12">
            <div className="px-4 sm:px-6 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl shadow-sm">
              <span className="text-slate-300 font-medium text-sm sm:text-base">
                Page <span className="text-blue-400 font-semibold">{pagination.currentPage}</span> of{' '}
                <span className="text-blue-400 font-semibold">{pagination.totalPages}</span>
              </span>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default AdminNewsletterSubscriptions;

