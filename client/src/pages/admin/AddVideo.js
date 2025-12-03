import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import VideoForm from '../../components/admin/VideoForm';
import { useTranslation } from 'react-i18next';

const AddVideo = () => {
  const { t } = useTranslation();
  const { user, logout, isAuthenticated, isAdminRole } = useAuth();
  const navigate = useNavigate();

  const handleSave = () => {
    navigate('/admin/videos');
  };

  const handleCancel = () => {
    navigate('/admin/videos');
  };

  if (!isAuthenticated || !isAdminRole()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('video.admin.videos.create', { defaultValue: 'Create Video' })} - Admin Panel</title>
      </Helmet>

      <AdminLayout title={t('video.admin.videos.create', { defaultValue: 'Create Video' })} user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {t('video.admin.videos.create', { defaultValue: 'Create Video' })}
            </h1>
            <p className="text-slate-300 mt-1">
              {t('video.admin.videos.createDescription', { defaultValue: 'Upload and configure a new video orientation.' })}
            </p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-4 sm:p-6">
            <VideoForm
              onSave={handleSave}
              onCancel={handleCancel}
              isEditing={false}
            />
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default AddVideo;

