import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { launchesAPI } from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';

const ViewLaunch = () => {
  const { user } = useAuth();
  const { id } = useParams();

  const { data: launchData, isLoading, error } = useQuery(
    ['launch', id],
    () => launchesAPI.get(`/launches/${id}`),
    {
      enabled: !!id,
    }
  );

  const formatPrice = (price, currency) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Available': 'bg-green-100 text-green-800',
      'Coming Soon': 'bg-blue-100 text-blue-800',
      'Pre-Launch': 'bg-orange-100 text-orange-800',
      'Sold Out': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <AdminLayout title="View Launch" user={user}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-basira-gold"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="View Launch" user={user}>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading launch: {error.message}</p>
        </div>
      </AdminLayout>
    );
  }

  if (!launchData?.data) {
    return (
      <AdminLayout title="View Launch" user={user}>
        <div className="text-center py-12">
          <p className="text-gray-600">Launch not found</p>
        </div>
      </AdminLayout>
    );
  }

  const launch = launchData.data;

  return (
    <>
      <Helmet>
        <title>{launch.title} | Basira Real Estate Admin</title>
        <meta name="description" content={`View details for ${launch.title}`} />
      </Helmet>

      <AdminLayout title="View Launch" user={user}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{launch.title}</h1>
              <p className="text-gray-600">by {launch.developer}</p>
            </div>
            <div className="flex space-x-3">
              <Link
                to={`/admin/launches/${launch._id}/edit`}
                className="bg-basira-gold text-white px-4 py-2 rounded-md hover:bg-basira-gold/90 transition-colors"
              >
                Edit Launch
              </Link>
              <Link
                to="/admin/launches"
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Back to Launches
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <img
                  src={launch.image}
                  alt={launch.title}
                  className="w-full h-64 object-cover"
                />
              </div>

              {/* Description */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
                <p className="text-gray-700 leading-relaxed">{launch.description}</p>
              </div>

              {/* Content */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Information</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{launch.content}</p>
                </div>
              </div>

              {/* Features */}
              {launch.features && launch.features.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {launch.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-700">
                        <span className="w-2 h-2 bg-basira-gold rounded-full mr-3"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Amenities */}
              {launch.amenities && launch.amenities.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {launch.amenities.map((amenity, index) => (
                      <li key={index} className="flex items-center text-gray-700">
                        <span className="w-2 h-2 bg-basira-gold rounded-full mr-3"></span>
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(launch.status)}`}>
                        {launch.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Property Type</label>
                    <p className="mt-1 text-sm text-gray-900">{launch.propertyType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="mt-1 text-sm text-gray-900">{launch.location}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Starting Price</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {formatPrice(launch.startingPrice, launch.currency)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Area</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {launch.area} {launch.areaUnit}
                    </p>
                  </div>
                  {launch.bedrooms && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Bedrooms</label>
                      <p className="mt-1 text-sm text-gray-900">{launch.bedrooms}</p>
                    </div>
                  )}
                  {launch.bathrooms && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Bathrooms</label>
                      <p className="mt-1 text-sm text-gray-900">{launch.bathrooms}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Launch Dates */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Launch Dates</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Launch Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(launch.launchDate)}</p>
                  </div>
                  {launch.completionDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Completion Date</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(launch.completionDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              {launch.contactInfo && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    {launch.contactInfo.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="mt-1 text-sm text-gray-900">{launch.contactInfo.phone}</p>
                      </div>
                    )}
                    {launch.contactInfo.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="mt-1 text-sm text-gray-900">{launch.contactInfo.email}</p>
                      </div>
                    )}
                    {launch.contactInfo.website && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Website</label>
                        <a
                          href={launch.contactInfo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          {launch.contactInfo.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(launch.createdAt)} by {launch.createdBy?.name || 'Unknown'}
                    </p>
                  </div>
                  {launch.updatedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Updated</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDate(launch.updatedAt)} by {launch.updatedBy?.name || 'Unknown'}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Featured</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {launch.isFeatured ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default ViewLaunch;
