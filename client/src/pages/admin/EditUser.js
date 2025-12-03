import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';
import UserForm from '../../components/admin/UserForm';

const EditUser = () => {
  const { id } = useParams();
  const { user, logout, isAuthenticated, isAdminRole } = useAuth();
  const navigate = useNavigate();

  const { data: userData, isLoading, error } = useQuery(
    ['user', id],
    async () => {
      const response = await usersAPI.getUser(id);
      return response.data;
    },
    {
      enabled: !!id,
      retry: 1
    }
  );

  const handleSave = () => {
    navigate('/admin/users');
  };

  const handleCancel = () => {
    navigate('/admin/users');
  };

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
      <AdminLayout title="Edit User" user={user} onLogout={logout}>
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Edit User" user={user} onLogout={logout}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-semibold mb-2">Error Loading User</div>
            <p className="text-gray-600 mb-4">
              {error.message || 'Failed to load user details'}
            </p>
            <button
              onClick={() => navigate('/admin/users')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Users
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!userData) {
    return (
      <AdminLayout title="Edit User" user={user} onLogout={logout}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-600 text-lg font-semibold mb-2">User Not Found</div>
            <p className="text-gray-500 mb-4">
              The user you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/admin/users')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Users
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit User - Admin Panel</title>
        <meta name="description" content="Edit user details and permissions." />
      </Helmet>

      <AdminLayout title="Edit User" user={user} onLogout={logout}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit User</h1>
            <p className="text-gray-600 mt-1">Update the user details below.</p>
          </div>

          <UserForm
            user={userData}
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={true}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default EditUser;


