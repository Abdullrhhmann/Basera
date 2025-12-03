import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiLogOut, FiSettings, FiHome, FiGrid, FiBuilding, FiMapPin, FiMessageSquare, FiTarget, FiUsers, FiZap, FiClock, FiFileText, FiLayers, FiBriefcase, FiMail, FiVideo } from '../../icons/feather';
import { useAuth } from '../../context/AuthContext';

const AdminLayout = ({ 
  children, 
  title, 
  user, 
  onLogout
}) => {
  const location = useLocation();
  const {
    canManageUsers,
    canManageProperties,
    canApproveProperties,
    canManageLaunches: _canManageLaunches,
    canManageDevelopers,
    canManageInquiries,
    canManageLeads,
    userRole 
  } = useAuth();
  
  // Define all navigation items with permission requirements
  const allNavItems = [
    { path: '/admin', label: 'Dashboard', icon: FiHome, show: true },
    { path: '/admin/properties', label: 'Properties', icon: FiGrid, show: canManageProperties() },
    { path: '/admin/pending-properties', label: 'Pending Properties', icon: FiClock, show: canApproveProperties() },
    { path: '/admin/launches', label: 'Launches', icon: FiZap, show: true }, // All can view
    { path: '/admin/blogs', label: 'Blog Posts', icon: FiFileText, show: true }, // All can view
    { path: '/admin/developers', label: 'Developers', icon: FiBuilding, show: true }, // All can view
    { path: '/admin/compounds', label: 'Compounds', icon: FiLayers, show: true }, // All can view
    { path: '/admin/governorates', label: 'Governorates', icon: FiMapPin, show: canManageDevelopers() }, // Managers+ can manage
    { path: '/admin/cities', label: 'Cities', icon: FiMapPin, show: canManageDevelopers() }, // Managers+ can manage
    { path: '/admin/areas', label: 'Areas', icon: FiMapPin, show: canManageDevelopers() }, // Managers+ can manage
    { path: '/admin/inquiries', label: 'Inquiries', icon: FiMessageSquare, show: canManageInquiries() },
    { path: '/admin/leads', label: 'Leads', icon: FiTarget, show: canManageLeads() },
    { path: '/admin/newsletter-subscriptions', label: 'Newsletter Subscriptions', icon: FiMail, show: true }, // All admin users can view
    { path: '/admin/videos', label: 'Videos', icon: FiVideo, show: true }, // All admin users can view
    { path: '/admin/jobs', label: 'Jobs', icon: FiBriefcase, show: true }, // All can view
    { path: '/admin/job-applications', label: 'Job Applications', icon: FiFileText, show: true }, // All can view
    { path: '/admin/users', label: 'Users', icon: FiUsers, show: canManageUsers() },
    { path: '/admin/settings', label: 'Settings', icon: FiSettings, show: canManageDevelopers() } // Managers+ can configure
    // Note: Bulk Upload is integrated into each page as a modal button, not a separate page
  ];
  
  // Filter navigation items based on permissions
  const navItems = allNavItems.filter(item => item.show);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#131c2b] to-gray-900">
      {/* Top navigation */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <Link to="/" className="flex items-center flex-shrink-0">
              <div className="w-16 h-8 sm:w-20 sm:h-10 flex items-center justify-center">
                <img 
                  src="/logos/basiralogo.png" 
                  alt="Basera Real Estate"
                  className="w-full h-full object-contain"
                />
              </div>
            </Link>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white truncate">{title}</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <Link
              to="/admin/settings"
              aria-label="Open settings"
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
            >
              <FiSettings className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white truncate max-w-[120px] md:max-w-none">{user?.name}</p>
                <p className="text-xs text-slate-400">
                  {userRole === 'admin' ? 'Admin' : 
                   userRole === 'sales_manager' ? 'Sales Manager' :
                   userRole === 'sales_team_leader' ? 'Team Leader' :
                   userRole === 'sales_agent' ? 'Sales Agent' : 'User'}
                </p>
              </div>
              <button
                onClick={onLogout}
                type="button"
                title="Logout"
                className="flex items-center justify-center gap-1 sm:gap-2 p-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200 sm:border sm:border-slate-700/50"
              >
                <FiLogOut className="w-4 h-4 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Navigation Bar */}
      <nav className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 px-2 sm:px-4 md:px-6 py-2 sm:py-3 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.path !== '/admin' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline text-xs sm:text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Page content */}
      <main className="p-3 sm:p-4 md:p-6">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
