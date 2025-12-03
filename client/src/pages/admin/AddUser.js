import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import UserForm from '../../components/admin/UserForm';

const AddUser = () => {
  const { user, logout, isAuthenticated, isAdminRole } = useAuth();
  const navigate = useNavigate();

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

  return (
    <>
      <Helmet>
        <title>Add User - Admin Panel</title>
        <meta name="description" content="Add a new user to the system." />
      </Helmet>

      <AdminLayout title="Add User" user={user} onLogout={logout}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Add New User</h1>
            <p className="text-gray-600 mt-1">Fill in the details below to create a new user account.</p>
          </div>

          <UserForm
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={false}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default AddUser;


