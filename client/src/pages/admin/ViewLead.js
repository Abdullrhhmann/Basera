import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { FiArrowLeft, FiMail, FiPhone, FiCalendar, FiUser, FiEye, FiDollarSign } from '../../icons/feather';
import { useAuth } from '../../context/AuthContext';
import { inquiriesAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';

const ViewLead = () => {
  const { id } = useParams();
  const { user, logout, isAuthenticated, isAdminRole } = useAuth();
  const navigate = useNavigate();

  const { data: lead, isLoading, error } = useQuery(
    ['lead', id],
    async () => {
      const response = await inquiriesAPI.getLead(id);
      return response.data.lead;
    },
    {
      enabled: !!id,
      retry: 1
    }
  );

  if (!isAuthenticated || !isAdminRole()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout title="View Lead" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="View Lead" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-semibold mb-2">
              Error loading lead
            </div>
            <p className="text-gray-600 mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => navigate('/admin/leads')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Leads
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!lead) {
    return (
      <AdminLayout title="View Lead" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-600 text-lg font-semibold mb-2">
              Lead not found
            </div>
            <p className="text-gray-500 mb-4">
              The lead you're looking for doesn't exist or has been deleted.
            </p>
            <button
              onClick={() => navigate('/admin/leads')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Leads
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>View Lead - Admin Panel</title>
      </Helmet>

      <AdminLayout title="View Lead" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/leads')}
                className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back to Leads</span>
              </button>
            </div>
          </div>

          {/* Lead Details */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden">
            {/* Status Header */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">{lead.name}</h1>
                  <p className="text-slate-300 mt-1">{lead.email}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    lead.status === 'new' ? 'bg-yellow-500/20 text-yellow-400' :
                    lead.status === 'contacted' ? 'bg-blue-500/20 text-blue-400' :
                    lead.status === 'qualified' ? 'bg-green-500/20 text-green-400' :
                    lead.status === 'proposal-sent' ? 'bg-purple-500/20 text-purple-400' :
                    lead.status === 'negotiating' ? 'bg-orange-500/20 text-orange-400' :
                    lead.status === 'closed' ? 'bg-slate-500/20 text-slate-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {lead.status || 'new'}
                  </span>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    lead.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    lead.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {lead.priority || 'low'} priority
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Information */}
              <div className="bg-slate-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FiUser className="w-5 h-5 mr-2 text-blue-400" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                    <p className="text-white">{lead.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                    <p className="text-white flex items-center">
                      <FiMail className="w-4 h-4 mr-2 text-blue-400" />
                      {lead.email}
                    </p>
                  </div>
                  {lead.phone && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                      <p className="text-white flex items-center">
                        <FiPhone className="w-4 h-4 mr-2 text-green-400" />
                        {lead.phone}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Source</label>
                    <p className="text-white capitalize">{lead.source || 'Unknown'}</p>
                  </div>
                </div>
              </div>

              {/* Service & Requirements */}
              <div className="bg-slate-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FiEye className="w-5 h-5 mr-2 text-purple-400" />
                  Service & Requirements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Required Service</label>
                    <p className="text-white capitalize">{lead.requiredService || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Property Type</label>
                    <p className="text-white capitalize">{lead.propertyType?.replace('-', ' ') || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Budget Information */}
              {lead.budget && (
                <div className="bg-slate-800/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <FiDollarSign className="w-5 h-5 mr-2 text-green-400" />
                    Budget Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Min Budget</label>
                      <p className="text-white">
                        {lead.budget.min ? lead.budget.min.toLocaleString() : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Max Budget</label>
                      <p className="text-white">
                        {lead.budget.max ? lead.budget.max.toLocaleString() : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Currency</label>
                      <p className="text-white">{lead.budget.currency || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-slate-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FiCalendar className="w-5 h-5 mr-2 text-orange-400" />
                  Timeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Created</label>
                    <p className="text-white">
                      {new Date(lead.createdAt).toLocaleDateString()} at {new Date(lead.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  {lead.lastContactDate && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Last Contact</label>
                      <p className="text-white">
                        {new Date(lead.lastContactDate).toLocaleDateString()} at {new Date(lead.lastContactDate).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                  {lead.updatedAt && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Last Updated</label>
                      <p className="text-white">
                        {new Date(lead.updatedAt).toLocaleDateString()} at {new Date(lead.updatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {lead.notes && lead.notes.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
                  <div className="space-y-3">
                    {lead.notes.map((note, index) => (
                      <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-white">{note.note}</p>
                        {note.createdBy && (
                          <p className="text-slate-400 text-sm mt-2">
                            Added by {note.createdBy.name || 'Unknown'} on {new Date(note.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default ViewLead;
