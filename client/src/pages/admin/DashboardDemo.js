import React, { useEffect, useState, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useQueryClient } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FiBox, FiUsers, FiMessageSquare, FiDollarSign, FiCalendar, FiMapPin, FiRefreshCw, FiWifi, FiWifiOff, FiDownload, FiBuilding, FiTrendingUp, FiTrendingDown, FiArrowRight, FiPlus, FiSettings, FiLogOut, FiFileText } from '../../icons/feather';
import { propertiesAPI, usersAPI, inquiriesAPI, dashboardAPI, developersAPI, citiesAPI, governoratesAPI, areasAPI, blogsAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';

// Aceternity UI Components (simplified - no complex animations)

// Recharts Components
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const ExportPanel = React.lazy(() => import('../../components/admin/ExportPanel'));

// Unified Dark Panel Component for consistent styling
const DarkPanel = ({ 
  children, 
  className = '', 
  gradient = 'from-blue-500/5 to-purple-500/5',
  hoverGradient = 'from-blue-500/10 to-purple-500/10',
  onClick,
  ...props 
}) => {
  return (
    <div 
      className={`group relative bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:scale-[1.02] hover:border-slate-600/50' : ''
      } ${className}`}
      onClick={onClick}
      {...props}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl group-hover:${hoverGradient} transition-opacity duration-300`}></div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Modern Glass Stat Card Component
const DarkStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'text-blue-400', 
  bgColor = 'bg-blue-600',
  gradient = 'from-blue-500 to-cyan-500',
  trend,
  trendValue,
  loading = false,
  subtitle,
  onClick
}) => {
  const TrendIcon = trend === 'up' ? FiTrendingUp : FiTrendingDown;
  const trendColor = trend === 'up' ? 'text-green-400' : 'text-red-400';

  return (
    <DarkPanel 
      gradient={`${gradient} opacity-5`}
      hoverGradient={`${gradient} opacity-10`}
      onClick={onClick}
      className="p-4 sm:p-5 md:p-6"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="text-xs sm:text-sm font-medium text-slate-300">{title}</p>
        <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      </div>
      
      <div className={`text-2xl sm:text-3xl md:text-4xl font-bold ${color} mb-2`}>
        {loading ? (
          <div className="bg-slate-600 h-8 sm:h-10 w-20 sm:w-24 rounded-lg animate-pulse"></div>
        ) : (
          value
        )}
      </div>
      
      {subtitle && (
        <p className="text-xs sm:text-sm text-slate-400 mb-2 sm:mb-3">{subtitle}</p>
      )}
      
      {trend && trendValue && (
        <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium ${trendColor}`}>
          <div className={`p-0.5 sm:p-1 rounded-lg ${trend === 'up' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <TrendIcon className="w-3 h-3" />
          </div>
          <span>{trendValue}</span>
        </div>
      )}
    </DarkPanel>
  );
};

// Modern Glass Quick Action Card
const DarkQuickActionCard = ({
  title,
  description,
  path,
  icon: Icon,
  gradient = 'from-blue-500 to-cyan-500',
  onClick,
  showAddButton = false,
  onAddClick,
  buttonText = 'View All'
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <DarkPanel 
      gradient={`${gradient} opacity-5`}
      hoverGradient={`${gradient} opacity-10`}
      className="p-4 sm:p-5 md:p-6 min-h-[160px] sm:min-h-[180px] md:min-h-[200px]"
    >
      <div className="flex items-start justify-between mb-4 sm:mb-5 md:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <div className={`p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm sm:text-base md:text-lg group-hover:text-slate-100 transition-colors">{title}</h2>
            <p className="text-xs sm:text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{description}</p>
          </div>
        </div>
        {showAddButton && (
          <button
            onClick={onAddClick}
            type="button"
            aria-label="Add new item"
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 flex-shrink-0"
          >
            <FiPlus className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        )}
      </div>

      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r ${gradient} text-white px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105`}
      >
        <span className="hidden xs:inline">{buttonText}</span>
        <span className="xs:hidden">View</span>
        <FiArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
      </button>
    </DarkPanel>
  );
};

// Modern Glass Activity Card Component
const ActivityCard = ({ title, items, icon: Icon, gradient = 'from-blue-500 to-cyan-500', onClick }) => {
  return (
    <DarkPanel 
      gradient={`${gradient} opacity-5`}
      hoverGradient={`${gradient} opacity-10`}
      onClick={onClick}
      className="p-4 sm:p-5 md:p-6 cursor-pointer"
    >
      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">{title}</h3>
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <span className="text-xs sm:text-sm font-medium text-slate-300">{items.length}</span>
          <span className="text-xs text-slate-400 hidden xs:inline">total</span>
        </div>
      </div>
      <div className="space-y-2 sm:space-y-3">
        {items.slice(0, 4).map((item, index) => (
          <div key={index} className="group/item flex items-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 bg-slate-800/50 rounded-lg sm:rounded-xl hover:bg-slate-700/50 transition-all duration-200 border border-slate-700/30 hover:border-slate-600/50">
            <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br ${gradient} rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-white truncate group-hover/item:text-slate-100 transition-colors">{item.title}</p>
              <p className="text-xs sm:text-sm text-slate-400 group-hover/item:text-slate-300 transition-colors truncate">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </DarkPanel>
  );
};

const DashboardDemo = () => {
  const { 
    user, 
    logout, 
    isAuthenticated, 
    isAdminRole,
    canManageUsers,
    userRole
  } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showExportPanel, setShowExportPanel] = useState(false);

  // Redirect if not authenticated or not admin role
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    } else if (isAuthenticated && !isAdminRole()) {
      navigate('/');
    }
  }, [isAuthenticated, isAdminRole, navigate]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        propertiesAPI.clearCache(),
        usersAPI.clearCache(),
        inquiriesAPI.clearCache()
      ]);
      
      queryClient.invalidateQueries(['dashboard-properties']);
      queryClient.invalidateQueries(['dashboard-users']);
      queryClient.invalidateQueries(['dashboard-inquiries']);
      queryClient.invalidateQueries(['dashboard-leads']);
      queryClient.invalidateQueries(['dashboard-developers']);
      queryClient.invalidateQueries(['dashboard-cities']);
      queryClient.invalidateQueries(['dashboard-stats']);

      setLastRefresh(new Date());
      showSuccess('Dashboard refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showError('Failed to refresh dashboard data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch dashboard data
  const { data: propertiesData, isLoading: propertiesLoading, isFetching: propertiesFetching } = useQuery(
    'dashboard-properties',
    async () => {
      const response = await propertiesAPI.getProperties({ limit: 50 }); // Dashboard overview - keep reasonable
      return response.data;
    },
    { 
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchIntervalInBackground: true,
      retry: 3,
      retryDelay: 1000,
      enabled: isAuthenticated && isAdminRole(),
      onSuccess: () => setLastRefresh(new Date())
    }
  );

  const { data: usersData, isLoading: usersLoading, isFetching: usersFetching } = useQuery(
    'dashboard-users',
    async () => {
      const response = await usersAPI.getUsers({ limit: 50 });
      return response.data;
    },
    { 
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchIntervalInBackground: true,
      retry: 3,
      retryDelay: 1000,
      enabled: isAuthenticated && canManageUsers(), // Only load users for admins who can manage users
      onSuccess: () => setLastRefresh(new Date())
    }
  );

  const { data: inquiriesData, isLoading: inquiriesLoading, isFetching: inquiriesFetching } = useQuery(
    'dashboard-inquiries',
    async () => {
      const response = await inquiriesAPI.getInquiries({ limit: 50 });
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchIntervalInBackground: true,
      retry: 3,
      retryDelay: 1000,
      enabled: isAuthenticated && isAdminRole(),
      onSuccess: () => setLastRefresh(new Date())
    }
  );

  const { data: leadsData, isLoading: leadsLoading, isFetching: leadsFetching } = useQuery(
    'dashboard-leads',
    async () => {
      const response = await inquiriesAPI.getLeads({ limit: 50 });
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchIntervalInBackground: true,
      retry: 3,
      retryDelay: 1000,
      enabled: isAuthenticated && isAdminRole(),
      onSuccess: () => setLastRefresh(new Date())
    }
  );

  const { data: developersData, isLoading: developersLoading } = useQuery(
    'dashboard-developers',
    async () => {
      const response = await developersAPI.getDevelopers({ limit: 100 });
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchIntervalInBackground: true,
      retry: 3,
      retryDelay: 1000,
      enabled: isAuthenticated && isAdminRole(),
      onSuccess: () => setLastRefresh(new Date())
    }
  );

  const { data: citiesData, isLoading: citiesLoading } = useQuery(
    'dashboard-cities',
    async () => {
      const response = await citiesAPI.getCities({ limit: 100 });
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchIntervalInBackground: true,
      retry: 3,
      retryDelay: 1000,
      enabled: isAuthenticated && isAdminRole(),
      onSuccess: () => setLastRefresh(new Date())
    }
  );

  const { data: governoratesData, isLoading: governoratesLoading } = useQuery(
    'dashboard-governorates',
    async () => {
      const response = await governoratesAPI.getGovernorates({ limit: 100 });
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchIntervalInBackground: true,
      retry: 3,
      retryDelay: 1000,
      enabled: isAuthenticated && isAdminRole(),
      onSuccess: () => setLastRefresh(new Date())
    }
  );

  const { data: areasData, isLoading: areasLoading } = useQuery(
    'dashboard-areas',
    async () => {
      const response = await areasAPI.getAreas({ limit: 100 });
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchIntervalInBackground: true,
      retry: 3,
      retryDelay: 1000,
      enabled: isAuthenticated && isAdminRole(),
      onSuccess: () => setLastRefresh(new Date())
    }
  );

  const { data: blogsData, isLoading: blogsLoading } = useQuery(
    'dashboard-blogs',
    async () => {
      const response = await blogsAPI.getBlogs({ limit: 100 });
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchIntervalInBackground: true,
      retry: 3,
      retryDelay: 1000,
      enabled: isAuthenticated && isAdminRole(),
      onSuccess: () => setLastRefresh(new Date())
    }
  );

  const { data: dashboardStats, isLoading: statsLoading, isFetching: statsFetching } = useQuery(
    'dashboard-stats',
    async () => {
      const response = await dashboardAPI.getStats();
      return response.data;
    },
    {
      staleTime: 2 * 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchIntervalInBackground: true,
      retry: 3,
      retryDelay: 1000,
      enabled: isAuthenticated && isAdminRole(),
      onSuccess: () => setLastRefresh(new Date())
    }
  );

  // Show loading while checking authentication
  if (!isAuthenticated || !isAdminRole()) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Get data from API responses
  const properties = propertiesData?.properties || [];
  const users = usersData?.users || [];
  const inquiries = inquiriesData?.inquiries || [];
  const leads = leadsData?.leads || [];
  const developers = developersData?.developers || [];
  const cities = citiesData?.cities || [];
  const governorates = governoratesData?.governorates || [];
  const areas = areasData?.areas || [];
  const blogs = blogsData?.blogs || [];
  const stats = dashboardStats?.stats;

  // Calculate statistics - Use backend stats if available, show loading data otherwise
  // Backend stats are accurate (count ALL properties), frontend queries are limited
  const totalProperties = stats?.properties?.total ?? (statsLoading ? properties.length : 0);
  const activeUsers = stats?.users?.byRole?.user ?? users.filter(user => user.role === 'user').length;
  const adminUsers = stats?.users?.byRole?.admin ?? users.filter(user => user.role === 'admin').length;
  
  const recentInquiries = stats?.inquiries?.thisWeek ?? inquiries.length;
  const newInquiries = stats?.inquiries?.today ?? 0;
  const totalLeads = stats?.leads?.total ?? leads.length;
  const newLeads = stats?.leads?.today ?? 0;

  // Revenue calculations - ONLY from backend stats (frontend data is limited)
  const totalRevenue = stats?.revenue?.total ?? 0;
  const averagePrice = stats?.revenue?.average ?? 0;

  // Chart data
  const propertyTrendData = [
    { name: 'Jan', properties: 12, inquiries: 45 },
    { name: 'Feb', properties: 19, inquiries: 52 },
    { name: 'Mar', properties: 15, inquiries: 38 },
    { name: 'Apr', properties: 22, inquiries: 61 },
    { name: 'May', properties: 18, inquiries: 47 },
    { name: 'Jun', properties: 25, inquiries: 73 },
  ];

  const inquiryStatusData = [
    { name: 'New', value: newInquiries, color: '#3b82f6' },
    { name: 'Contacted', value: recentInquiries - newInquiries, color: '#8b5cf6' },
    { name: 'Converted', value: Math.floor(recentInquiries * 0.3), color: '#10b981' },
    { name: 'Pending', value: Math.floor(recentInquiries * 0.2), color: '#f59e0b' },
  ];

  // const revenueData = [
  //   { name: 'Jan', revenue: 2.5 },
  //   { name: 'Feb', revenue: 3.2 },
  //   { name: 'Mar', revenue: 2.8 },
  //   { name: 'Apr', revenue: 4.1 },
  //   { name: 'May', revenue: 3.7 },
  //   { name: 'Jun', revenue: 5.2 },
  // ];

  // const userGrowthData = [
  //   { name: 'Jan', users: 45 },
  //   { name: 'Feb', users: 52 },
  //   { name: 'Mar', users: 61 },
  //   { name: 'Apr', users: 73 },
  //   { name: 'May', users: 89 },
  //   { name: 'Jun', users: 98 },
  // ];

  // Activity data
  const recentProperties = properties.slice(0, 4).map(property => ({
    title: property.title,
    subtitle: `${property.price?.toLocaleString()} EGP`
  }));

  const activeInquiries = inquiries.slice(0, 4).map(inquiry => ({
    title: inquiry.contactInfo?.name || 'Anonymous',
    subtitle: inquiry.status
  }));

  const recentLeads = leads.slice(0, 4).map(lead => ({
    title: lead.name,
    subtitle: `${lead.status} • ${lead.propertyType}`
  }));

  return (
    <>
      <Helmet>
        <title>Admin Dashboard Demo - Basira Real Estate</title>
        <meta name="description" content="Modern dark mode admin dashboard with data visualization." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#131c2b] to-gray-900">
        {/* Custom Dark Header */}
        <header className="bg-slate-900/80 px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <Link to="/" className="flex items-center flex-shrink-0">
                <div className="w-16 h-8 sm:w-20 sm:h-10 flex items-center justify-center">
                  <img 
                    src="/logos/basiralogo.png" 
                    alt="Basera Real Estate" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </Link>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <button
                type="button" 
                aria-label="Open settings"
                onClick={() => navigate('/admin/settings')}
                className="p-1.5 sm:p-2 md:p-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg sm:rounded-xl transition-all duration-200"
              >
                <FiSettings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-white truncate max-w-[120px] md:max-w-none">{user?.name}</p>
                  <p className="text-xs text-slate-400">
                    {userRole === 'admin' ? 'Admin' : 
                     userRole === 'sales_manager' ? 'Manager' :
                     userRole === 'sales_team_leader' ? 'Leader' :
                     userRole === 'sales_agent' ? 'Agent' : 'User'}
                  </p>
                </div>
                <button
                  onClick={logout}
                  type="button"
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg sm:rounded-xl transition-all duration-200 border border-slate-700/50"
                >
                  <FiLogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
          {/* Modern Header with Glass Effect */}
          <div className="relative mb-4 sm:mb-6 md:mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 rounded-2xl blur-xl"></div>
            <DarkPanel 
              gradient="from-blue-600/20 via-purple-600/20 to-cyan-600/20"
              className="p-4 sm:p-6 md:p-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2 sm:mb-3">
                    Welcome back, {user?.name}!
                  </h1>
                  <p className="text-slate-300 text-sm sm:text-base md:text-lg mb-3 sm:mb-4">
                    Here's what's happening with your real estate business today.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <FiCalendar className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-300">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <FiMapPin className="w-4 h-4 text-green-400" />
                      <span className="text-slate-300">BASIRA</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl">
                    <FiBox className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>
            </DarkPanel>
          </div>

          {/* Modern Status Bar */}
          <DarkPanel 
            gradient="from-slate-500/5 to-slate-600/5"
            className="p-6 mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${(propertiesFetching || usersFetching || inquiriesFetching || leadsFetching || statsFetching) ? 'bg-green-500/20' : 'bg-slate-700/50'}`}>
                    {(propertiesFetching || usersFetching || inquiriesFetching || leadsFetching || statsFetching) ? (
                      <FiWifi className="w-5 h-5 text-green-400 animate-pulse" />
                    ) : (
                      <FiWifiOff className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-200">
                      Auto-refresh: {(propertiesFetching || usersFetching || inquiriesFetching || leadsFetching || statsFetching) ? 'Updating...' : 'Active'}
                    </span>
                    <p className="text-xs text-slate-400">
                      Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowExportPanel(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg"
                >
                  <FiDownload className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Export</span>
                  <span className="xs:hidden">📥</span>
                </button>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                >
                  <FiRefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden xs:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>
          </DarkPanel>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <DarkStatCard
              title="Total Properties"
              value={totalProperties.toLocaleString()}
              icon={FiBox}
              color="text-blue-300"
              gradient="from-blue-500 to-cyan-500"
              trend={stats?.properties?.trend >= 0 ? "up" : "down"}
              trendValue={`${stats?.properties?.trend >= 0 ? '+' : ''}${stats?.properties?.trend || 0}%`}
              loading={propertiesLoading || statsLoading}
              subtitle={`${properties.filter(p => p.status === 'for-sale').length} for sale, ${properties.filter(p => p.status === 'for-rent').length} for rent`}
              onClick={() => navigate('/admin/properties')}
            />
            
            <DarkStatCard
              title="Active Users"
              value={activeUsers.toLocaleString()}
              icon={FiUsers}
              color="text-green-300"
              gradient="from-green-500 to-emerald-500"
              trend={stats?.users?.trend >= 0 ? "up" : "down"}
              trendValue={`${stats?.users?.trend >= 0 ? '+' : ''}${stats?.users?.trend || 0}%`}
              loading={usersLoading || statsLoading}
              subtitle={`${adminUsers} admins`}
              onClick={() => navigate('/admin/users')}
            />
            
            <DarkStatCard
              title="Customer Engagement"
              value={(inquiries.length + leads.length).toLocaleString()}
              icon={FiMessageSquare}
              color="text-purple-300"
              gradient="from-purple-500 to-pink-500"
              trend="up"
              trendValue="+12%"
              loading={inquiriesLoading || leadsLoading || statsLoading}
              subtitle={`${newInquiries + newLeads} new today`}
              onClick={() => navigate('/admin/inquiries')}
            />

            <DarkStatCard
              title="Total Leads"
              value={totalLeads.toLocaleString()}
              icon={FiUsers}
              color="text-orange-300"
              gradient="from-orange-500 to-red-500"
              trend="up"
              trendValue="+8%"
              loading={leadsLoading || statsLoading}
              subtitle={`${newLeads} new today`}
              onClick={() => navigate('/admin/leads')}
            />

            <DarkStatCard
              title="Total Property Value"
              value={`${(totalRevenue / 1000000).toFixed(1)}M EGP`}
              icon={FiDollarSign}
              color="text-cyan-300"
              gradient="from-cyan-500 to-blue-500"
              trend="up"
              trendValue="+15%"
              loading={propertiesLoading || statsLoading}
              subtitle={`Avg: ${averagePrice.toLocaleString()} EGP`}
            />

            <DarkStatCard
              title="Total Developers"
              value={developers.length.toLocaleString()}
              icon={FiBuilding}
              color="text-indigo-300"
              gradient="from-indigo-500 to-blue-500"
              loading={developersLoading}
              subtitle={`${developers.filter(d => d.propertiesCount > 0).length} active`}
              onClick={() => navigate('/admin/developers')}
            />

            <DarkStatCard
              title="Total Cities"
              value={cities.length.toLocaleString()}
              icon={FiMapPin}
              color="text-teal-300"
              gradient="from-teal-500 to-cyan-500"
              loading={citiesLoading}
              subtitle={`${cities.filter(c => c.propertiesCount > 0).length} with properties`}
              onClick={() => navigate('/admin/cities')}
            />

            <DarkStatCard
              title="Total Governorates"
              value={governorates.length.toLocaleString()}
              icon={FiMapPin}
              color="text-violet-300"
              gradient="from-violet-500 to-purple-500"
              loading={governoratesLoading}
              subtitle={`${governorates.filter(g => g.citiesCount > 0).length} with cities`}
              onClick={() => navigate('/admin/governorates')}
            />

            <DarkStatCard
              title="Total Areas"
              value={areas.length.toLocaleString()}
              icon={FiMapPin}
              color="text-sky-300"
              gradient="from-sky-500 to-blue-500"
              loading={areasLoading}
              subtitle={`${areas.filter(a => a.propertiesCount > 0).length} with properties`}
              onClick={() => navigate('/admin/areas')}
            />

            <DarkStatCard
              title="Total Blog Posts"
              value={blogs.length.toLocaleString()}
              icon={FiFileText}
              color="text-pink-300"
              gradient="from-pink-500 to-rose-500"
              loading={blogsLoading}
              subtitle={`${blogs.filter(b => b.status === 'published').length} published`}
              onClick={() => navigate('/admin/blogs')}
            />
          </div>

          {/* Modern Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
            {/* Property Trends Chart */}
            <DarkPanel 
              gradient="from-blue-500/5 to-purple-500/5"
              hoverGradient="from-blue-500/10 to-purple-500/10"
              className="p-4 sm:p-6 md:p-8"
            >
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Property & Inquiry Trends</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-slate-300">Properties</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm text-slate-300">Inquiries</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={propertyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="properties" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="inquiries" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, stroke: '#8b5cf6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
            </DarkPanel>

            {/* Inquiry Status Distribution */}
            <DarkPanel 
              gradient="from-purple-500/5 to-pink-500/5"
              hoverGradient="from-purple-500/10 to-pink-500/10"
              className="p-4 sm:p-6 md:p-8"
            >
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-4 sm:mb-6">Inquiry Status Distribution</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={inquiryStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {inquiryStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {inquiryStatusData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-sm text-slate-300">{entry.name}</span>
                    </div>
                  ))}
                </div>
            </DarkPanel>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <DarkQuickActionCard
              title="Manage Properties"
              description="Add, edit, and manage all property listings"
              path="/admin/properties"
              icon={FiBox}
              gradient="from-blue-500 to-cyan-500"
              showAddButton={true}
              onAddClick={() => navigate('/admin/properties/new')}
              onClick={() => navigate('/admin/properties')}
            />

            <DarkQuickActionCard
              title="Manage Developers"
              description="Add and manage property developers"
              path="/admin/developers"
              icon={FiBuilding}
              gradient="from-indigo-500 to-blue-500"
              showAddButton={true}
              onAddClick={() => navigate('/admin/developers/new')}
              onClick={() => navigate('/admin/developers')}
            />

            <DarkQuickActionCard
              title="Manage Cities"
              description="Add cities and set appreciation rates"
              path="/admin/cities"
              icon={FiMapPin}
              gradient="from-teal-500 to-cyan-500"
              showAddButton={true}
              onAddClick={() => navigate('/admin/cities/new')}
              onClick={() => navigate('/admin/cities')}
            />

            <DarkQuickActionCard
              title="Manage Governorates"
              description="Add and manage governorates"
              path="/admin/governorates"
              icon={FiMapPin}
              gradient="from-violet-500 to-purple-500"
              showAddButton={true}
              onAddClick={() => navigate('/admin/governorates/new')}
              onClick={() => navigate('/admin/governorates')}
            />

            <DarkQuickActionCard
              title="Manage Areas"
              description="Add areas and set appreciation rates"
              path="/admin/areas"
              icon={FiMapPin}
              gradient="from-sky-500 to-blue-500"
              showAddButton={true}
              onAddClick={() => navigate('/admin/areas/new')}
              onClick={() => navigate('/admin/areas')}
            />

            <DarkQuickActionCard
              title="View Inquiries"
              description="Track and manage customer inquiries"
              path="/admin/inquiries"
              icon={FiMessageSquare}
              gradient="from-green-500 to-emerald-500"
              onClick={() => navigate('/admin/inquiries')}
            />

            <DarkQuickActionCard
              title="Manage Leads"
              description="Track and manage potential customers"
              path="/admin/leads"
              icon={FiUsers}
              gradient="from-orange-500 to-red-500"
              onClick={() => navigate('/admin/leads')}
            />

            <DarkQuickActionCard
              title="Manage Users"
              description="Control user access and permissions"
              path="/admin/users"
              icon={FiUsers}
              gradient="from-purple-500 to-pink-500"
              onClick={() => navigate('/admin/users')}
            />

            <DarkQuickActionCard
              title="Manage Launches"
              description="Add, edit, and manage property launches"
              path="/admin/launches"
              icon={FiBuilding}
              gradient="from-yellow-500 to-orange-500"
              showAddButton={true}
              onAddClick={() => navigate('/admin/launches/add')}
              onClick={() => navigate('/admin/launches')}
            />

            <DarkQuickActionCard
              title="Blog Posts"
              description="Create and manage blog articles & insights"
              path="/admin/blogs"
              icon={FiFileText}
              gradient="from-pink-500 to-rose-500"
              showAddButton={true}
              onAddClick={() => navigate('/admin/blogs/new')}
              onClick={() => navigate('/admin/blogs')}
            />
          </div>

          {/* Activity Feed */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <ActivityCard
              title="Recent Properties"
              items={recentProperties}
              icon={FiBox}
              gradient="from-blue-500 to-cyan-500"
              onClick={() => navigate('/admin/properties')}
            />

            <ActivityCard
              title="Active Inquiries"
              items={activeInquiries}
              icon={FiMessageSquare}
              gradient="from-green-500 to-emerald-500"
              onClick={() => navigate('/admin/inquiries')}
            />

            <ActivityCard
              title="Recent Leads"
              items={recentLeads}
              icon={FiUsers}
              gradient="from-orange-500 to-red-500"
              onClick={() => navigate('/admin/leads')}
            />
          </div>

          {/* Export Panel */}
          {showExportPanel && (
            <Suspense fallback={null}>
              <ExportPanel
                isOpen={showExportPanel}
                onClose={() => setShowExportPanel(false)}
                data={{
                  properties: properties,
                  users: users,
                  inquiries: inquiries,
                  leads: leads,
                  agents: [],
                  transactions: []
                }}
                title="Export Dashboard Data"
              />
            </Suspense>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardDemo;
