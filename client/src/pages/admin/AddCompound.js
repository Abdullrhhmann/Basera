import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import CompoundForm from '../../components/admin/CompoundForm';

const AddCompound = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSave = () => {
    navigate('/admin/compounds');
  };

  const handleCancel = () => {
    navigate('/admin/compounds');
  };

  return (
    <>
      <Helmet>
        <title>Add Compound - Admin Panel</title>
        <meta
          name="description"
          content="Create a new compound and link it with developers and locations."
        />
      </Helmet>

      <AdminLayout title="Add Compound" user={user} onLogout={logout}>
        <div className="max-w-5xl mx-auto px-2 sm:px-4">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Add New Compound</h1>
            <p className="text-slate-300 mt-1">
              Define the compound details to make it available for property linking.
            </p>
          </div>

          <CompoundForm onSave={handleSave} onCancel={handleCancel} />
        </div>
      </AdminLayout>
    </>
  );
};

export default AddCompound;


