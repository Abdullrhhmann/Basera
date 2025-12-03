import React, { useState, useEffect } from 'react';
import { FiSearch, FiTrendingUp, FiHash, FiClock, FiUser, FiFilter, FiEye, FiCalendar, FiBarChart, FiPieChart, FiActivity } from '../../icons/feather';
import { searchAPI } from '../../utils/api';
import SearchAnalyticsCard from './SearchAnalyticsCard';
import ChartCard from './ChartCard';

const SearchAnalyticsPanel = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchStats, setSearchStats] = useState(null);
  const [searchTrends, setSearchTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all search analytics data
  useEffect(() => {
    fetchSearchAnalytics();
  }, []);

  // Add error boundary
  useEffect(() => {
    const handleError = (error) => {
      console.error('SearchAnalyticsPanel Error:', error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const fetchSearchAnalytics = async () => {
    setLoading(true);
    try {
      // Test authentication first
      try {
        const testResponse = await searchAPI.getSearchStats();
      } catch (authError) {
        console.error('❌ Authentication test failed:', authError);
        throw authError;
      }

      const [recentData, statsData, trendsData] = await Promise.all([
        searchAPI.getRecentSearches({ limit: 50 }),
        searchAPI.getSearchStats(),
        searchAPI.getSearchTrends()
      ]);

      setRecentSearches(recentData.recentSearches || []);
      setSearchStats(statsData);
      setSearchTrends(trendsData.trends || []);
    } catch (error) {
      console.error('❌ Error fetching search analytics:', error);
      setError(error.message || 'Failed to load search analytics data');

      // If authentication fails, show helpful message
      if (error.response?.status === 401) {
        console.error('🔒 User not authenticated. Please log in as admin.');
        setError('Authentication required. Please log in as admin.');
      } else if (error.response?.status === 403) {
        console.error('🚫 Admin access required. Please log in as administrator.');
        setError('Admin access required. Please log in as administrator.');
      } else if (error.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to load search analytics. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiBarChart },
    { id: 'recent', label: 'Recent Searches', icon: FiClock },
    { id: 'trends', label: 'Trends', icon: FiTrendingUp },
    { id: 'details', label: 'Search Details', icon: FiEye }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Search Analytics</h3>
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchSearchAnalytics();
            }}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <FiSearch className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Search Analytics</h2>
            <p className="text-sm text-gray-500">Monitor search activity and user behavior</p>
          </div>
        </div>
        <button
          onClick={fetchSearchAnalytics}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiActivity className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Searches</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {searchStats?.totalSearches || 0}
                  </p>
                </div>
                <FiSearch className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Unique Queries</p>
                  <p className="text-2xl font-bold text-green-700">
                    {searchStats?.uniqueQueries || 0}
                  </p>
                </div>
                <FiHash className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Avg Results</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {searchStats?.avgResultsPerSearch || 0}
                  </p>
                </div>
                <FiBarChart className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Search Trends Chart */}
            <ChartCard
              title="Search Trends (Last 7 Days)"
              data={searchTrends.map(trend => ({
                label: new Date(trend._id).toLocaleDateString(),
                value: trend.searches
              }))}
              type="line"
              loading={false}
              height={250}
              color="#3B82F6"
            />

            {/* Top Search Terms */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Search Terms</h3>
              <div className="space-y-3">
                {searchStats?.topFilters?.slice(0, 5).map((filter, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{filter._id || 'Other'}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(filter.count / (searchStats?.topFilters?.[0]?.count || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-600">{filter.count}</span>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-sm">No search data available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recent' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Searches</h3>
            <span className="text-sm text-gray-500">{recentSearches.length} searches</span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recentSearches.length > 0 ? (
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <div key={search._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FiSearch className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">"{search.query}"</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <FiClock className="w-3 h-3" />
                            <span>{new Date(search.createdAt).toLocaleString()}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <FiUser className="w-3 h-3" />
                            <span>{search.ipAddress}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <FiHash className="w-3 h-3" />
                            <span>{search.resultsCount} results</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    {search.filters && Object.keys(search.filters).length > 0 && (
                      <div className="flex items-center space-x-1">
                        <FiFilter className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {Object.entries(search.filters)
                            .filter(([key, value]) => value)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FiSearch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent searches found</p>
                <p className="text-sm text-gray-400">Searches will appear here once users start searching</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Search Volume */}
            <ChartCard
              title="Daily Search Volume"
              data={searchTrends.map(trend => ({
                label: new Date(trend._id).toLocaleDateString(),
                value: trend.searches
              }))}
              type="area"
              loading={false}
              height={300}
              color="#10B981"
            />

            {/* Unique Queries Over Time */}
            <ChartCard
              title="Unique Queries Per Day"
              data={searchTrends.map(trend => ({
                label: new Date(trend._id).toLocaleDateString(),
                value: trend.uniqueCount
              }))}
              type="line"
              loading={false}
              height={300}
              color="#8B5CF6"
            />
          </div>

          {/* Trends Table */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Trends Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Date</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Total Searches</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Unique Queries</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Engagement Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {searchTrends.map((trend, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-3 text-sm text-gray-900">
                        {new Date(trend._id).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-900">{trend.searches}</td>
                      <td className="py-3 px-3 text-sm text-gray-900">{trend.uniqueCount}</td>
                      <td className="py-3 px-3 text-sm text-gray-900">
                        {trend.searches > 0 ? Math.round((trend.uniqueCount / trend.searches) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Search Statistics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Results per Search:</span>
                  <span className="font-semibold">{searchStats?.avgResultsPerSearch || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Unique Queries:</span>
                  <span className="font-semibold">{searchStats?.uniqueQueries || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Search Conversion Rate:</span>
                  <span className="font-semibold">
                    {searchStats?.totalSearches > 0
                      ? Math.round((searchStats.uniqueQueries / searchStats.totalSearches) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Search Log */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Search Log</h3>
            <div className="max-h-64 overflow-y-auto">
              {recentSearches.slice(0, 20).map((search, index) => (
                <div key={search._id || index} className="mb-4 p-3 bg-white rounded border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <FiSearch className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-900">"{search.query}"</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(search.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">IP:</span> {search.ipAddress}
                    </div>
                    <div>
                      <span className="font-medium">Results:</span> {search.resultsCount}
                    </div>
                    <div>
                      <span className="font-medium">User:</span> {search.user ? 'Logged in' : 'Anonymous'}
                    </div>
                    <div>
                      <span className="font-medium">Device:</span> {search.userAgent ? 'Mobile' : 'Desktop'}
                    </div>
                  </div>
                  {search.filters && Object.keys(search.filters).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs font-medium text-gray-700">Filters: </span>
                      <span className="text-xs text-gray-600">
                        {Object.entries(search.filters)
                          .filter(([key, value]) => value)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAnalyticsPanel;
