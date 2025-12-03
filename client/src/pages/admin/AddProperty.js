import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import PropertyForm from '../../components/admin/PropertyForm';

const AddProperty = () => {
  const { user, logout, isAuthenticated, isAdminRole, userHierarchy } = useAuth();
  const navigate = useNavigate();

  const handleSave = () => {
    navigate('/admin/properties');
  };

  const handleCancel = () => {
    navigate('/admin/properties');
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

  // Check if user is sales agent (hierarchy 4)
  const needsApproval = userHierarchy >= 4;

  return (
    <>
      <Helmet>
        <title>Add Property - Admin Panel</title>
        <meta name="description" content="Add a new property to the real estate platform." />
      </Helmet>

      <AdminLayout title="Add Property" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Add New Property</h1>
            <p className="text-slate-300 mt-1">Fill in the details below to create a new property listing.</p>
          </div>

          {/* Approval Notice for Sales Agents */}
          {needsApproval && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Property Pending Approval
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Your property will be submitted for approval by a team leader or manager before it becomes visible on the platform.
                  </p>
                </div>
              </div>
            </div>
          )}

          <PropertyForm
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={false}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default AddProperty;


