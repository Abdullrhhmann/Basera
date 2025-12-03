import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { FiArrowLeft, FiEdit, FiMail, FiPhone, FiCalendar, FiMapPin, FiUser, FiEye, FiExternalLink } from '../../icons/feather';
import { useAuth } from '../../context/AuthContext';
import { inquiriesAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';

const ViewInquiry = () => {
  const { id } = useParams();
  const { user, logout, isAuthenticated, isAdminRole } = useAuth();
  const navigate = useNavigate();

  const { data: inquiry, isLoading, error } = useQuery(
    ['inquiry', id],
    async () => {
      const response = await inquiriesAPI.getInquiry(id);
      return response.data.inquiry;
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout title="View Inquiry" user={user} onLogout={logout}>
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
      <AdminLayout title="View Inquiry" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Inquiry</h2>
            <p className="text-gray-600 mb-6">
              {error?.message || 'Failed to load inquiry details'}
            </p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <Link
                to="/admin/inquiries"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Inquiries
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!inquiry) {
    return (
      <AdminLayout title="View Inquiry" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Inquiry Not Found</h2>
            <p className="text-gray-600 mb-6">The inquiry you're looking for doesn't exist.</p>
            <Link
              to="/admin/inquiries"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Inquiries
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>View Inquiry - Admin Panel</title>
      </Helmet>

      <AdminLayout title="View Inquiry" user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/inquiries')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back to Inquiries</span>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              {inquiry.property && (
                <Link
                  to={`/properties/${inquiry.property._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <FiExternalLink className="w-4 h-4" />
                  <span>View Property</span>
                </Link>
              )}
              <Link
                to={`/admin/inquiries/${inquiry._id}/edit`}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FiEdit className="w-4 h-4" />
                <span>Edit Inquiry</span>
              </Link>
            </div>
          </div>

          {/* Inquiry Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Status Header */}
            <div className={`px-6 py-4 border-b border-gray-200 ${
              inquiry.status === 'new' ? 'bg-blue-50' :
              inquiry.status === 'contacted' ? 'bg-yellow-50' :
              inquiry.status === 'interested' ? 'bg-green-50' :
              inquiry.status === 'not-interested' ? 'bg-red-50' :
              'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    inquiry.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    inquiry.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                    inquiry.status === 'interested' ? 'bg-green-100 text-green-800' :
                    inquiry.status === 'not-interested' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {inquiry.status?.replace('-', ' ').toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-500">
                    Received {new Date(inquiry.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  ID: {inquiry._id}
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Contact Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FiUser className="w-5 h-5 mr-2" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <p className="text-gray-900">{inquiry.contactInfo?.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <div className="flex items-center space-x-2">
                        <FiMail className="w-4 h-4 text-gray-400" />
                        <a 
                          href={`mailto:${inquiry.contactInfo?.email}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {inquiry.contactInfo?.email}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <div className="flex items-center space-x-2">
                        <FiPhone className="w-4 h-4 text-gray-400" />
                        <a 
                          href={`tel:${inquiry.contactInfo?.phone}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {inquiry.contactInfo?.phone}
                        </a>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <div className="flex items-center space-x-2">
                        <FiCalendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">
                          {new Date(inquiry.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Property Information */}
              {inquiry.property ? (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <FiMapPin className="w-5 h-5 mr-2" />
                      Property Information
                    </h3>
                    <Link
                      to={`/properties/${inquiry.property._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FiExternalLink className="w-4 h-4" />
                      <span>View Property</span>
                    </Link>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                       onClick={() => window.open(`/properties/${inquiry.property._id}`, '_blank')}>
                    <div className="flex items-start space-x-4">
                      {inquiry.property.images && inquiry.property.images.length > 0 ? (
                        <img
                          src={inquiry.property.images[0].url}
                          alt={inquiry.property.title}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                          <FiEye className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                          {inquiry.property.title}
                        </h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {inquiry.property.type} • {inquiry.property.status?.replace('-', ' ')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {inquiry.property.location?.city}, {inquiry.property.location?.state}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {inquiry.property.price?.toLocaleString()} {inquiry.property.currency}
                        </p>
                        <div className="mt-2 flex items-center text-blue-600 text-sm">
                          <FiExternalLink className="w-3 h-3 mr-1" />
                          <span>Click to view full property details</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FiMapPin className="w-5 h-5 mr-2" />
                    Property Information
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="text-gray-400 text-4xl mb-3">🏠</div>
                    <p className="text-gray-600">No property information available for this inquiry.</p>
                    <p className="text-sm text-gray-500 mt-2">This inquiry may have been submitted without selecting a specific property.</p>
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Message</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{inquiry.message}</p>
                </div>
              </div>

              {/* Notes */}
              {inquiry.notes && inquiry.notes.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                  <div className="space-y-4">
                    {inquiry.notes.map((note, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {note.createdBy?.name || 'Admin'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{note.content}</p>
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

export default ViewInquiry;
