import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { videosAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import VideoForm from '../../components/admin/VideoForm';
import { useTranslation } from 'react-i18next';

const EditVideo = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user, logout, isAuthenticated, isAdminRole } = useAuth();
  const navigate = useNavigate();

  const { data: videoData, isLoading, error } = useQuery(
    ['video', id],
    async () => {
      const response = await videosAPI.getVideo(id);
      return response.data;
    },
    {
      enabled: !!id
    }
  );

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

  if (isLoading) {
    return (
      <AdminLayout title={t('video.admin.videos.edit', { defaultValue: 'Edit Video' })} user={user} onLogout={logout}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !videoData?.video) {
    return (
      <AdminLayout title={t('video.admin.videos.edit', { defaultValue: 'Edit Video' })} user={user} onLogout={logout}>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">{t('video.admin.videos.notFound', { defaultValue: 'Video not found' })}</p>
          <button
            onClick={() => navigate('/admin/videos')}
            className="px-6 py-2 bg-[#A88B32] hover:bg-[#C09C3D] text-white rounded-lg transition-colors"
          >
            {t('video.admin.videos.back', { defaultValue: 'Back to Videos' })}
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('video.admin.videos.edit', { defaultValue: 'Edit Video' })} - Admin Panel</title>
      </Helmet>

      <AdminLayout title={t('video.admin.videos.edit', { defaultValue: 'Edit Video' })} user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {t('video.admin.videos.edit', { defaultValue: 'Edit Video' })}
            </h1>
            <p className="text-slate-300 mt-1">
              {t('video.admin.videos.editDescription', { defaultValue: 'Update video information and settings.' })}
            </p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-4 sm:p-6">
            <VideoForm
              video={videoData.video}
              onSave={handleSave}
              onCancel={handleCancel}
              isEditing={true}
            />
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default EditVideo;

