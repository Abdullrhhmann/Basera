import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiSearch } from '../../icons/feather';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { showSuccess, showError } from '../../utils/sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const AdminBlogs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPublished, setFilterPublished] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState(null);
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  // Fetch blogs
  const { data: blogsData, isLoading } = useQuery(
    ['admin-blogs', searchTerm, filterCategory, filterPublished],
    async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (filterPublished) params.append('published', filterPublished);
      
      const response = await axios.get(`${API_URL}/blogs/admin/all?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    { 
      retry: 1,
      onError: (err) => {
        console.error('Error fetching blogs:', err);
        showError('Failed to load blogs');
      }
    }
  );

  // Delete blog mutation
  const deleteBlOgMutation = useMutation(
    async (id) => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/blogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    {
      onSuccess: () => {
        showSuccess('Blog deleted successfully');
        queryClient.invalidateQueries('admin-blogs');
        setShowDeleteModal(false);
        setBlogToDelete(null);
      },
      onError: (err) => {
        showError('Failed to delete blog');
      }
    }
  );

  const handleDelete = (blog) => {
    setBlogToDelete(blog);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (blogToDelete) {
      deleteBlOgMutation.mutate(blogToDelete._id);
    }
  };

  const blogs = blogsData?.data || [];

  const categories = ['All', 'Real Estate Tips', 'Market Insights', 'Investment Guide', 'Property News', 'Developer Updates', 'General'];

  // Filter blogs by search term
  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = !searchTerm || 
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <AdminLayout title="Blog Management" user={user} onLogout={logout}>
      <Helmet>
        <title>Blog Management | Admin Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Blog Posts</h2>
            <p className="text-slate-400 mt-1">Manage your blog articles and insights</p>
          </div>
          <Link
            to="/admin/blogs/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
          >
            <FiPlus className="w-5 h-5" />
            Add New Blog
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Categories</option>
              {categories.filter(c => c !== 'All').map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Published Filter */}
            <select
              value={filterPublished}
              onChange={(e) => setFilterPublished(e.target.value)}
              className="px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Status</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-6">
            <p className="text-blue-300 text-sm font-medium">Total Blogs</p>
            <p className="text-3xl font-bold text-white mt-2">{blogs.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-2xl p-6">
            <p className="text-green-300 text-sm font-medium">Published</p>
            <p className="text-3xl font-bold text-white mt-2">{blogs.filter(b => b.published).length}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-2xl p-6">
            <p className="text-yellow-300 text-sm font-medium">Drafts</p>
            <p className="text-3xl font-bold text-white mt-2">{blogs.filter(b => !b.published).length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-6">
            <p className="text-purple-300 text-sm font-medium">Featured</p>
            <p className="text-3xl font-bold text-white mt-2">{blogs.filter(b => b.featured).length}</p>
          </div>
        </div>

        {/* Blogs Table */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-lg">No blogs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-800/50 border-b border-slate-700/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Title</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Category</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Views</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Likes</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Date</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredBlogs.map((blog) => (
                    <tr key={blog._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {blog.featured && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded">⭐</span>
                          )}
                          <div>
                            <p className="font-medium text-white">{blog.title}</p>
                            <p className="text-sm text-slate-400 line-clamp-1">{blog.excerpt}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full">
                          {blog.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {blog.published ? (
                          <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-medium rounded-full">
                            Published
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded-full">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{blog.views || 0}</td>
                      <td className="px-6 py-4 text-slate-300">{blog.likes || 0}</td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/blog/${blog.slug}`}
                            target="_blank"
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800/50 rounded-lg transition-all"
                            title="View"
                          >
                            <FiEye className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/admin/blogs/${blog._id}/edit`}
                            className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-800/50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <FiEdit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(blog)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
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
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setBlogToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Blog"
        message={`Are you sure you want to delete "${blogToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </AdminLayout>
  );
};

export default AdminBlogs;

