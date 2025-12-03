import React from 'react';
import { FiTrendingUp, FiTrendingDown } from '../../icons/feather';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'text-blue-600', 
  bgColor = 'bg-blue-50',
  trend,
  trendValue,
  loading = false,
  subtitle,
  onClick
}) => {
  const TrendIcon = trend === 'up' ? FiTrendingUp : FiTrendingDown;
  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';

  return (
    <div 
      className={`bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6 hover:shadow-2xl transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-600/50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-300 mb-1">{title}</p>
          <div className={`text-3xl font-bold ${color} mb-1`}>
            {loading ? (
              <div className="animate-pulse bg-slate-600 h-8 w-20 rounded"></div>
            ) : (
              value
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
