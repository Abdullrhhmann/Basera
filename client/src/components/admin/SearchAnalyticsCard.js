import React from 'react';
import { FiSearch, FiTrendingUp, FiHash } from '../../icons/feather';

const SearchAnalyticsCard = ({
  title,
  data,
  loading,
  icon: Icon = FiSearch,
  color = "text-blue-600",
  bgColor = "bg-blue-50"
}) => {
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-4/5"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className={`${bgColor} p-2 rounded-lg`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>

      <div className="space-y-3">
        {data && data.length > 0 ? (
          data.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                <FiHash className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {item._id || item.query}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-700">
                  {item.count || item.searches}
                </span>
                {item.avgResults !== undefined && (
                  <span className="text-xs text-gray-500">
                    ({Math.round(item.avgResults)} avg results)
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <FiSearch className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No search data available yet</p>
            <p className="text-xs text-gray-400 mt-1">Start searching to see analytics</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchAnalyticsCard;
