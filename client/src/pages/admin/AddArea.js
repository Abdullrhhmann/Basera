import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import AreaForm from '../../components/admin/AreaForm';

const AddArea = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSave = () => {
    navigate('/admin/areas');
  };

  const handleCancel = () => {
    navigate('/admin/areas');
  };

  return (
    <>
      <Helmet>
        <title>Add Area - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Add Area" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <AreaForm
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={false}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default AddArea;

