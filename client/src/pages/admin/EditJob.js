import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import JobForm from '../../components/admin/JobForm';
import { jobsAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import { FiRefreshCw } from '../../icons/feather';

const EditJob = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: jobData, isLoading } = useQuery(
    ['job', id],
    () => jobsAPI.getJob(id),
    {
      enabled: !!id
    }
  );

  const updateMutation = useMutation(
    (data) => jobsAPI.updateJob(id, data),
    {
      onSuccess: () => {
        showSuccess('Job updated successfully');
        // Invalidate all job-related queries
        queryClient.invalidateQueries('job');
        queryClient.invalidateQueries('admin-jobs');
        queryClient.invalidateQueries('jobs'); // Also invalidate public jobs
        navigate('/admin/jobs');
      },
      onError: (err) => {
        showError(err.response?.data?.message || 'Failed to update job');
        setLoading(false);
      }
    }
  );

  const handleSubmit = (formData) => {
    setLoading(true);
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    navigate('/admin/jobs');
  };

  if (isLoading) {
    return (
      <AdminLayout title="Edit Job" user={user}>
        <div className="flex items-center justify-center py-12">
          <FiRefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </AdminLayout>
    );
  }

  if (!jobData?.job) {
    return (
      <AdminLayout title="Edit Job" user={user}>
        <div className="text-center py-12">
          <p className="text-slate-400">Job not found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Job | Admin Dashboard</title>
      </Helmet>

      <AdminLayout title="Edit Job" user={user}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 rounded-xl p-6">
            <JobForm
              job={jobData.job}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              loading={loading || updateMutation.isLoading}
            />
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default EditJob;

