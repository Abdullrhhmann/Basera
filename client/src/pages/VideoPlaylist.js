import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from 'react-query';
import { videoPlaylistsAPI } from '../utils/api';
import VideoPlaylist from '../components/video/VideoPlaylist';
import PageLayout from '../components/layout/PageLayout';
import { FiArrowLeft } from '../icons/feather';
import { useTranslation } from 'react-i18next';

const VideoPlaylistPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  // Fetch playlist details
  const { data: playlistData, isLoading, error } = useQuery(
    ['playlist', id],
    async () => {
      const response = await videoPlaylistsAPI.getPlaylist(id);
      return response.data;
    },
    {
      enabled: !!id
    }
  );

  const playlist = playlistData?.playlist;
  const videos = playlist?.videos || [];
  const currentVideo = videos[currentVideoIndex] || videos[0];

  const handleVideoChange = (video, index) => {
    setCurrentVideoIndex(index);
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A88B32]"></div>
        </div>
      </PageLayout>
    );
  }

  if (error || !playlist) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              {t('video.playlist.notFound', { defaultValue: 'Playlist not found' })}
            </h2>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-[#A88B32] hover:bg-[#C09C3D] text-white rounded-lg transition-colors"
            >
              {t('video.playlist.goBack', { defaultValue: 'Go Back' })}
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Helmet>
        <title>{playlist.title} - {t('video.playlist.metaTitle', { defaultValue: 'Video Playlist' })}</title>
        <meta name="description" content={playlist.description || playlist.title} />
        <meta property="og:title" content={playlist.title} />
        <meta property="og:description" content={playlist.description || playlist.title} />
        {playlist.thumbnailUrl && <meta property="og:image" content={playlist.thumbnailUrl} />}
      </Helmet>

      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white hover:text-[#A88B32] transition-colors mb-6"
          >
            <FiArrowLeft className="h-5 w-5" />
            <span>{t('video.playlist.back', { defaultValue: 'Back' })}</span>
          </button>

          {/* Playlist Player */}
          <VideoPlaylist
            playlist={playlist}
            videos={videos}
            currentVideoId={currentVideo?._id || currentVideo?.id}
            onVideoChange={handleVideoChange}
            showSidebar={true}
            className="w-full"
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default VideoPlaylistPage;

