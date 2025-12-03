import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import DeveloperForm from '../../components/admin/DeveloperForm';

const AddDeveloper = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSave = () => {
    navigate('/admin/developers');
  };

  const handleCancel = () => {
    navigate('/admin/developers');
  };

  return (
    <>
      <Helmet>
        <title>Add Developer - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Add Developer" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <DeveloperForm
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={false}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default AddDeveloper;

