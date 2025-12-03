import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { FiArrowLeft, FiEdit, FiMail, FiPhone, FiCalendar, FiUser, FiShield, FiEye, FiClock } from '../../icons/feather';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';

const ViewUser = () => {
  const { id } = useParams();
  const { user, logout, isAuthenticated, isAdminRole } = useAuth();
  const navigate = useNavigate();

  const { data: userData, isLoading, error } = useQuery(
    ['user', id],
    async () => {
      const response = await usersAPI.getUser(id);
      return response.data.user;
    },
    {
      enabled: !!id,
      retry: 1
    }
  );

  if (!isAuthenticated || !isAdminRole()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout title="View User" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="View User" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading User</h2>
            <p className="text-gray-600 mb-6">
              {error?.message || 'Failed to load user details'}
            </p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <Link
                to="/admin/users"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Users
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!userData) {
    return (
      <AdminLayout title="View User" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">👤</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h2>
            <p className="text-gray-600 mb-6">The user you're looking for doesn't exist.</p>
            <Link
              to="/admin/users"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Users
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>View User - Admin Panel</title>
      </Helmet>

      <AdminLayout title="View User" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back to Users</span>
              </button>
            </div>
            <Link
              to={`/admin/users/${userData._id}/edit`}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiEdit className="w-4 h-4" />
              <span>Edit User</span>
            </Link>
          </div>

          {/* User Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Role Header */}
            <div className={`px-6 py-4 border-b border-gray-200 ${
              userData.role === 'admin' ? 'bg-purple-50' :
              userData.role === 'user' ? 'bg-blue-50' :
              'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    userData.role === 'admin' ? 'bg-purple-100' :
                    userData.role === 'user' ? 'bg-blue-100' :
                    'bg-gray-100'
                  }`}>
                    <FiShield className={`w-5 h-5 ${
                      userData.role === 'admin' ? 'text-purple-600' :
                      userData.role === 'user' ? 'text-blue-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">{userData.name}</h1>
                    <p className={`text-sm font-medium ${
                      userData.role === 'admin' ? 'text-purple-600' :
                      userData.role === 'user' ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      {userData.role?.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  ID: {userData._id}
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Personal Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FiUser className="w-5 h-5 mr-2" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <p className="text-gray-900">{userData.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <div className="flex items-center space-x-2">
                        <FiMail className="w-4 h-4 text-gray-400" />
                        <a 
                          href={`mailto:${userData.email}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {userData.email}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <div className="flex items-center space-x-2">
                        <FiPhone className="w-4 h-4 text-gray-400" />
                        {userData.phone ? (
                          <a 
                            href={`tel:${userData.phone}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {userData.phone}
                          </a>
                        ) : (
                          <span className="text-gray-500">Not provided</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <div className="flex items-center space-x-2">
                        <FiShield className="w-4 h-4 text-gray-400" />
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          userData.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          userData.role === 'user' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {userData.role?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FiClock className="w-5 h-5 mr-2" />
                  Account Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                      <div className="flex items-center space-x-2">
                        <FiCalendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">
                          {new Date(userData.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                      <div className="flex items-center space-x-2">
                        <FiClock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">
                          {new Date(userData.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          userData.isActive ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          userData.isActive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {userData.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Verified</label>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          userData.isEmailVerified ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          userData.isEmailVerified ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {userData.isEmailVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {(userData.bio || userData.location || userData.preferences) && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                  <div className="space-y-4">
                    {userData.bio && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{userData.bio}</p>
                      </div>
                    )}
                    {userData.location && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <p className="text-gray-700">{userData.location}</p>
                      </div>
                    )}
                    {userData.preferences && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferences</label>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                            {JSON.stringify(userData.preferences, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Activity Summary */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <FiEye className="w-8 h-8 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-600">Properties Viewed</p>
                        <p className="text-2xl font-semibold text-blue-900">
                          {userData.activityStats?.propertiesViewed || 0}
                        </p>
                        {userData.activityStats?.lastPropertyView && (
                          <p className="text-xs text-blue-500 mt-1">
                            Last: {new Date(userData.activityStats.lastPropertyView).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <FiMail className="w-8 h-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-600">Inquiries Sent</p>
                        <p className="text-2xl font-semibold text-green-900">
                          {userData.activityStats?.inquiriesSent || 0}
                        </p>
                        {userData.activityStats?.lastInquirySent && (
                          <p className="text-xs text-green-500 mt-1">
                            Last: {new Date(userData.activityStats.lastInquirySent).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <FiUser className="w-8 h-8 text-purple-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-purple-600">Profile Views</p>
                        <p className="text-2xl font-semibold text-purple-900">
                          {userData.activityStats?.profileViews || 0}
                        </p>
                        <p className="text-xs text-purple-500 mt-1">
                          By other users
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Viewed Properties History */}
              {userData.viewedProperties && userData.viewedProperties.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Viewed Properties</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userData.viewedProperties.slice(0, 6).map((view, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            {view.property?.title || 'Property'}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {view.viewCount} view{view.viewCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {view.property?.type || 'Unknown Type'} • {view.property?.price ? `${view.property.currency || 'EGP'} ${view.property.price.toLocaleString()}` : 'Price N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Last viewed: {new Date(view.viewedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  {userData.viewedProperties.length > 6 && (
                    <p className="text-sm text-gray-500 mt-2">
                      And {userData.viewedProperties.length - 6} more properties...
                    </p>
                  )}
                </div>
              )}

              {/* Favorite Properties */}
              {userData.favoriteProperties && userData.favoriteProperties.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Favorite Properties</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userData.favoriteProperties.slice(0, 6).map((property, index) => (
                      <div key={index} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            {property?.title || 'Property'}
                          </h4>
                          <span className="text-yellow-600">❤️</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {property?.type || 'Unknown Type'} • {property?.price ? `${property.currency || 'EGP'} ${property.price.toLocaleString()}` : 'Price N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {property?.location?.city || 'Location N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                  {userData.favoriteProperties.length > 6 && (
                    <p className="text-sm text-gray-500 mt-2">
                      And {userData.favoriteProperties.length - 6} more favorites...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default ViewUser;
