import axios from 'axios';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Create axios instance with base configuration
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL,
  timeout: 30000, // Increased timeout for file uploads
});

// Lightweight client-side request queue to avoid overwhelming the API
const MAX_CONCURRENT_REQUESTS = 10;
const REQUEST_QUEUE_DELAY_MS = 50;
const MAX_429_RETRIES = 3;

let activeRequests = 0;
const pendingQueue = [];

const processQueue = () => {
  if (pendingQueue.length === 0) return;
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) return;

  const nextItem = pendingQueue.shift();
  if (nextItem) {
    activeRequests += 1;
    nextItem.resolve(nextItem.config);
  }
};

const enqueueRequest = (config) =>
  new Promise((resolve) => {
    pendingQueue.push({ resolve, config });
    if (REQUEST_QUEUE_DELAY_MS) {
      setTimeout(processQueue, REQUEST_QUEUE_DELAY_MS);
    } else {
      processQueue();
    }
  });

const finalizeRequest = () => {
  activeRequests = Math.max(activeRequests - 1, 0);
  processQueue();
};

// Request interceptor to add auth token and apply queueing
api.interceptors.request.use(
  (config) => {
    // Skip queueing for authentication requests
    const isAuthRequest = config.url?.includes('/auth/');
    
    if (!config.__skipQueue && !isAuthRequest) {
      if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
        return enqueueRequest(config);
      }
      activeRequests += 1;
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and retry logic
api.interceptors.response.use(
  (response) => {
    if (response.config) {
      delete response.config.__retryCount;
      delete response.config.__skipQueue;
    }
    // Only finalize request if it was queued
    const isAuthRequest = response.config.url?.includes('/auth/');
    if (!isAuthRequest) {
      finalizeRequest();
    }
    return response;
  },
  async (error) => {
    // Only finalize request if it was queued
    const isAuthRequest = error.config?.url?.includes('/auth/');
    if (!isAuthRequest) {
      finalizeRequest();
    }

    const status = error.response?.status;
    const originalConfig = error.config || {};

    if (status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    if (status === 403) {
      return Promise.reject(error);
    }

    if (status === 429) {
      originalConfig.__retryCount = (originalConfig.__retryCount || 0) + 1;
      if (originalConfig.__retryCount <= MAX_429_RETRIES) {
        const retryAfterHeader = error.response?.headers?.['retry-after'];
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        const baseDelay = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 1500;
        const jitter = Math.random() * 250;
        await sleep(baseDelay + jitter * originalConfig.__retryCount);
        return api({ ...originalConfig, __skipQueue: false });
      }
    }

    if (originalConfig) {
      delete originalConfig.__retryCount;
      delete originalConfig.__skipQueue;
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
};

export const propertiesAPI = {
  getProperties: (params) => api.get('/properties', { params }),
  getProperty: (id, params) => api.get(`/properties/${id}`, { params }),
  createProperty: (propertyData) => api.post('/properties', propertyData),
  updateProperty: (id, propertyData) => api.put(`/properties/${id}`, propertyData),
  deleteProperty: (id) => api.delete(`/properties/${id}`),
  archiveProperty: (id) => api.post(`/properties/${id}/archive`),
  restoreProperty: (id) => api.post(`/properties/${id}/restore`),
  createInquiry: (id, inquiryData) => api.post(`/properties/${id}/inquiry`, inquiryData),
  getStats: () => api.get('/properties/stats/overview'),
  clearCache: () => api.post('/properties/cache/clear'),
  // Property approval workflow
  getPendingProperties: (params) => api.get('/properties/pending', { params }),
  approveProperty: (id) => api.put(`/properties/${id}/approve`),
  rejectProperty: (id, reason) => api.put(`/properties/${id}/reject`, { reason }),
  // Sold/Rented archive
  getSoldArchive: (params) => api.get('/properties/sold-archive', { params }),
  // User submissions
  getMySubmissions: (params) => api.get('/properties/my-submissions', { params }),
};

export const launchesAPI = {
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  patch: (url, data, config) => api.patch(url, data, config),
  delete: (url, config) => api.delete(url, config),
  getLaunches: (params) => api.get('/launches/admin', { params }),
  getLaunch: (id) => api.get(`/launches/${id}`),
  createLaunch: (launchData) => api.post('/launches', launchData),
  updateLaunch: (id, launchData) => api.put(`/launches/${id}`, launchData),
  deleteLaunch: (id) => api.delete(`/launches/${id}`),
  archiveLaunch: (id) => api.post(`/launches/${id}/archive`),
  restoreLaunch: (id) => api.post(`/launches/${id}/restore`),
  clearCache: () => api.post('/launches/cache/clear'),
};

export const uploadsAPI = {
  uploadImage: (formData, config = {}) => {
    const finalConfig = {
      ...config,
      headers: {
        ...(config.headers || {}),
      },
    };

    // Allow the browser to attach the correct multipart boundary.
    delete finalConfig.headers['Content-Type'];
    delete finalConfig.headers['content-type'];

    return api.post('/uploads/image', formData, finalConfig);
  },
  uploadDocument: (formData, config = {}) => {
    const finalConfig = {
      ...config,
      headers: {
        ...(config.headers || {}),
      },
    };

    // Allow the browser to attach the correct multipart boundary.
    delete finalConfig.headers['Content-Type'];
    delete finalConfig.headers['content-type'];

    return api.post('/uploads/document', formData, finalConfig);
  },
  uploadBrochure: (formData, config = {}) => {
    const finalConfig = {
      ...config,
      headers: {
        ...(config.headers || {}),
      },
    };

    // Allow the browser to attach the correct multipart boundary.
    delete finalConfig.headers['Content-Type'];
    delete finalConfig.headers['content-type'];

    return api.post('/uploads/brochure', formData, finalConfig);
  },
  deleteImage: (publicId, config = {}) =>
    api.delete(`/uploads/image/${encodeURIComponent(publicId)}`, config),
};

export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats/overview'),
  clearCache: () => api.post('/users/cache/clear'),
  getFavorites: () => api.get('/users/me/favorites'),
  addFavorite: (propertyId) => api.post(`/users/me/favorites/${propertyId}`),
  removeFavorite: (propertyId) => api.delete(`/users/me/favorites/${propertyId}`),
};

export const inquiriesAPI = {
  getInquiries: (params) => api.get('/inquiries', { params }),
  getInquiry: (id) => api.get(`/inquiries/${id}`),
  createInquiry: (propertyId, inquiryData) => api.post(`/properties/${propertyId}/inquiry`, inquiryData),
  updateInquiry: (id, inquiryData) => api.put(`/inquiries/${id}`, inquiryData),
  deleteInquiry: (id) => api.delete(`/inquiries/${id}`),
  archiveInquiry: (id) => api.post(`/inquiries/${id}/archive`),
  restoreInquiry: (id) => api.post(`/inquiries/${id}/restore`),
  addNote: (id, noteData) => api.post(`/inquiries/${id}/notes`, noteData),
  getLeads: (params) => api.get('/inquiries/leads', { params }),
  getLead: (id) => api.get(`/inquiries/lead/${id}`),
  createLead: (leadData) => api.post('/inquiries/lead', leadData),
  updateLead: (id, leadData) => api.put(`/inquiries/lead/${id}`, leadData),
  deleteLead: (id) => api.delete(`/inquiries/lead/${id}`),
  archiveLead: (id) => api.post(`/inquiries/lead/${id}/archive`),
  restoreLead: (id) => api.post(`/inquiries/lead/${id}/restore`),
  addLeadNote: (id, noteData) => api.post(`/inquiries/lead/${id}/notes`, noteData),
  getStats: () => api.get('/inquiries/stats/overview'),
  clearCache: () => api.post('/inquiries/cache/clear'),
};

export const chatAPI = {
  sendMessage: (messageData) => api.post('/chat/message', messageData),
  submitContact: (contactData) => api.post('/chat/contact', contactData),
  getStats: () => api.get('/chat/stats'),
  scheduleFollowUp: (followUpData) => api.post('/chat/schedule-followup', followUpData),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats')
};

// Search API functions
export const searchAPI = {
  // Track a search query
  trackSearch: async (searchData) => {
    const response = await api.post('/search/track', searchData);
    return response.data;
  },

  // Get popular searches (admin only)
  getPopularSearches: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/search/popular?${queryParams}`);
    return response.data;
  },

  // Get search trends (admin only)
  getSearchTrends: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/search/trends?${queryParams}`);
    return response.data;
  },

  // Get search statistics (admin only)
  getSearchStats: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/search/stats?${queryParams}`);
    return response.data;
  },

  // Get recent searches (admin only)
  getRecentSearches: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/search/recent?${queryParams}`);
    return response.data;
  }
};

// Developer API methods
export const developersAPI = {
  // Get all developers
  getDevelopers: (params) => api.get('/developers', { params }),
  
  // Get single developer by slug
  getDeveloper: (slug) => api.get(`/developers/${slug}`),
  
  // Create new developer (admin only)
  createDeveloper: (data) => api.post('/developers', data),
  
  // Update developer (admin only)
  updateDeveloper: (id, data) => api.put(`/developers/${id}`, data),
  
  // Delete developer (admin only)
  deleteDeveloper: (id) => api.delete(`/developers/${id}`)
};

// Compounds API methods
export const compoundsAPI = {
  // Get all compounds
  getCompounds: (params) => api.get('/compounds', { params }),

  // Get single compound by slug or ID
  getCompound: (slugOrId, params) => api.get(`/compounds/${slugOrId}`, { params }),

  // Create new compound (admin only)
  createCompound: (data) => api.post('/compounds', data),

  // Update compound (admin only)
  updateCompound: (id, data) => api.put(`/compounds/${id}`, data),

  // Delete compound (admin only)
  deleteCompound: (id) => api.delete(`/compounds/${id}`),
};

// Governorates API methods
export const governoratesAPI = {
  // Get all governorates
  getGovernorates: (params) => api.get('/governorates', { params }),
  
  // Get single governorate by ID
  getGovernorate: (id) => api.get(`/governorates/${id}`),
  
  // Get related counts (cities, areas, properties)
  getRelatedCounts: (id) => api.get(`/governorates/${id}/related-counts`),
  
  // Create new governorate (admin only)
  createGovernorate: (data) => api.post('/governorates', data),
  
  // Update governorate (admin only)
  updateGovernorate: (id, data) => api.put(`/governorates/${id}`, data),
  
  // Delete governorate only (admin only)
  deleteGovernorate: (id) => api.delete(`/governorates/${id}`),
  
  // Cascade delete governorate and all related data (admin only)
  cascadeDelete: (id) => api.delete(`/governorates/${id}/cascade`)
};

// Cities API methods
export const citiesAPI = {
  // Get all cities
  getCities: (params) => api.get('/cities', { params }),
  
  // Get cities by governorate
  getCitiesByGovernorate: (governorateId) => api.get(`/cities/by-governorate/${governorateId}`),
  
  // Get single city by slug
  getCity: (slug) => api.get(`/cities/${slug}`),
  
  // Get single city by ID (admin only)
  getCityById: (id) => api.get(`/cities/${id}`),
  
  // Create new city (admin only)
  createCity: (data) => api.post('/cities', data),
  
  // Update city (admin only)
  updateCity: (id, data) => api.put(`/cities/${id}`, data),
  
  // Delete city (admin only)
  deleteCity: (id) => api.delete(`/cities/${id}`)
};

// Areas API methods
export const areasAPI = {
  // Get all areas
  getAreas: (params) => api.get('/areas', { params }),
  
  // Get areas by city
  getAreasByCity: (cityId) => api.get(`/areas/by-city/${cityId}`),
  
  // Get single area by ID
  getArea: (id) => api.get(`/areas/${id}`),
  
  // Create new area (admin only)
  createArea: (data) => api.post('/areas', data),
  
  // Update area (admin only)
  updateArea: (id, data) => api.put(`/areas/${id}`, data),
  
  // Delete area (admin only)
  deleteArea: (id) => api.delete(`/areas/${id}`)
};

// Site Settings API methods
export const siteSettingsAPI = {
  // Get site settings (public)
  getSettings: () => api.get('/site-settings'),
  
  // Update site settings (admin only)
  updateSettings: (data) => api.put('/site-settings', data)
};

// Blogs API methods
export const blogsAPI = {
  // Get all blogs
  getBlogs: (params) => api.get('/blogs', { params }),
  
  // Get single blog by slug
  getBlog: (slug) => api.get(`/blogs/${slug}`),
  
  // Create new blog (admin only)
  createBlog: (data) => api.post('/blogs', data),
  
  // Update blog (admin only)
  updateBlog: (id, data) => api.put(`/blogs/${id}`, data),
  
  // Delete blog (admin only)
  deleteBlog: (id) => api.delete(`/blogs/${id}`)
};

// Jobs API methods
export const jobsAPI = {
  // Get all active jobs (public)
  getJobs: (params) => api.get('/jobs', { params }),
  
  // Get single job by ID (public)
  getJob: (id) => api.get(`/jobs/${id}`),
  
  // Get all jobs with filters (admin only)
  getAdminJobs: (params) => api.get('/jobs/admin/all', { params }),
  
  // Create new job posting (admin only)
  createJob: (data) => api.post('/jobs', data),
  
  // Update job posting (admin only)
  updateJob: (id, data) => api.put(`/jobs/${id}`, data),
  
  // Delete job posting (admin only)
  deleteJob: (id) => api.delete(`/jobs/${id}`),
  
  // Update job status (admin only)
  updateJobStatus: (id, status) => api.put(`/jobs/${id}/status`, { status })
};

// Job Applications API methods
export const jobApplicationsAPI = {
  // Submit job application (public)
  submitApplication: (data) => api.post('/job-applications', data),
  
  // Get all applications (admin only)
  getApplications: (params) => api.get('/job-applications', { params }),
  
  // Get single application (admin only)
  getApplication: (id) => api.get(`/job-applications/${id}`),
  
  // Update application status (admin only)
  updateApplicationStatus: (id, status, notes) => api.put(`/job-applications/${id}/status`, { status, notes }),
  
  // Delete application (admin only)
  deleteApplication: (id) => api.delete(`/job-applications/${id}`)
};

// Bulk Uploads API methods
export const bulkUploadsAPI = {
  // Upload users in bulk
  uploadUsers: (jsonData, options = {}) => api.post('/bulk-uploads/users', jsonData, {
    timeout: options.timeout || 15 * 60 * 1000, // 15 minutes default
    ...options
  }),
  
  // Upload properties in bulk
  uploadProperties: (jsonData, options = {}) => api.post('/bulk-uploads/properties', jsonData, {
    timeout: options.timeout || 15 * 60 * 1000, // 15 minutes default
    ...options
  }),
  
  // Upload leads in bulk
  uploadLeads: (jsonData, options = {}) => api.post('/bulk-uploads/leads', jsonData, {
    timeout: options.timeout || 15 * 60 * 1000, // 15 minutes default
    ...options
  }),
  
  // Upload developers in bulk
  uploadDevelopers: (jsonData, options = {}) => api.post('/bulk-uploads/developers', jsonData, {
    timeout: options.timeout || 15 * 60 * 1000, // 15 minutes default
    ...options
  }),
  
  // Upload cities in bulk
  uploadCities: (jsonData, options = {}) => api.post('/bulk-uploads/cities', jsonData, {
    timeout: options.timeout || 15 * 60 * 1000, // 15 minutes default
    ...options
  }),
  
  // Upload launches in bulk
  uploadLaunches: (jsonData, options = {}) => api.post('/bulk-uploads/launches', jsonData, {
    timeout: options.timeout || 15 * 60 * 1000, // 15 minutes default
    ...options
  }),
  
  // Download JSON template for entity type
  downloadTemplate: (entityType) => api.get(`/bulk-uploads/template/${entityType}`),
  
  // Download Excel template for entity type
  downloadTemplateExcel: (entityType) => api.get(`/bulk-uploads/template/${entityType}/excel`, {
    responseType: 'blob'
  })
};

// Newsletter API methods
export const newsletterAPI = {
  // Subscribe to newsletter (public)
  subscribe: (email) => api.post('/newsletter/subscribe', { email }),
  
  // Admin: Get all newsletter subscriptions
  getSubscriptions: (params) => api.get('/newsletter/admin/newsletter-subscriptions', { params }),
  
  // Admin: Export subscriptions to Excel
  exportSubscriptions: () => api.get('/newsletter/admin/newsletter-subscriptions/export', {
    responseType: 'blob'
  })
};

// Video API methods
export const videosAPI = {
  // Get all videos with filters
  getVideos: (params) => api.get('/videos', { params }),
  
  // Get single video by ID
  getVideo: (id) => api.get(`/videos/${id}`),
  
  // Create new video (admin only)
  createVideo: (data) => api.post('/videos', data),
  
  // Update video (admin only)
  updateVideo: (id, data) => api.put(`/videos/${id}`, data),
  
  // Delete video (admin only)
  deleteVideo: (id) => api.delete(`/videos/${id}`),
  
  // Get videos by compound
  getVideosByCompound: (compoundId) => api.get(`/videos/compound/${compoundId}`),
  
  // Get videos by launch
  getVideosByLaunch: (launchId) => api.get(`/videos/launch/${launchId}`),
  
  // Get videos by property
  getVideosByProperty: (propertyId) => api.get(`/videos/property/${propertyId}`),
  
  // Upload video (admin only)
  uploadVideo: (formData, onUploadProgress) => api.post('/uploads/video', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percentCompleted);
      }
    },
    timeout: 300000 // 5 minutes for large video uploads
  })
};

// Video Playlist API methods
export const videoPlaylistsAPI = {
  // Get all playlists with filters
  getPlaylists: (params) => api.get('/video-playlists', { params }),
  
  // Get single playlist by ID with videos
  getPlaylist: (id) => api.get(`/video-playlists/${id}`),
  
  // Create playlist (admin only)
  createPlaylist: (data) => api.post('/video-playlists', data),
  
  // Update playlist (admin only)
  updatePlaylist: (id, data) => api.put(`/video-playlists/${id}`, data),
  
  // Delete playlist (admin only)
  deletePlaylist: (id) => api.delete(`/video-playlists/${id}`),
  
  // Add videos to playlist (admin only)
  addVideoToPlaylist: (playlistId, videoIds) => api.post(`/video-playlists/${playlistId}/videos`, { videoIds }),
  
  // Remove video from playlist (admin only)
  removeVideoFromPlaylist: (playlistId, videoId) => api.delete(`/video-playlists/${playlistId}/videos/${videoId}`),
  
  // Get auto-generated playlist for compound
  getAutoPlaylistForCompound: (compoundId) => api.get(`/video-playlists/auto/compound/${compoundId}`),
  
  // Get auto-generated playlist for launch
  getAutoPlaylistForLaunch: (launchId) => api.get(`/video-playlists/auto/launch/${launchId}`)
};

export default api;
