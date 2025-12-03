import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiBriefcase } from '../../icons/feather';
import { jobsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { showSuccess, showError } from '../../utils/sonner';

const AdminJobs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterJobType, setFilterJobType] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch jobs
  const { data: jobsData, isLoading } = useQuery(
    ['admin-jobs', currentPage, filterStatus, filterDepartment, filterJobType, searchTerm],
    async () => {
      const response = await jobsAPI.getAdminJobs({
        page: currentPage,
        limit: itemsPerPage,
        status: filterStatus || undefined,
        department: filterDepartment || undefined,
        jobType: filterJobType || undefined,
        search: searchTerm || undefined
      });
      return response.data; // Extract data from axios response
    },
    {
      keepPreviousData: true,
      staleTime: 0, // Always refetch when query is invalidated
      cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnMount: true // Always refetch when component mounts
    }
  );

  const jobs = jobsData?.jobs || [];
  const pagination = jobsData?.pagination || {};

  // Delete mutation
  const deleteMutation = useMutation(
    (id) => jobsAPI.deleteJob(id),
    {
      onSuccess: () => {
        showSuccess('Job deleted successfully');
        queryClient.invalidateQueries('admin-jobs');
        setShowDeleteModal(false);
        setJobToDelete(null);
      },
      onError: (err) => {
        showError(err.response?.data?.message || 'Failed to delete job');
      }
    }
  );

  // Status update mutation
  const statusMutation = useMutation(
    ({ id, status }) => jobsAPI.updateJobStatus(id, status),
    {
      onSuccess: () => {
        showSuccess('Job status updated successfully');
        queryClient.invalidateQueries('admin-jobs');
      },
      onError: (err) => {
        showError(err.response?.data?.message || 'Failed to update job status');
      }
    }
  );

  const handleDelete = (job) => {
    setJobToDelete(job);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (jobToDelete) {
      deleteMutation.mutate(jobToDelete._id);
    }
  };

  const handleStatusChange = (job, newStatus) => {
    statusMutation.mutate({ id: job._id, status: newStatus });
  };

  const formatJobType = (type) => {
    const types = {
      'full-time': 'Full Time',
      'part-time': 'Part Time',
      'contract': 'Contract',
      'internship': 'Internship'
    };
    return types[type] || type;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-green-500',
      closed: 'bg-gray-500',
      expired: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const departments = [...new Set(jobs.map(job => job.department).filter(Boolean))];

  return (
    <>
      <Helmet>
        <title>Jobs Management | Admin Dashboard</title>
      </Helmet>

      <AdminLayout title="Jobs Management" user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <FiBriefcase className="w-6 h-6" />
                Jobs Management
              </h1>
              <p className="text-slate-400 mt-1">Manage job postings and applications</p>
            </div>
            <Link
              to="/admin/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              Add New Job
            </Link>
          </div>

          {/* Filters */}
          <div className="bg-slate-800 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search jobs..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="expired">Expired</option>
              </select>
              <select
                value={filterJobType}
                onChange={(e) => setFilterJobType(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Job Types</option>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Jobs Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-slate-400">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 bg-slate-800 rounded-xl">
              <FiBriefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-xl text-slate-300">No jobs found</p>
              <p className="text-slate-500 mt-2">Create your first job posting</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Posted</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {jobs.map((job) => (
                        <tr key={job._id} className="hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">{job.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-300">{job.department || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-300">{formatJobType(job.jobType)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-300">{job.location || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={job.status}
                              onChange={(e) => handleStatusChange(job, e.target.value)}
                              className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(job.status)} border-0 cursor-pointer`}
                            >
                              <option value="open">Open</option>
                              <option value="closed">Closed</option>
                              <option value="expired">Expired</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-300">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/admin/jobs/${job._id}/edit`}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                title="Edit"
                              >
                                <FiEdit className="w-5 h-5" />
                              </Link>
                              <button
                                onClick={() => handleDelete(job)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Delete"
                              >
                                <FiTrash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} jobs
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-slate-300">
                      Page {currentPage} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setJobToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Job"
          message={`Are you sure you want to delete "${jobToDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmClass="bg-red-600 hover:bg-red-700"
          loading={deleteMutation.isLoading}
        />
      </AdminLayout>
    </>
  );
};

export default AdminJobs;

