import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { propertiesAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';
import PropertyForm from '../../components/admin/PropertyForm';

const EditProperty = () => {
  const { id } = useParams();
  const { user, logout, isAuthenticated, isAdminRole, userHierarchy } = useAuth();
  const navigate = useNavigate();

  const { data: property, isLoading, error } = useQuery(
    ['property', id],
    async () => {
      const response = await propertiesAPI.getProperty(id);
      return response.data.property;
    },
    {
      enabled: !!id,
      retry: 1
    }
  );

  const handleSave = () => {
    navigate('/admin/properties');
  };

  const handleCancel = () => {
    navigate('/admin/properties');
  };

  if (!isAuthenticated || !isAdminRole()) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-slate-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout title="Edit Property" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-600 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-slate-600 rounded w-1/2 mb-8"></div>
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-slate-600 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Edit Property" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="text-center py-12">
            <div className="text-red-400 text-lg font-semibold mb-2">Error Loading Property</div>
            <p className="text-slate-300 mb-4">
              {error.message || 'Failed to load property details'}
            </p>
            <button
              onClick={() => navigate('/admin/properties')}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              Back to Properties
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!property) {
    return (
      <AdminLayout title="Edit Property" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="text-center py-12">
            <div className="text-slate-300 text-lg font-semibold mb-2">Property Not Found</div>
            <p className="text-slate-400 mb-4">
              The property you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/admin/properties')}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              Back to Properties
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Property - Admin Panel</title>
        <meta name="description" content="Edit property details and information." />
      </Helmet>

      <AdminLayout title="Edit Property" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Edit Property</h1>
            <p className="text-slate-300 mt-1">Update the property details below.</p>
          </div>

          {/* Show current approval status if rejected */}
          {property.approvalStatus === 'rejected' && property.rejectionReason && (
            <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-400">Property Was Rejected</h3>
                  <p className="mt-1 text-sm text-red-300">
                    <strong>Reason:</strong> {property.rejectionReason}
                  </p>
                  <p className="mt-2 text-xs text-red-200">
                    Please address the issues mentioned above and save your changes to resubmit for approval.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Re-approval Notice for Sales Agents */}
          {userHierarchy >= 4 && (
            <div className="mb-6 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-400">
                    Edits Require Re-Approval
                  </h3>
                  <p className="mt-1 text-sm text-yellow-300">
                    Any changes you make will set this property back to <strong>pending status</strong> and it will require approval from a team leader or manager before being visible again.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pending Status Notice */}
          {property.approvalStatus === 'pending' && (
            <div className="mb-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-400">Pending Approval</h3>
                  <p className="mt-1 text-sm text-blue-300">
                    This property is currently awaiting approval from a team leader or manager.
                  </p>
                </div>
              </div>
            </div>
          )}

          <PropertyForm
            property={property}
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={true}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default EditProperty;


