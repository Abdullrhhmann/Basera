import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import GovernorateForm from '../../components/admin/GovernorateForm';
import { governoratesAPI } from '../../utils/api';

const EditGovernorate = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const { data, isLoading, error } = useQuery(
    ['governorate', id],
    () => governoratesAPI.getGovernorate(id).then(res => res.data.governorate),
    {
      enabled: !!id
    }
  );

  const handleSave = () => {
    navigate('/admin/governorates');
  };

  const handleCancel = () => {
    navigate('/admin/governorates');
  };

  return (
    <>
      <Helmet>
        <title>Edit Governorate - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Edit Governorate" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-300 mt-4">Loading governorate...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">Failed to load governorate</p>
            </div>
          ) : data ? (
            <GovernorateForm
              governorate={data}
              onSave={handleSave}
              onCancel={handleCancel}
              isEditing={true}
            />
          ) : null}
        </div>
      </AdminLayout>
    </>
  );
};

export default EditGovernorate;

