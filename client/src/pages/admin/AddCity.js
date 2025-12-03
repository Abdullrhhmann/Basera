import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import CityForm from '../../components/admin/CityForm';

const AddCity = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSave = () => {
    navigate('/admin/cities');
  };

  const handleCancel = () => {
    navigate('/admin/cities');
  };

  return (
    <>
      <Helmet>
        <title>Add City - Admin Panel</title>
      </Helmet>

      <AdminLayout title="Add City" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <CityForm
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={false}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default AddCity;

