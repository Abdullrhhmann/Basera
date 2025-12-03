import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { showSuccess, showError } from '../../utils/sonner';
import { launchesAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import LaunchForm from '../../components/admin/LaunchForm';

const EditLaunch = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch launch data
  const { data: launchData, isLoading, error } = useQuery(
    ['launch', id],
    () => launchesAPI.get(`/launches/${id}`),
    {
      enabled: !!id,
    }
  );

  const updateLaunchMutation = useMutation(
    (launchData) => launchesAPI.put(`/launches/${id}`, launchData),
    {
      onSuccess: () => {
        showSuccess('Launch updated successfully');
        navigate('/admin/launches');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to update launch');
        setIsSubmitting(false);
      }
    }
  );

  const handleSubmit = async (launchData) => {
    setIsSubmitting(true);
    try {
      await updateLaunchMutation.mutateAsync(launchData);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Edit Launch" user={user}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-basira-gold"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Edit Launch" user={user}>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading launch: {error.message}</p>
        </div>
      </AdminLayout>
    );
  }

  if (!launchData?.data) {
    return (
      <AdminLayout title="Edit Launch" user={user}>
        <div className="text-center py-12">
          <p className="text-gray-600">Launch not found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Launch | Basira Real Estate Admin</title>
        <meta name="description" content="Edit property launch details" />
      </Helmet>

      <AdminLayout title="Edit Launch" user={user}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Launch Information</h3>
              <p className="mt-1 text-sm text-gray-500">
                Update the details for this property launch
              </p>
            </div>
            <div className="p-6">
              <LaunchForm
                initialData={launchData.data}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                submitButtonText="Update Launch"
              />
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default EditLaunch;
