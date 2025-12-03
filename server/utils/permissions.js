// Role-based permissions system

const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SALES_MANAGER: 'sales_manager',
  SALES_TEAM_LEADER: 'sales_team_leader',
  SALES_AGENT: 'sales_agent'
};

const HIERARCHY = {
  [ROLES.ADMIN]: 1,
  [ROLES.SALES_MANAGER]: 2,
  [ROLES.SALES_TEAM_LEADER]: 3,
  [ROLES.SALES_AGENT]: 4,
  [ROLES.USER]: 5
};

const PERMISSIONS = {
  // User Management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  
  // Property Management
  MANAGE_PROPERTIES: 'manage_properties',
  VIEW_PROPERTIES: 'view_properties',
  CREATE_PROPERTIES: 'create_properties',
  EDIT_PROPERTIES: 'edit_properties',
  DELETE_PROPERTIES: 'delete_properties',
  APPROVE_PROPERTIES: 'approve_properties',
  
  // Launch Management
  MANAGE_LAUNCHES: 'manage_launches',
  VIEW_LAUNCHES: 'view_launches',
  CREATE_LAUNCHES: 'create_launches',
  EDIT_LAUNCHES: 'edit_launches',
  DELETE_LAUNCHES: 'delete_launches',
  
  // Developer Management
  MANAGE_DEVELOPERS: 'manage_developers',
  VIEW_DEVELOPERS: 'view_developers',
  CREATE_DEVELOPERS: 'create_developers',
  EDIT_DEVELOPERS: 'edit_developers',
  DELETE_DEVELOPERS: 'delete_developers',
  
  // Inquiry Management
  MANAGE_INQUIRIES: 'manage_inquiries',
  VIEW_INQUIRIES: 'view_inquiries',
  
  // Dashboard Access
  ACCESS_DASHBOARD: 'access_dashboard',
  VIEW_ALL_STATS: 'view_all_stats',
  VIEW_OWN_STATS: 'view_own_stats',
  
  // Bulk Operations
  BULK_UPLOAD: 'bulk_upload',
  BULK_DELETE: 'bulk_delete'
};

// Permission map for each role
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Full access to everything
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_USERS,
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.DELETE_USERS,
    
    PERMISSIONS.MANAGE_PROPERTIES,
    PERMISSIONS.VIEW_PROPERTIES,
    PERMISSIONS.CREATE_PROPERTIES,
    PERMISSIONS.EDIT_PROPERTIES,
    PERMISSIONS.DELETE_PROPERTIES,
    PERMISSIONS.APPROVE_PROPERTIES,
    
    PERMISSIONS.MANAGE_LAUNCHES,
    PERMISSIONS.VIEW_LAUNCHES,
    PERMISSIONS.CREATE_LAUNCHES,
    PERMISSIONS.EDIT_LAUNCHES,
    PERMISSIONS.DELETE_LAUNCHES,
    
    PERMISSIONS.MANAGE_DEVELOPERS,
    PERMISSIONS.VIEW_DEVELOPERS,
    PERMISSIONS.CREATE_DEVELOPERS,
    PERMISSIONS.EDIT_DEVELOPERS,
    PERMISSIONS.DELETE_DEVELOPERS,
    
    PERMISSIONS.MANAGE_INQUIRIES,
    PERMISSIONS.VIEW_INQUIRIES,
    
    PERMISSIONS.ACCESS_DASHBOARD,
    PERMISSIONS.VIEW_ALL_STATS,
    
    PERMISSIONS.BULK_UPLOAD,
    PERMISSIONS.BULK_DELETE
  ],
  
  [ROLES.SALES_MANAGER]: [
    // All except user management and bulk operations
    PERMISSIONS.MANAGE_PROPERTIES,
    PERMISSIONS.VIEW_PROPERTIES,
    PERMISSIONS.CREATE_PROPERTIES,
    PERMISSIONS.EDIT_PROPERTIES,
    PERMISSIONS.DELETE_PROPERTIES,
    PERMISSIONS.APPROVE_PROPERTIES,
    
    PERMISSIONS.MANAGE_LAUNCHES,
    PERMISSIONS.VIEW_LAUNCHES,
    PERMISSIONS.CREATE_LAUNCHES,
    PERMISSIONS.EDIT_LAUNCHES,
    PERMISSIONS.DELETE_LAUNCHES,
    
    PERMISSIONS.MANAGE_DEVELOPERS,
    PERMISSIONS.VIEW_DEVELOPERS,
    PERMISSIONS.CREATE_DEVELOPERS,
    PERMISSIONS.EDIT_DEVELOPERS,
    PERMISSIONS.DELETE_DEVELOPERS,
    
    PERMISSIONS.MANAGE_INQUIRIES,
    PERMISSIONS.VIEW_INQUIRIES,
    
    PERMISSIONS.ACCESS_DASHBOARD,
    PERMISSIONS.VIEW_ALL_STATS
  ],
  
  [ROLES.SALES_TEAM_LEADER]: [
    // Property management and approval
    PERMISSIONS.MANAGE_PROPERTIES,
    PERMISSIONS.VIEW_PROPERTIES,
    PERMISSIONS.CREATE_PROPERTIES,
    PERMISSIONS.EDIT_PROPERTIES,
    PERMISSIONS.DELETE_PROPERTIES,
    PERMISSIONS.APPROVE_PROPERTIES,
    
    PERMISSIONS.VIEW_LAUNCHES,
    
    PERMISSIONS.ACCESS_DASHBOARD,
    PERMISSIONS.VIEW_ALL_STATS
  ],
  
  [ROLES.SALES_AGENT]: [
    // Limited property access
    PERMISSIONS.VIEW_PROPERTIES,
    PERMISSIONS.CREATE_PROPERTIES, // Will be pending approval
    PERMISSIONS.EDIT_PROPERTIES, // Own properties only
    
    PERMISSIONS.VIEW_LAUNCHES,
    
    PERMISSIONS.ACCESS_DASHBOARD,
    PERMISSIONS.VIEW_OWN_STATS
  ],
  
  [ROLES.USER]: [
    // No admin permissions
  ]
};

/**
 * Check if a user has a specific permission
 * @param {Object} user - User object with role property
 * @param {String} permission - Permission to check
 * @returns {Boolean}
 */
const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
};

/**
 * Check if a user has all of the specified permissions
 * @param {Object} user - User object with role property
 * @param {Array} permissions - Array of permissions to check
 * @returns {Boolean}
 */
const hasAllPermissions = (user, permissions) => {
  if (!user || !user.role) return false;
  
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Check if a user has any of the specified permissions
 * @param {Object} user - User object with role property
 * @param {Array} permissions - Array of permissions to check
 * @returns {Boolean}
 */
const hasAnyPermission = (user, permissions) => {
  if (!user || !user.role) return false;
  
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Get user's hierarchy level
 * @param {Object} user - User object with role property
 * @returns {Number}
 */
const getUserHierarchy = (user) => {
  if (!user || !user.role) return 5; // Lowest hierarchy
  return HIERARCHY[user.role] || 5;
};

/**
 * Check if user has sufficient hierarchy level
 * @param {Object} user - User object with role property
 * @param {Number} requiredHierarchy - Required hierarchy level (lower number = higher authority)
 * @returns {Boolean}
 */
const hasHierarchyLevel = (user, requiredHierarchy) => {
  const userHierarchy = getUserHierarchy(user);
  return userHierarchy <= requiredHierarchy;
};

/**
 * Check if user can manage another user
 * @param {Object} manager - User trying to manage
 * @param {Object} target - User being managed
 * @returns {Boolean}
 */
const canManageUser = (manager, target) => {
  const managerHierarchy = getUserHierarchy(manager);
  const targetHierarchy = getUserHierarchy(target);
  
  // Can manage users with lower or equal hierarchy (higher or equal number)
  // Admins (hierarchy 1) can manage other admins
  return managerHierarchy <= targetHierarchy;
};

/**
 * Check if user is an admin-type role (any admin hierarchy)
 * @param {Object} user - User object with role property
 * @returns {Boolean}
 */
const isAdminRole = (user) => {
  if (!user || !user.role) return false;
  return [
    ROLES.ADMIN,
    ROLES.SALES_MANAGER,
    ROLES.SALES_TEAM_LEADER,
    ROLES.SALES_AGENT
  ].includes(user.role);
};

/**
 * Get all permissions for a user
 * @param {Object} user - User object with role property
 * @returns {Array}
 */
const getUserPermissions = (user) => {
  if (!user || !user.role) return [];
  return ROLE_PERMISSIONS[user.role] || [];
};

/**
 * Get role display name
 * @param {String} role - Role identifier
 * @returns {String}
 */
const getRoleDisplayName = (role) => {
  const displayNames = {
    [ROLES.ADMIN]: 'Admin',
    [ROLES.SALES_MANAGER]: 'Sales Manager',
    [ROLES.SALES_TEAM_LEADER]: 'Sales Team Leader',
    [ROLES.SALES_AGENT]: 'Sales Agent',
    [ROLES.USER]: 'User'
  };
  
  return displayNames[role] || 'Unknown';
};

module.exports = {
  ROLES,
  HIERARCHY,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getUserHierarchy,
  hasHierarchyLevel,
  canManageUser,
  isAdminRole,
  getUserPermissions,
  getRoleDisplayName
};

