import React from 'react';
import { FiEye, FiUsers, FiTrendingUp, FiGlobe } from '../../icons/feather';

const AnalyticsOverview = ({
  data,
  loading = false,
  showTitle = true,
  compact = false
}) => {
  if (loading) {
    return (
      <div className={`${compact ? 'py-4' : 'py-8'} bg-white rounded-lg shadow-sm`}>
        <div className="animate-pulse space-y-4">
          {showTitle && (
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="text-center">
                <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: 'Total Visits',
      value: data.totalVisits || 0,
      icon: FiEye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Unique Visitors',
      value: data.uniqueVisitors || 0,
      icon: FiUsers,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Avg. Session',
      value: data.avgSessionDuration ?
        `${Math.floor(data.avgSessionDuration / 60)}m ${data.avgSessionDuration % 60}s` : '0s',
      icon: FiTrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Countries',
      value: data.topCountries?.length || 0,
      icon: FiGlobe,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className={`${compact ? 'py-4' : 'py-8'} bg-white rounded-lg shadow-sm`}>
      {showTitle && (
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Website Analytics
          </h3>
          <p className="text-sm text-gray-600">
            Live visitor statistics for the last 30 days
          </p>
        </div>
      )}

      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-4`}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${stat.bgColor} mb-3`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                {typeof stat.value === 'number' && stat.value > 1000
                  ? `${(stat.value / 1000).toFixed(1)}k`
                  : stat.value
                }
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Top Countries */}
      {!compact && data.topCountries && data.topCountries.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Visitor Countries</h4>
          <div className="flex flex-wrap gap-2">
            {data.topCountries.slice(0, 5).map((country, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {country._id} ({country.visits})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsOverview;
