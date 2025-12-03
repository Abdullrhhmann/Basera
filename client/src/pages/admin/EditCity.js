import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { citiesAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';
import CityForm from '../../components/admin/CityForm';

const EditCity = () => {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery(
    ['city', id],
    async () => {
      // Fetch all cities and find by ID
      const response = await citiesAPI.getCities({ limit: 1000 });
      const city = response.data.cities.find(c => c._id === id);
      return city;
    },
    {
      enabled: !!id,
      retry: 1
    }
  );

  const handleSave = () => {
    navigate('/admin/cities');
  };

  const handleCancel = () => {
    navigate('/admin/cities');
  };

  if (isLoading) {
    return (
      <AdminLayout title="Edit City" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-600 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-slate-600 rounded w-1/2 mb-8"></div>
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
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
      <AdminLayout title="Edit City" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
            <p className="text-red-400">City not found</p>
            <button
              onClick={() => navigate('/admin/cities')}
              className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
            >
              Back to Cities
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit City - {data.name} - Admin Panel</title>
      </Helmet>

      <AdminLayout title={`Edit City - ${data.name}`} user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <CityForm
            city={data}
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={true}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default EditCity;

