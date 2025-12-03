import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Helmet } from 'react-helmet-async';
import AdminLayout from '../../components/admin/AdminLayout';
import { propertiesAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import {
  FiArrowLeft,
  FiDollarSign,
  FiMapPin,
  FiHome,
  FiUser,
  FiCalendar,
  FiCheckCircle,
  FiX,
  FiEdit,
  FiInfo,
} from '../../icons/feather';

const ViewProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: property,
    isLoading,
    error,
  } = useQuery(
    ['admin-property', id],
    async () => {
      const response = await propertiesAPI.getProperty(id, { _t: Date.now() });
      return response.data?.property || response.data;
    },
    {
      enabled: Boolean(id),
    }
  );

  const approveMutation = useMutation(() => propertiesAPI.approveProperty(id), {
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-properties']);
      queryClient.invalidateQueries(['admin-property', id]);
      showSuccess('Property approved successfully');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to approve property');
    },
  });

  const rejectMutation = useMutation(
    (reason) => propertiesAPI.rejectProperty(id, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pending-properties']);
        showSuccess('Property rejected');
        navigate(-1);
      },
      onError: (err) => {
        showError(err.response?.data?.message || 'Failed to reject property');
      },
    }
  );

  const handleReject = () => {
    const reason = window.prompt('Please provide a reason for rejection');
    if (!reason) return;
    rejectMutation.mutate(reason);
  };

  const locationLabel = useMemo(() => {
    if (!property) return 'N/A';

    if (
      property.useNewLocationStructure ||
      property.governorate_ref ||
      property.city_ref ||
      property.area_ref
    ) {
      const segments = [
        property.area_ref?.name,
        property.city_ref?.name,
        property.governorate_ref?.name,
      ].filter(Boolean);

      if (segments.length > 0) return segments.join(', ');
    }

    const legacySegments = [
      property.location?.address,
      property.location?.city,
      property.location?.state,
      property.location?.country,
    ].filter(Boolean);
    return legacySegments.length > 0 ? legacySegments.join(', ') : 'N/A';
  }, [property]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !property) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <p className="text-red-500 mb-4">
            {error?.response?.data?.message || 'Failed to load property.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </AdminLayout>
    );
  }

  const pending = property.approvalStatus === 'pending';

  return (
    <>
      <Helmet>
        <title>View Property | Admin</title>
      </Helmet>
      <AdminLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-500 truncate">{property.title}</span>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {property.title}
                </h1>
                {pending ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-yellow-100 text-yellow-800">
                    <FiInfo className="w-4 h-4" />
                    Pending Review
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-green-100 text-green-800 capitalize">
                    <FiCheckCircle className="w-4 h-4" />
                    {property.approvalStatus}
                  </span>
                )}
                {property.status && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 capitalize">
                    {property.status.replace('-', ' ')}
                  </span>
                )}
              </div>
              <p className="text-gray-500 max-w-2xl">{property.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/admin/properties/${property._id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <FiEdit className="w-4 h-4" />
                Edit
              </Link>
              {pending && (
                <>
                  <button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejectMutation.isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <FiX className="w-4 h-4" />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>

          {property.images?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <img
                src={property.images[0].url}
                alt={property.title}
                className="w-full h-72 object-cover rounded-2xl md:col-span-2"
              />
              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                {property.images.slice(1, 3).map((image) => (
                  <img
                    key={image.url}
                    src={image.url}
                    alt={property.title}
                    className="w-full h-32 object-cover rounded-2xl"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Key Details
              </h2>
              <div className="space-y-3 text-gray-600">
                <div className="flex items-center gap-2">
                  <FiDollarSign className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">
                    {property.price?.toLocaleString()} {property.currency}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FiHome className="w-4 h-4 text-gray-400" />
                  <span className="capitalize">{property.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiMapPin className="w-4 h-4 text-gray-400" />
                  <span>{locationLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Bedrooms</p>
                    <p className="font-semibold">
                      {property.specifications?.bedrooms ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Bathrooms</p>
                    <p className="font-semibold">
                      {property.specifications?.bathrooms ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Area</p>
                    <p className="font-semibold">
                      {property.specifications?.area}{' '}
                      {property.specifications?.areaUnit || 'sqm'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Furnished</p>
                    <p className="font-semibold capitalize">
                      {property.specifications?.furnished || 'unfurnished'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Submission Info
              </h2>
              <div className="space-y-3 text-gray-600">
                <div className="flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-gray-400" />
                  <span>
                    Submitted by{' '}
                    <strong>{property.submittedBy?.name || 'Unknown'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-4 h-4 text-gray-400" />
                  <span>
                    {new Date(property.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {property.approvalStatus !== 'pending' && (
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="w-4 h-4 text-gray-400" />
                    <span>
                      Approved by{' '}
                      <strong>{property.approvedBy?.name || 'Auto'}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default ViewProperty;


