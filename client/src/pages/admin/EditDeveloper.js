import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { developersAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';
import DeveloperForm from '../../components/admin/DeveloperForm';

const EditDeveloper = () => {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery(
    ['developer', id],
    async () => {
      // Since the API uses slug, we need to fetch all developers and find by ID
      // Or we can make a direct call if the developer has a slug
      const response = await developersAPI.getDevelopers({ limit: 1000 });
      const developer = response.data.developers.find(dev => dev._id === id);
      return developer;
    },
    {
      enabled: !!id,
      retry: 1
    }
  );

  const handleSave = () => {
    navigate('/admin/developers');
  };

  const handleCancel = () => {
    navigate('/admin/developers');
  };

  if (isLoading) {
    return (
      <AdminLayout title="Edit Developer" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-600 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-slate-600 rounded w-1/2 mb-8"></div>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-600 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="Edit Developer" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
            <p className="text-red-400">Developer not found</p>
            <button
              onClick={() => navigate('/admin/developers')}
              className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
            >
              Back to Developers
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Developer - {data.name} - Admin Panel</title>
      </Helmet>

      <AdminLayout title={`Edit Developer - ${data.name}`} user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <DeveloperForm
            developer={data}
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={true}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default EditDeveloper;

