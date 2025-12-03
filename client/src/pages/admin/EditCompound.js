import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import CompoundForm from '../../components/admin/CompoundForm';
import { compoundsAPI } from '../../utils/api';

const EditCompound = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const {
    data: compoundData,
    isLoading,
    error,
  } = useQuery(
    ['compound', id],
    async () => {
      if (!id) return null;
      const response = await compoundsAPI.getCompound(id);
      return response.data?.compound;
    },
    {
      enabled: !!id,
      retry: 1,
      onError: (err) => {
        console.error('EditCompound: fetch error', err);
      },
    }
  );

  const handleSave = () => {
    navigate('/admin/compounds');
  };

  const handleCancel = () => {
    navigate('/admin/compounds');
  };

  if (isLoading) {
    return (
      <AdminLayout title="Edit Compound" user={user} onLogout={logout}>
        <div className="max-w-5xl mx-auto px-2 sm:px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-1/3" />
            <div className="h-4 bg-slate-700 rounded w-1/2" />
            <div className="space-y-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-32 bg-slate-700 rounded" />
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !compoundData) {
    return (
      <AdminLayout title="Edit Compound" user={user} onLogout={logout}>
        <div className="max-w-3xl mx-auto px-2 sm:px-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
            <p className="text-red-400">Compound not found.</p>
            <button
              onClick={() => navigate('/admin/compounds')}
              className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
            >
              Back to Compounds
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Compound - {compoundData.name} - Admin Panel</title>
      </Helmet>

      <AdminLayout title={`Edit Compound - ${compoundData.name}`} user={user} onLogout={logout}>
        <div className="max-w-5xl mx-auto px-2 sm:px-4">
          <CompoundForm
            compound={compoundData}
            isEditing
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default EditCompound;


