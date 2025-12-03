const { Prisma, UserRole } = require('../prisma/generated');

const ROLE_HIERARCHY = {
  admin: 1,
  sales_manager: 2,
  sales_team_leader: 3,
  sales_agent: 4,
  user: 5,
};

const BASE_PERMISSIONS = {
  canManageUsers: false,
  canManageProperties: false,
  canApproveProperties: false,
  canManageLaunches: false,
  canManageDevelopers: false,
  canManageInquiries: false,
  canManageLeads: false,
  canManageJobs: false,
  canAccessDashboard: false,
  canBulkUpload: false,
};

const ROLE_PERMISSION_OVERRIDES = {
  admin: {
    canManageUsers: true,
    canManageProperties: true,
    canApproveProperties: true,
    canManageLaunches: true,
    canManageDevelopers: true,
    canManageInquiries: true,
    canManageLeads: true,
    canManageJobs: true,
    canAccessDashboard: true,
    canBulkUpload: true,
  },
  sales_manager: {
    canManageUsers: false,
    canManageProperties: true,
    canApproveProperties: true,
    canManageLaunches: true,
    canManageDevelopers: true,
    canManageInquiries: true,
    canManageLeads: true,
    canManageJobs: true,
    canAccessDashboard: true,
    canBulkUpload: false,
  },
  sales_team_leader: {
    canManageUsers: false,
    canManageProperties: true,
    canApproveProperties: true,
    canManageLaunches: false,
    canManageDevelopers: false,
    canManageInquiries: false,
    canManageLeads: true,
    canManageJobs: false,
    canAccessDashboard: true,
    canBulkUpload: false,
  },
  sales_agent: {
    canManageUsers: false,
    canManageProperties: true,
    canApproveProperties: false,
    canManageLaunches: false,
    canManageDevelopers: false,
    canManageInquiries: false,
    canManageLeads: false,
    canManageJobs: false,
    canAccessDashboard: true,
    canBulkUpload: false,
  },
  user: { ...BASE_PERMISSIONS },
};

const getHierarchyForRole = (role = 'user') => {
  return ROLE_HIERARCHY[role] || ROLE_HIERARCHY.user;
};

const buildPermissionsForRole = (role = 'user') => {
  return {
    ...BASE_PERMISSIONS,
    ...(ROLE_PERMISSION_OVERRIDES[role] || BASE_PERMISSIONS),
  };
};

const ACTIVITY_STATS_DEFAULT = {
  propertiesViewed: 0,
  inquiriesSent: 0,
  profileViews: 0,
  lastPropertyView: null,
  lastInquirySent: null,
};

const USER_ROLE_ENUM_KEY_BY_VALUE = Object.entries(UserRole || {}).reduce(
  (acc, [enumKey, mappedValue]) => {
    acc[mappedValue] = enumKey;
    return acc;
  },
  {}
);

const toPrismaUserRole = (role = 'user') => {
  const normalized = (role || 'user').toLowerCase();
  const enumKey = USER_ROLE_ENUM_KEY_BY_VALUE[normalized] || 'USER';
  return Prisma.UserRole?.[enumKey] || enumKey;
};

const normalizeUserRoleForClient = (userOrRole) => {
  if (!userOrRole) {
    return userOrRole;
  }

  if (typeof userOrRole === 'string') {
    const enumKey = userOrRole.toUpperCase();
    return UserRole?.[enumKey] || userOrRole.toLowerCase?.() || userOrRole;
  }

  if (typeof userOrRole === 'object' && typeof userOrRole.role === 'string') {
    const enumKey = userOrRole.role.toUpperCase();
    userOrRole.role = UserRole?.[enumKey] || userOrRole.role.toLowerCase?.() || userOrRole.role;
  }

  return userOrRole;
};

module.exports = {
  getHierarchyForRole,
  buildPermissionsForRole,
  ACTIVITY_STATS_DEFAULT,
  toPrismaUserRole,
  normalizeUserRoleForClient,
};

