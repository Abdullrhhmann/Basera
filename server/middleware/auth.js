const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');
const { hasPermission, hasHierarchyLevel, isAdminRole } = require('../utils/permissions');
const { normalizeUserRoleForClient } = require('../utils/userRoleUtils');

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...safe } = user;
  return normalizeUserRoleForClient(safe);
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = sanitizeUser(user);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!isAdminRole(req.user)) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

/**
 * Middleware to check if user has specific role(s)
 * @param {String|Array} allowedRoles - Single role or array of allowed roles
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        requiredRole: roles
      });
    }
    
    next();
  };
};

/**
 * Middleware to check if user has minimum hierarchy level
 * @param {Number} minHierarchy - Minimum hierarchy level required (lower number = higher authority)
 */
const hierarchyMiddleware = (minHierarchy) => {
  return (req, res, next) => {
    if (!hasHierarchyLevel(req.user, minHierarchy)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient authority level.',
        requiredHierarchy: minHierarchy
      });
    }
    
    next();
  };
};

/**
 * Middleware to check if user has specific permission(s)
 * @param {String|Array} requiredPermissions - Single permission or array of permissions
 * @param {Boolean} requireAll - If true, user must have all permissions. If false, any permission is sufficient.
 */
const permissionMiddleware = (requiredPermissions, requireAll = true) => {
  return (req, res, next) => {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    const hasAccess = requireAll
      ? permissions.every(permission => hasPermission(req.user, permission))
      : permissions.some(permission => hasPermission(req.user, permission));
    
    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Access denied. Required permissions not met.',
        requiredPermissions: permissions
      });
    }
    
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      
      if (user && user.isActive) {
        req.user = sanitizeUser(user);
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  roleMiddleware,
  hierarchyMiddleware,
  permissionMiddleware,
  optionalAuth
};
