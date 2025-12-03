import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import GovernorateForm from '../../components/admin/GovernorateForm';

const AddGovernorate = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSave = () => {
    navigate('/admin/governorates');
  };

  const handleCancel = () => {
    navigate('/admin/governorates');
  };

  return (
    <>
      <Helmet>
        <title>Add Governorate - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Add Governorate" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <GovernorateForm
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={false}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default AddGovernorate;

