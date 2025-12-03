import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiSearch, FiVideo, FiRefreshCw, FiPlus, FiEdit, FiTrash2, FiEye } from '../../icons/feather';
import { videosAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { showSuccess, showError } from '../../utils/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../components/ui/shadcn/select';
import { formatDuration } from '../../utils/videoUtils';
import { useTranslation } from 'react-i18next';

const AdminVideos = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const queryClient = useQueryClient();
  const { isAuthenticated, isAdminRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    } else if (isAuthenticated && !isAdminRole()) {
      navigate('/');
    }
  }, [isAuthenticated, isAdminRole, navigate]);

  const { data: videosData, isLoading, error, refetch, isFetching } = useQuery(
    ['admin-videos', searchTerm, filterType, filterStatus],
    async () => {
      const params = { limit: 50, page: 1 };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterType) params.associatedType = filterType;
      // For admin: show all videos by default, only filter if explicitly set
      if (filterStatus === 'active') {
        params.isActive = 'true';
      } else if (filterStatus === 'inactive') {
        params.isActive = 'false';
      }
      // If filterStatus is undefined or 'all', don't send isActive param to show all videos
      params._t = Date.now();
      
      const response = await videosAPI.getVideos(params);
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      onError: (err) => {
        showError('Failed to load videos');
      }
    }
  );

  const deleteVideoMutation = useMutation(
    (id) => videosAPI.deleteVideo(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-videos']);
        showSuccess('Video deleted successfully');
        setShowDeleteModal(false);
        setVideoToDelete(null);
      },
      onError: (err) => {
        showError(err.response?.data?.message || 'Failed to delete video');
      }
    }
  );

  const handleDelete = (video) => {
    setVideoToDelete(video);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (videoToDelete) {
      deleteVideoMutation.mutate(videoToDelete._id || videoToDelete.id);
    }
  };

  const videos = videosData?.videos || [];
  const pagination = videosData?.pagination || {};

  return (
    <>
      <Helmet>
        <title>{t('video.admin.videos.title', { defaultValue: 'Videos' })} - Admin Panel</title>
      </Helmet>

      <AdminLayout title={t('video.admin.videos.title', { defaultValue: 'Videos' })}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              {t('video.admin.videos.subtitle', { defaultValue: 'Manage video orientations' })}
            </h2>
            <span className="px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-slate-800/50 text-slate-300 rounded-full border border-slate-700/50 whitespace-nowrap">
              {pagination.totalVideos || videos.length} {t('video.admin.videos.title', { defaultValue: 'videos' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/videos/new"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-[#A88B32] hover:bg-[#C09C3D] text-white rounded-lg transition-all duration-200 shadow-lg"
            >
              <FiPlus className="w-4 h-4" />
              {t('video.admin.videos.create', { defaultValue: 'Create Video' })}
            </Link>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              {t('video.admin.videos.refresh', { defaultValue: 'Refresh' })}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 mx-1 sm:mx-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <input
                type="text"
                placeholder={t('video.admin.videos.searchPlaceholder', { defaultValue: 'Search videos...' })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              />
            </div>

            <Select value={filterType || 'all'} onValueChange={(v) => setFilterType(v === 'all' ? '' : v)}>
              <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[150px]">
                <span>
                  {filterType || t('video.admin.videos.filterType', { defaultValue: 'All Types' })}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('video.admin.videos.filterType', { defaultValue: 'All Types' })}</SelectItem>
                <SelectItem value="compound">{t('video.admin.videos.filterCompound', { defaultValue: 'Compound' })}</SelectItem>
                <SelectItem value="launch">{t('video.admin.videos.filterLaunch', { defaultValue: 'Launch' })}</SelectItem>
                <SelectItem value="property">{t('video.admin.videos.filterProperty', { defaultValue: 'Property' })}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto min-w-[150px]">
                <span>
                  {filterStatus === 'active' ? t('video.admin.status.active', { defaultValue: 'Active' }) :
                   filterStatus === 'inactive' ? t('video.admin.status.inactive', { defaultValue: 'Inactive' }) :
                   t('video.admin.videos.filterStatus', { defaultValue: 'All Status' })}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('video.admin.videos.filterStatus', { defaultValue: 'All Status' })}</SelectItem>
                <SelectItem value="active">{t('video.admin.status.active', { defaultValue: 'Active' })}</SelectItem>
                <SelectItem value="inactive">{t('video.admin.status.inactive', { defaultValue: 'Inactive' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Videos Table */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden mx-1 sm:mx-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-slate-300">Loading videos...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400">Error loading videos</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="p-8 text-center">
              <FiVideo className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-300 mb-2">{t('video.admin.videos.empty.title', { defaultValue: 'No videos found' })}</p>
              <p className="text-slate-500 text-sm">{t('video.admin.videos.empty.subtitle', { defaultValue: 'Create your first video orientation' })}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      {t('video.admin.videos.columns.title', { defaultValue: 'Title' })}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      {t('video.admin.videos.columns.type', { defaultValue: 'Type' })}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      {t('video.admin.videos.columns.duration', { defaultValue: 'Duration' })}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      {t('video.admin.videos.columns.views', { defaultValue: 'Views' })}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      {t('video.admin.videos.columns.status', { defaultValue: 'Status' })}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      {t('video.admin.videos.columns.actions', { defaultValue: 'Actions' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {videos.map((video) => (
                    <tr key={video._id || video.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {video.thumbnailUrl && (
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-16 h-10 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="text-white font-medium">{video.title}</p>
                            {video.description && (
                              <p className="text-slate-400 text-xs line-clamp-1">{video.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">
                        {video.associatedType || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">
                        {video.duration > 0 ? formatDuration(video.duration) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">
                        {video.views || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          video.isActive !== false
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {video.isActive !== false ? t('video.admin.status.active', { defaultValue: 'Active' }) : t('video.admin.status.inactive', { defaultValue: 'Inactive' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/videos/${video._id || video.id}`}
                            className="p-2 hover:bg-slate-700/50 rounded transition-colors"
                            title={t('video.admin.videos.view', { defaultValue: 'View' })}
                          >
                            <FiEye className="w-4 h-4 text-blue-400" />
                          </Link>
                          <Link
                            to={`/admin/videos/${video._id || video.id}/edit`}
                            className="p-2 hover:bg-slate-700/50 rounded transition-colors"
                            title={t('video.admin.videos.edit', { defaultValue: 'Edit' })}
                          >
                            <FiEdit className="w-4 h-4 text-yellow-400" />
                          </Link>
                          <button
                            onClick={() => handleDelete(video)}
                            className="p-2 hover:bg-slate-700/50 rounded transition-colors"
                            title={t('video.admin.videos.delete', { defaultValue: 'Delete' })}
                          >
                            <FiTrash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setVideoToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t('video.admin.videos.deleteConfirm', { defaultValue: 'Delete Video' })}
          message={t('video.admin.videos.deleteMessage', { 
            defaultValue: 'Are you sure you want to delete this video? This action cannot be undone.',
            title: videoToDelete?.title || ''
          })}
          confirmText={t('video.admin.videos.delete', { defaultValue: 'Delete' })}
          cancelText={t('video.admin.videos.cancel', { defaultValue: 'Cancel' })}
          isDestructive={true}
          isLoading={deleteVideoMutation.isLoading}
        />
      </AdminLayout>
    </>
  );
};

export default AdminVideos;

