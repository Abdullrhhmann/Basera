import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../utils/api';
import { showSuccess, showError } from '../utils/sonner';

const AuthContext = createContext();

// Get token and user from localStorage only once during initialization
const getInitialToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    return null;
  }
};

const getInitialUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    return null;
  }
};

const initialToken = getInitialToken();
const initialUser = getInitialUser();

const initialState = {
  user: initialUser,
  token: initialToken,
  isAuthenticated: !!(initialToken && initialUser),
  isLoading: true,
  isAdmin: initialUser?.role === 'admin',
  userRole: initialUser?.role || null,
  userHierarchy: initialUser?.hierarchy || 5,
  permissions: initialUser?.permissions || {}
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isAdmin: action.payload.user.role === 'admin',
        userRole: action.payload.user.role,
        userHierarchy: action.payload.user.hierarchy || 5,
        permissions: action.payload.user.permissions || {},
        isLoading: false
      };
    
    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isAdmin: false,
        userRole: null,
        userHierarchy: 5,
        permissions: {},
        isLoading: false
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Note: API instance handles token configuration automatically

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      
      if (token && storedUser) {
        try {
          // Parse stored user data
          const _user = JSON.parse(storedUser);
          
          // IMPORTANT: Check if user data has required fields (hierarchy, permissions)
          // If missing, force logout to get fresh data
          if (!_user.hierarchy || !_user.permissions) {
            console.warn('User data incomplete (missing hierarchy/permissions), forcing logout');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
          
          // Check if token is expired locally first
          try {
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (tokenPayload.exp && tokenPayload.exp > currentTime) {
              // Token is not expired locally, verify with server
              try {
                const response = await api.get('/auth/me');
                dispatch({
                  type: 'LOGIN_SUCCESS',
                  payload: {
                    user: response.data.user,
                    token: token
                  }
                });
                return;
              } catch (serverError) {
                // Server verification failed, clean up
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                dispatch({ type: 'SET_LOADING', payload: false });
                return;
              }
            } else {
              // Token expired locally, clean up
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              dispatch({ type: 'SET_LOADING', payload: false });
              return;
            }
          } catch (parseError) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
        } catch (parseError) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await api.post('/auth/login', {
        email,
        password
      });

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response.data
      });

      showSuccess('Login successful!');
      return { success: true, user: response.data.user };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.message || 'Login failed';
      showError(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await api.post('/auth/register', userData);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response.data
      });

      showSuccess('Registration successful!');
      return { success: true };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.message || 'Registration failed';
      showError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
    showSuccess('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      
      dispatch({
        type: 'UPDATE_USER',
        payload: response.data.user
      });

      showSuccess('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      showError(message);
      return { success: false, error: message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });

      showSuccess('Password changed successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      showError(message);
      return { success: false, error: message };
    }
  };

  // Helper functions for role/permission checking
  const isRole = (role) => state.userRole === role;
  
  const isAdminUser = () => state.userRole === 'admin';
  const isSalesManager = () => state.userRole === 'sales_manager';
  const isSalesTeamLeader = () => state.userRole === 'sales_team_leader';
  const isSalesAgent = () => state.userRole === 'sales_agent';
  const isRegularUser = () => state.userRole === 'user';
  
  const isAdminRole = () => ['admin', 'sales_manager', 'sales_team_leader', 'sales_agent'].includes(state.userRole);
  
  const hasHierarchyLevel = (minHierarchy) => state.userHierarchy <= minHierarchy;
  
  const hasPermission = (permission) => {
    if (!state.permissions) return false;
    return state.permissions[permission] === true;
  };
  
  const canManageUsers = () => hasPermission('canManageUsers');
  const canManageProperties = () => hasPermission('canManageProperties');
  const canApproveProperties = () => hasPermission('canApproveProperties');
  const canManageLaunches = () => hasPermission('canManageLaunches');
  const canManageDevelopers = () => hasPermission('canManageDevelopers');
  const canManageInquiries = () => hasPermission('canManageInquiries');
  const canManageLeads = () => hasPermission('canManageLeads');
  const canManageJobs = () => hasPermission('canManageJobs');
  const canAccessDashboard = () => hasPermission('canAccessDashboard');
  const canBulkUpload = () => hasPermission('canBulkUpload');

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    // Role checking helpers
    isRole,
    isAdminUser,
    isSalesManager,
    isSalesTeamLeader,
    isSalesAgent,
    isRegularUser,
    isAdminRole,
    // Hierarchy helpers
    hasHierarchyLevel,
    // Permission helpers
    hasPermission,
    canManageUsers,
    canManageProperties,
    canApproveProperties,
    canManageLaunches,
    canManageDevelopers,
    canManageInquiries,
    canManageLeads,
    canManageJobs,
    canAccessDashboard,
    canBulkUpload
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
