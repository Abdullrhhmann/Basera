import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiSearch, FiEye, FiTrash2, FiDownload, FiFileText, FiX } from '../../icons/feather';
import { jobApplicationsAPI, jobsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { showSuccess, showError } from '../../utils/sonner';

const AdminJobApplications = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch applications
  const { data: applicationsData, isLoading } = useQuery(
    ['admin-applications', currentPage, filterStatus, filterJob, searchTerm],
    async () => {
      const response = await jobApplicationsAPI.getApplications({
        page: currentPage,
        limit: itemsPerPage,
        status: filterStatus || undefined,
        jobPosting: filterJob || undefined,
        search: searchTerm || undefined
      });
      return response.data; // Extract data from axios response
    },
    {
      keepPreviousData: true
    }
  );

  // Fetch jobs for filter dropdown
  const { data: jobsData } = useQuery(
    ['admin-jobs-for-filter'],
    () => jobsAPI.getAdminJobs({ limit: 100 }),
    {
      staleTime: 5 * 60 * 1000
    }
  );

  const applications = applicationsData?.applications || [];
  const pagination = applicationsData?.pagination || {};
  const jobs = jobsData?.jobs || [];

  // Fetch single application for view modal
  const { data: applicationDetail, refetch: refetchDetail } = useQuery(
    ['application-detail', selectedApplication?._id],
    () => jobApplicationsAPI.getApplication(selectedApplication?._id),
    {
      enabled: !!selectedApplication?._id && showViewModal
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    (id) => jobApplicationsAPI.deleteApplication(id),
    {
      onSuccess: () => {
        showSuccess('Application deleted successfully');
        queryClient.invalidateQueries('admin-applications');
        setShowDeleteModal(false);
        setApplicationToDelete(null);
      },
      onError: (err) => {
        showError(err.response?.data?.message || 'Failed to delete application');
      }
    }
  );

  // Status update mutation
  const statusMutation = useMutation(
    ({ id, status, notes }) => jobApplicationsAPI.updateApplicationStatus(id, status, notes),
    {
      onSuccess: () => {
        showSuccess('Application status updated successfully');
        queryClient.invalidateQueries('admin-applications');
        if (showViewModal) {
          refetchDetail();
        }
      },
      onError: (err) => {
        showError(err.response?.data?.message || 'Failed to update application status');
      }
    }
  );

  const handleDelete = (application) => {
    setApplicationToDelete(application);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (applicationToDelete) {
      deleteMutation.mutate(applicationToDelete._id);
    }
  };

  const handleView = async (application) => {
    setSelectedApplication(application);
    setShowViewModal(true);
  };

  const handleStatusChange = (application, newStatus) => {
    statusMutation.mutate({
      id: application._id,
      status: newStatus
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      reviewed: 'bg-blue-500',
      shortlisted: 'bg-green-500',
      rejected: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDownloadCV = (application) => {
    if (application.cvFile?.url) {
      window.open(application.cvFile.url, '_blank');
    }
  };

  const applicationDetailData = applicationDetail?.application || selectedApplication;

  return (
    <>
      <Helmet>
        <title>Job Applications | Admin Dashboard</title>
      </Helmet>

      <AdminLayout title="Job Applications" user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FiFileText className="w-6 h-6" />
              Job Applications
            </h1>
            <p className="text-slate-400 mt-1">View and manage job applications</p>
          </div>

          {/* Filters */}
          <div className="bg-slate-800 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, phone..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={filterJob}
                onChange={(e) => setFilterJob(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Jobs</option>
                {jobs.map(job => (
                  <option key={job._id} value={job._id}>{job.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Applications Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-slate-400">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 bg-slate-800 rounded-xl">
              <FiFileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-xl text-slate-300">No applications found</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Job</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Applied</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {applications.map((application) => (
                        <tr key={application._id} className="hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">{application.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-300">{application.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-300">{application.phone}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-300 max-w-xs truncate">
                              {application.jobPosting?.title || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={application.status}
                              onChange={(e) => handleStatusChange(application, e.target.value)}
                              className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(application.status)} border-0 cursor-pointer`}
                            >
                              <option value="pending">Pending</option>
                              <option value="reviewed">Reviewed</option>
                              <option value="shortlisted">Shortlisted</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-300">
                              {formatDate(application.appliedAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleView(application)}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                title="View Details"
                              >
                                <FiEye className="w-5 h-5" />
                              </button>
                              {application.cvFile?.url && (
                                <button
                                  onClick={() => handleDownloadCV(application)}
                                  className="text-green-400 hover:text-green-300 transition-colors"
                                  title="Download CV"
                                >
                                  <FiDownload className="w-5 h-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(application)}
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
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} applications
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

        {/* View Application Modal */}
        {showViewModal && applicationDetailData && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Application Details</h2>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedApplication(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Applicant Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                    <p className="text-white">{applicationDetailData.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                    <p className="text-white">{applicationDetailData.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Phone</label>
                    <p className="text-white">{applicationDetailData.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Applied Date</label>
                    <p className="text-white">{formatDate(applicationDetailData.appliedAt)}</p>
                  </div>
                </div>

                {/* Job Info */}
                {applicationDetailData.jobPosting && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Position Applied For</label>
                    <div className="bg-slate-900 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{applicationDetailData.jobPosting.title}</h3>
                      {applicationDetailData.jobPosting.department && (
                        <p className="text-slate-300 text-sm">{applicationDetailData.jobPosting.department}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Cover Letter */}
                {applicationDetailData.coverLetter && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Cover Letter</label>
                    <div className="bg-slate-900 rounded-lg p-4">
                      <p className="text-white whitespace-pre-wrap">{applicationDetailData.coverLetter}</p>
                    </div>
                  </div>
                )}

                {/* CV Download */}
                {applicationDetailData.cvFile?.url && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">CV</label>
                    <button
                      onClick={() => handleDownloadCV(applicationDetailData)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <FiDownload className="w-5 h-5" />
                      Download CV
                    </button>
                  </div>
                )}

                {/* Status Update */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Status</label>
                  <select
                    value={applicationDetailData.status}
                    onChange={(e) => handleStatusChange(applicationDetailData, e.target.value)}
                    className={`px-4 py-2 rounded-lg text-white font-semibold ${getStatusColor(applicationDetailData.status)} border-0`}
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setApplicationToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Application"
          message={`Are you sure you want to delete the application from "${applicationToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmClass="bg-red-600 hover:bg-red-700"
          loading={deleteMutation.isLoading}
        />
      </AdminLayout>
    </>
  );
};

export default AdminJobApplications;

