import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import JobForm from '../../components/admin/JobForm';
import { jobsAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';

const AddJob = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const createMutation = useMutation(
    (data) => jobsAPI.createJob(data),
    {
      onSuccess: async () => {
        showSuccess('Job created successfully');
        // Invalidate and refetch all job-related queries
        await queryClient.invalidateQueries('admin-jobs');
        await queryClient.invalidateQueries('jobs'); // Also invalidate public jobs
        // Refetch immediately before navigating
        await queryClient.refetchQueries('admin-jobs');
        navigate('/admin/jobs');
      },
      onError: (err) => {
        showError(err.response?.data?.message || 'Failed to create job');
        setLoading(false);
      }
    }
  );

  const handleSubmit = (formData) => {
    setLoading(true);
    createMutation.mutate(formData);
  };

  const handleCancel = () => {
    navigate('/admin/jobs');
  };

  return (
    <>
      <Helmet>
        <title>Add New Job | Admin Dashboard</title>
      </Helmet>

      <AdminLayout title="Add New Job" user={user}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 rounded-xl p-6">
            <JobForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              loading={loading || createMutation.isLoading}
            />
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default AddJob;

