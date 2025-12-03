import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isLoading, isAuthenticated: _isAuthenticated } = useAuth();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir={i18n.dir()}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600" aria-label={t('protected.loading')}></div>
      </div>
    );
  }

  // If user is not logged in, redirect to appropriate login page
  if (!isLoading && !user && !_isAuthenticated) {
    const loginPath = location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // If a specific role is required, check if user has permission
  if (requiredRole) {
    // Define admin-type roles
    const adminRoles = ['admin', 'sales_manager', 'sales_team_leader', 'sales_agent'];
    
    let hasAccess = false;
    
    if (requiredRole === 'admin') {
      // For 'admin' requirement, allow any admin-type role
      hasAccess = adminRoles.includes(user.role);
    } else {
      // For specific role requirements, do exact match
      hasAccess = user.role === requiredRole;
    }
    
    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50" dir={i18n.dir()}>
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('protected.accessDenied.title')}</h1>
            <p className="text-gray-600 mb-4">{t('protected.accessDenied.message')}</p>
            <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
              <button
                onClick={() => window.history.back()}
                className={`w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex justify-center ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {t('common.actions.goBack')}
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className={`w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex justify-center ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {t('common.actions.goHome')}
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and has the required role (if any)
  return children;
};

export default ProtectedRoute;

