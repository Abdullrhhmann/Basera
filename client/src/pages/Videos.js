import React, { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { videosAPI, videoPlaylistsAPI } from '../utils/api';
import PageLayout from '../components/layout/PageLayout';
import VideoCard from '../components/video/VideoCard';
import { FiSearch, FiVideo, FiLoader, FiFilter, FiX } from '../icons/feather';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/shadcn';

const Videos = () => {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [associatedTypeFilter, setAssociatedTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 12;

  // Fetch videos
  const { data: videosData, isLoading, error, refetch } = useQuery(
    ['videos', searchTerm, statusFilter, associatedTypeFilter, currentPage],
    async () => {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        associatedType: associatedTypeFilter || undefined,
        isActive: statusFilter === 'draft' ? false : true,
      };

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await videosAPI.getVideos(params);
      return response.data;
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );

  // Fetch featured videos/playlists
  const { data: featuredData } = useQuery(
    ['featured-videos'],
    async () => {
      // Get recent playlists and videos
      const [playlistsResponse, videosResponse] = await Promise.all([
        videoPlaylistsAPI.getPlaylists({ limit: 3, isActive: true }).catch(() => ({ data: { playlists: [] } })),
        videosAPI.getVideos({ limit: 6, isActive: true, sortBy: 'views', sortOrder: 'desc' }).catch(() => ({ data: { videos: [] } }))
      ]);
      
      return {
        playlists: playlistsResponse.data?.playlists || [],
        featuredVideos: videosResponse.data?.videos || []
      };
    },
    {
      staleTime: 10 * 60 * 1000,
    }
  );

  const videos = videosData?.videos || [];
  const pagination = videosData?.pagination || {};
  const featuredVideos = featuredData?.featuredVideos || [];

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setCurrentPage(1);
    refetch();
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('');
    setAssociatedTypeFilter('');
    setCurrentPage(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter) count++;
    if (associatedTypeFilter) count++;
    return count;
  }, [searchTerm, statusFilter, associatedTypeFilter]);

  const totalPages = Math.ceil((pagination.totalItems || 0) / itemsPerPage);

  return (
    <>
      <Helmet>
        <title>{t('video.metaTitle')}</title>
        <meta name="description" content={t('video.subtitle')} />
      </Helmet>

      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b]" dir={i18n.dir()}>
          {/* Hero Section */}
          <section className="relative pt-20 pb-10 sm:pt-24 sm:pb-12 md:pt-28 md:pb-16 overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-[#A88B32]/10 via-transparent to-transparent"></div>
              <div className="absolute top-20 right-20 w-64 h-64 bg-[#A88B32]/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 left-20 w-64 h-64 bg-[#A88B32]/10 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
              <div className="text-center w-full max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                  <p className="text-xs sm:text-sm uppercase tracking-widest text-[#A88B32] font-bold">
                    {t('video.hero.badge', { defaultValue: 'Video Orientations' })}
                  </p>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
                  {t('video.title')}
                </h1>
                <p className="text-gray-300 text-lg sm:text-xl mb-8 max-w-2xl mx-auto">
                  {t('video.subtitle')}
                </p>
              </div>
            </div>
          </section>

          {/* Search and Filters Section */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-4 md:p-6">
              <form onSubmit={handleSearch} className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('video.searchPlaceholder', { defaultValue: 'Search videos...' })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-[#A88B32] focus:border-transparent text-white placeholder-slate-400"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 text-white transition-colors"
                  >
                    <FiFilter className="w-4 h-4" />
                    {t('video.filters', { defaultValue: 'Filters' })}
                    {activeFilterCount > 0 && (
                      <span className="px-2 py-0.5 bg-[#A88B32] text-white text-xs rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 text-white transition-colors"
                    >
                      <FiX className="w-4 h-4" />
                      {t('video.clearFilters', { defaultValue: 'Clear Filters' })}
                    </button>
                  )}

                  <button
                    type="submit"
                    className="ml-auto px-6 py-2 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#A88B32]/30 transition-all"
                  >
                    {t('video.search', { defaultValue: 'Search' })}
                  </button>
                </div>

                {/* Filter Options */}
                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {t('video.filterStatus', { defaultValue: 'Status' })}
                      </label>
                      <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                        <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('video.allStatuses', { defaultValue: 'All Statuses' })}</SelectItem>
                          <SelectItem value="published">{t('video.statusPublished', { defaultValue: 'Published' })}</SelectItem>
                          <SelectItem value="draft">{t('video.statusDraft', { defaultValue: 'Draft' })}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {t('video.filterType', { defaultValue: 'Type' })}
                      </label>
                      <Select value={associatedTypeFilter || 'all'} onValueChange={(v) => setAssociatedTypeFilter(v === 'all' ? '' : v)}>
                        <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('video.allTypes', { defaultValue: 'All Types' })}</SelectItem>
                          <SelectItem value="property">{t('video.typeProperty', { defaultValue: 'Property' })}</SelectItem>
                          <SelectItem value="compound">{t('video.typeCompound', { defaultValue: 'Compound' })}</SelectItem>
                          <SelectItem value="launch">{t('video.typeLaunch', { defaultValue: 'Launch' })}</SelectItem>
                          <SelectItem value="general">{t('video.typeGeneral', { defaultValue: 'General' })}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </section>

          {/* Featured Section */}
          {featuredVideos.length > 0 && currentPage === 1 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                {t('video.featured', { defaultValue: 'Featured Videos' })}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredVideos.slice(0, 6).map((video) => (
                  <VideoCard key={video._id || video.id} video={video} />
                ))}
              </div>
            </section>
          )}

          {/* Videos Grid Section */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {t('video.allVideos', { defaultValue: 'All Videos' })}
              </h2>
              {pagination.totalItems > 0 && (
                <p className="text-slate-400 text-sm">
                  {t('video.totalVideos', { count: pagination.totalItems, defaultValue: '{{count}} videos' })}
                </p>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <FiLoader className="animate-spin h-12 w-12 text-[#A88B32]" />
                <p className="ml-4 text-slate-300">{t('video.loading')}</p>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400 mb-4">{t('video.error')}</p>
                <button
                  onClick={() => refetch()}
                  className="px-6 py-2 bg-[#A88B32] hover:bg-[#C09C3D] text-white rounded-lg transition-colors"
                >
                  {t('video.retry', { defaultValue: 'Retry' })}
                </button>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-20">
                <FiVideo className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">{t('video.empty')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {videos.map((video) => (
                    <VideoCard key={video._id || video.id} video={video} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700/50 transition-colors"
                    >
                      {t('video.previous', { defaultValue: 'Previous' })}
                    </button>
                    <span className="text-slate-300 px-4">
                      {t('video.pageInfo', { 
                        current: currentPage, 
                        total: totalPages,
                        defaultValue: 'Page {{current}} of {{total}}' 
                      })}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700/50 transition-colors"
                    >
                      {t('video.next', { defaultValue: 'Next' })}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </PageLayout>
    </>
  );
};

export default Videos;

