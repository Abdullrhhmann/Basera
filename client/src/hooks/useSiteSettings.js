import { useQuery } from 'react-query';
import { siteSettingsAPI } from '../utils/api';

export const useSiteSettings = () => {
  const { data, isLoading, error } = useQuery(
    'site-settings',
    async () => {
      const response = await siteSettingsAPI.getSettings();
      return response.data.settings;
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes - settings don't change often
      cacheTime: 30 * 60 * 1000, // 30 minutes - keep in cache
      retry: 3,
      retryDelay: 1000
    }
  );

  return {
    settings: data || null,
    isLoading,
    error
  };
};

