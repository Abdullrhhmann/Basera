import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from 'react-query';
import { FiBriefcase, FiMapPin, FiClock, FiBuilding, FiSearch, FiX } from '../icons/feather';
import { jobsAPI, jobApplicationsAPI } from '../utils/api';
import { showSuccess, showError } from '../utils/sonner';
import PageLayout from '../components/layout/PageLayout';
import FileUpload from '../components/common/FileUpload';

const JobCard = ({ job, onApply }) => {
  const formatJobType = (type) => {
    const types = {
      'full-time': 'Full Time',
      'part-time': 'Part Time',
      'contract': 'Contract',
      'internship': 'Internship'
    };
    return types[type] || type;
  };

  // Clean description - remove excessive whitespace and format
  const cleanDescription = (desc) => {
    if (!desc) return '';
    // Remove excessive spaces and newlines, then truncate
    return desc.replace(/\s+/g, ' ').trim();
  };

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-white/70 shadow-md shadow-basira-gold/5 hover:shadow-xl hover:shadow-basira-gold/10 transition-all duration-300 overflow-hidden flex flex-col h-full">
      <div className="p-4 sm:p-5 lg:p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2">{job.title || 'Job Title'}</h3>
          
          {/* Job Meta Info */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
            {job.department && (
              <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
                <FiBuilding className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">{job.department}</span>
              </div>
            )}
            {job.location && (
              <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
                <FiMapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">{job.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
              <FiClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">{formatJobType(job.jobType)}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <div className="mb-3 sm:mb-4 flex-1">
            <p className="text-gray-700 text-sm leading-relaxed line-clamp-4">
              {cleanDescription(job.description)}
            </p>
          </div>
        )}

        {/* Requirements */}
        {job.requirements && job.requirements.length > 0 && (
          <div className="mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">Key Requirements:</p>
            <ul className="space-y-1 sm:space-y-1.5">
              {job.requirements.slice(0, 3).map((req, idx) => (
                <li key={idx} className="text-xs sm:text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-basira-gold mt-1.5 flex-shrink-0">•</span>
                  <span className="line-clamp-2">{req}</span>
                </li>
              ))}
              {job.requirements.length > 3 && (
                <li className="text-xs sm:text-sm text-gray-500 italic">
                  +{job.requirements.length - 3} more requirement{job.requirements.length - 3 !== 1 ? 's' : ''}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Apply Button */}
        <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100">
          <button
            onClick={() => onApply(job)}
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-basira-gold text-white rounded-xl hover:bg-basira-gold/90 active:bg-basira-gold/95 transition-all duration-200 font-semibold shadow-sm shadow-basira-gold/20 hover:shadow-md hover:shadow-basira-gold/30 text-sm sm:text-base"
          >
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
};

const ApplicationForm = ({ job, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    coverLetter: '',
    jobPosting: job?._id || ''
  });
  const [cvFile, setCvFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!cvFile) newErrors.cvFile = 'CV file is required';
    if (!formData.jobPosting) newErrors.jobPosting = 'Please select a job';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const applicationData = {
        ...formData,
        cvFile: {
          url: cvFile.url,
          publicId: cvFile.publicId
        }
      };

      await jobApplicationsAPI.submitApplication(applicationData);
      showSuccess('Application submitted successfully!');
      onSubmit();
      onClose();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between z-10">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 pr-2">Apply for {job?.title || 'Position'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
          >
            <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition-all bg-white text-gray-900 placeholder-gray-500 text-sm sm:text-base"
              placeholder="Your full name"
            />
            {errors.name && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition-all bg-white text-gray-900 placeholder-gray-500 text-sm sm:text-base"
              placeholder="your.email@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition-all bg-white text-gray-900 placeholder-gray-500 text-sm sm:text-base"
              placeholder="+20 123 456 7890"
            />
            {errors.phone && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Cover Letter (Optional)
            </label>
            <textarea
              value={formData.coverLetter}
              onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
              rows={4}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition-all resize-none bg-white text-gray-900 placeholder-gray-500 text-sm sm:text-base"
              placeholder="Tell us why you're interested in this position..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              CV (PDF) <span className="text-red-500">*</span>
            </label>
            <FileUpload
              onFileUpload={setCvFile}
              onFileRemove={() => setCvFile(null)}
              uploadedFile={cvFile}
              disabled={submitting}
            />
            {errors.cvFile && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.cvFile}</p>}
          </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-basira-gold text-white rounded-xl hover:bg-basira-gold/90 active:bg-basira-gold/95 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md shadow-basira-gold/20 hover:shadow-lg hover:shadow-basira-gold/30 text-sm sm:text-base"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Careers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: jobsData, isLoading, refetch } = useQuery(
    ['jobs', currentPage, searchTerm],
    async () => {
      const response = await jobsAPI.getJobs({ page: currentPage, limit: 10, search: searchTerm });
      return response.data; // Extract data from axios response
    },
    {
      keepPreviousData: true
    }
  );

  const jobs = useMemo(() => jobsData?.jobs || [], [jobsData?.jobs]);
  const departments = useMemo(() => {
    const depts = new Set();
    jobs.forEach(job => {
      if (job.department) depts.add(job.department);
    });
    return Array.from(depts);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (selectedJobType && job.jobType !== selectedJobType) return false;
      if (selectedDepartment && job.department !== selectedDepartment) return false;
      return true;
    });
  }, [jobs, selectedJobType, selectedDepartment]);

  const handleApply = (job) => {
    setSelectedJob(job);
    setShowApplicationForm(true);
  };

  const handleApplicationSubmit = () => {
    refetch();
  };

  return (
    <>
      <Helmet>
        <title>Careers | Basira Real Estate</title>
        <meta name="description" content="Join our team at Basira Real Estate. Explore open positions and apply today." />
      </Helmet>

      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {/* Hero Section */}
          <section className="relative pt-24 sm:pt-28 md:pt-32 pb-10 sm:pb-12 md:pb-16 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-basira-gold/8 via-transparent to-basira-gold/8"></div>
              <div className="absolute top-10 right-10 w-48 h-48 sm:top-20 sm:right-20 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-basira-gold/15 rounded-full blur-3xl animate-pulse"></div>
            </div>

            <div className="container-max px-4 sm:px-6 relative z-10">
              <div className="text-center max-w-4xl mx-auto">
                <div className="inline-block mb-4 sm:mb-6">
                  <FiBriefcase className="w-12 h-12 sm:w-16 sm:h-16 text-basira-gold mx-auto" />
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                  Join Our Team
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto px-4">
                  Build your career with Basira Real Estate. Explore exciting opportunities and be part of Egypt's premier real estate company.
                </p>
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="container-max px-4 sm:px-6 mb-8 sm:mb-10 lg:mb-12">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-white/70 shadow-lg shadow-basira-gold/5 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 w-full sm:w-auto">
                  <div className="relative">
                    <FiSearch className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search jobs..."
                      className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition-all bg-white text-gray-900 placeholder-gray-500 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <select
                  value={selectedJobType}
                  onChange={(e) => setSelectedJobType(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-basira-gold focus:border-basira-gold bg-white text-gray-900 cursor-pointer transition-all sm:min-w-[160px] text-sm sm:text-base"
                >
                  <option value="">All Job Types</option>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-basira-gold focus:border-basira-gold bg-white text-gray-900 cursor-pointer transition-all sm:min-w-[180px] text-sm sm:text-base"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Jobs List */}
          <section className="container-max px-4 sm:px-6 pb-12 sm:pb-16 lg:pb-20">
            {isLoading ? (
              <div className="text-center py-12 sm:py-16">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-basira-gold"></div>
                <p className="mt-4 text-gray-300 text-sm sm:text-base">Loading jobs...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-white/95 backdrop-blur-xl rounded-2xl border border-white/70 shadow-lg shadow-basira-gold/5">
                <FiBriefcase className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">No jobs found</p>
                <p className="text-sm sm:text-base text-gray-500 px-4">Try adjusting your filters or check back later for new opportunities</p>
              </div>
            ) : (
              <>
                <div className="mb-4 sm:mb-6">
                  <p className="text-white text-sm sm:text-base">
                    Showing <span className="font-semibold text-basira-gold">{filteredJobs.length}</span> job{filteredJobs.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredJobs.map((job) => (
                    <JobCard key={job._id} job={job} onApply={handleApply} />
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {jobsData?.pagination && jobsData.pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-8 sm:mt-12">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-white/95 border border-white/70 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors font-medium text-gray-700 shadow-sm shadow-basira-gold/5 text-sm sm:text-base"
                >
                  Previous
                </button>
                <div className="px-4 sm:px-6 py-2.5 bg-white/95 border border-white/70 rounded-xl shadow-sm shadow-basira-gold/5">
                  <span className="text-gray-700 font-medium text-sm sm:text-base">
                    Page <span className="text-basira-gold font-semibold">{currentPage}</span> of <span className="text-basira-gold font-semibold">{jobsData.pagination.totalPages}</span>
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(jobsData.pagination.totalPages, p + 1))}
                  disabled={currentPage === jobsData.pagination.totalPages}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-white/95 border border-white/70 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors font-medium text-gray-700 shadow-sm shadow-basira-gold/5 text-sm sm:text-base"
                >
                  Next
                </button>
              </div>
            )}
          </section>

          {/* Application Form Modal */}
          {showApplicationForm && (
            <ApplicationForm
              job={selectedJob}
              onClose={() => {
                setShowApplicationForm(false);
                setSelectedJob(null);
              }}
              onSubmit={handleApplicationSubmit}
            />
          )}
        </div>
      </PageLayout>
    </>
  );
};

export default Careers;
