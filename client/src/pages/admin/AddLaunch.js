import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import { showSuccess, showError } from '../../utils/sonner';
import { launchesAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import LaunchForm from '../../components/admin/LaunchForm';

const AddLaunch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createLaunchMutation = useMutation(
    (launchData) => launchesAPI.createLaunch(launchData),
    {
      onSuccess: () => {
        showSuccess('Launch created successfully');
        navigate('/admin/launches');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to create launch');
        setIsSubmitting(false);
      }
    }
  );

  const handleSubmit = async (launchData) => {
    setIsSubmitting(true);
    try {
      await createLaunchMutation.mutateAsync(launchData);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  return (
    <>
      <Helmet>
        <title>Add New Launch | Basira Real Estate Admin</title>
        <meta name="description" content="Add a new property launch" />
      </Helmet>

      <AdminLayout title="Add New Launch" user={user}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Add New Launch</h1>
            <p className="text-slate-300 mt-1">Fill in the details below to create a new property launch.</p>
          </div>

          <LaunchForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitButtonText="Create Launch"
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default AddLaunch;
