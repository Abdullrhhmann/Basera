import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FiEye, FiEyeOff, FiShield } from '../../icons/feather';
import { usersAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import { useAuth } from '../../context/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/shadcn';

// Role information with hierarchy and descriptions
const ROLES = [
  { value: 'user', label: 'User', hierarchy: 5, description: 'Regular platform user' },
  { value: 'sales_agent', label: 'Sales Agent', hierarchy: 4, description: 'Can add properties (pending approval)' },
  { value: 'sales_team_leader', label: 'Sales Team Leader', hierarchy: 3, description: 'Can manage and approve properties' },
  { value: 'sales_manager', label: 'Sales Manager', hierarchy: 2, description: 'Full access except user management' },
  { value: 'admin', label: 'Admin', hierarchy: 1, description: 'Full system access' }
];

const UserForm = ({ user, onSave, onCancel, isEditing = false }) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);
  const [selectedRole, setSelectedRole] = React.useState('user');
  const [phoneCountryCode, setPhoneCountryCode] = React.useState('+20');
  const { userHierarchy, isAdminUser } = useAuth();

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'user',
      isActive: true
    }
  });

  // Initialize form with user data if editing
  useEffect(() => {
    if (user && isEditing) {
      setValue('name', user.name || '');
      setValue('email', user.email || '');
      setValue('phone', user.phone || '');
      setValue('role', user.role || 'user');
      setSelectedRole(user.role || 'user');
      setIsActive(user.isActive !== false);
    }
  }, [user, isEditing, setValue]);

  // Filter roles based on current user's hierarchy
  // Admins (hierarchy 1) can create anyone including other admins
  // Other roles can only create users with lower authority (higher hierarchy number)
  const availableRoles = ROLES.filter(role => role.hierarchy >= userHierarchy);

  const onSubmit = async (data) => {
    try {
      const userData = {
        ...data,
        phoneCountryCode,
        isActive,
        ...(isEditing ? {} : { password: data.password }) // Only include password for new users
      };

      if (isEditing) {
        await usersAPI.updateUser(user._id, userData);
        showSuccess('User updated successfully');
      } else {
        await usersAPI.createUser(userData);
        showSuccess('User created successfully');
      }

      onSave();
    } catch (error) {
      console.error('Save error:', error);
      
      // Handle validation errors from server
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        validationErrors.forEach(err => {
          showError(`${err.path}: ${err.msg}`);
        });
      } else if (error.response?.data?.message) {
        showError(error.response.data.message);
      } else {
        showError(`Failed to ${isEditing ? 'update' : 'create'} user`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter full name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
            <input
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="w-36 h-[42px] px-3 pr-8 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium cursor-pointer appearance-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%23666666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '14px'
                  }}
                >
                  <option value="+20">🇪🇬 +20</option>
                  <option value="+966">🇸🇦 +966</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+965">🇰🇼 +965</option>
                  <option value="+974">🇶🇦 +974</option>
                  <option value="+973">🇧🇭 +973</option>
                  <option value="+968">🇴🇲 +968</option>
                  <option value="+962">🇯🇴 +962</option>
                  <option value="+961">🇱🇧 +961</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                </select>
              </div>
              <input
                {...register('phone', {
                  pattern: {
                    value: /^(0[1-9][\d]{7,14}|[1-9][\d]{7,14})$/,
                    message: 'Invalid phone number'
                  }
                })}
                type="tel"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="01234567890"
              />
            </div>
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
            <p className="text-xs text-gray-500 mt-1">Enter local phone number (e.g., 01234567890)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role * <span className="text-xs text-gray-500 font-normal">(Hierarchy Level)</span>
            </label>
            <Select 
              onValueChange={(value) => {
                setValue('role', value);
                setSelectedRole(value);
              }} 
              defaultValue={user?.role || 'user'}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center gap-2">
                      <FiShield className={`w-4 h-4 ${
                        role.hierarchy === 1 ? 'text-red-500' :
                        role.hierarchy === 2 ? 'text-orange-500' :
                        role.hierarchy === 3 ? 'text-blue-500' :
                        role.hierarchy === 4 ? 'text-green-500' :
                        'text-gray-500'
                      }`} />
                      <span>{role.label}</span>
                      <span className="text-xs text-gray-500">(Level {role.hierarchy})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>}
            
            {/* Role Description */}
            {selectedRole && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{ROLES.find(r => r.value === selectedRole)?.label}:</strong>{' '}
                  {ROLES.find(r => r.value === selectedRole)?.description}
                </p>
              </div>
            )}
            
            {/* Hierarchy Validation Notice */}
            {!isAdminUser() && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                ℹ️ You can only create users with lower authority than your own level
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
            <div className="relative">
              <input
                {...register('password', { 
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <FiEyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <FiEye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>
        )}

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Active user</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Inactive users cannot log in to the system
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {isEditing ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;
