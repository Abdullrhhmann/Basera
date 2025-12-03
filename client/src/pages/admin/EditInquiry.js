import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { inquiriesAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';
import InquiryForm from '../../components/admin/InquiryForm';

const EditInquiry = () => {
  const { id } = useParams();
  const { user, logout, isAuthenticated, isAdminRole } = useAuth();
  const navigate = useNavigate();

  const { data: inquiry, isLoading, error } = useQuery(
    ['inquiry', id],
    async () => {
      const response = await inquiriesAPI.getInquiry(id);
      return response.data.inquiry;
    },
    {
      enabled: !!id,
      retry: 1
    }
  );

  const handleSave = () => {
    navigate('/admin/inquiries');
  };

  const handleCancel = () => {
    navigate('/admin/inquiries');
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
      <AdminLayout title="Edit Inquiry" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
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
      <AdminLayout title="Edit Inquiry" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Inquiry</div>
            <p className="text-gray-600 mb-4">
              {error.message || 'Failed to load inquiry details'}
            </p>
            <button
              onClick={() => navigate('/admin/inquiries')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Inquiries
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!inquiry) {
    return (
      <AdminLayout title="Edit Inquiry" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="text-center py-12">
            <div className="text-gray-600 text-lg font-semibold mb-2">Inquiry Not Found</div>
            <p className="text-gray-500 mb-4">
              The inquiry you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/admin/inquiries')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Inquiries
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Inquiry - Admin Panel</title>
        <meta name="description" content="Edit inquiry details and status." />
      </Helmet>

      <AdminLayout title="Edit Inquiry" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Inquiry</h1>
            <p className="text-gray-600 mt-1">Update the inquiry details and status below.</p>
          </div>

          <InquiryForm
            inquiry={inquiry}
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={true}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default EditInquiry;


