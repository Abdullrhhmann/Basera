import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminNavbar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-gray-800 text-white sticky top-0 z-50">
      <div className="container-max">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <Link to="/admin" className="text-lg font-bold">
              Admin Panel
            </Link>
            <Link to="/admin/properties" className="text-sm text-gray-300 hover:text-white">
              Properties
            </Link>
            <Link to="/admin/compounds" className="text-sm text-gray-300 hover:text-white">
              Compounds
            </Link>
            <Link to="/admin/inquiries" className="text-sm text-gray-300 hover:text-white">
              Inquiries
            </Link>
            <Link to="/admin/leads" className="text-sm text-gray-300 hover:text-white">
              Leads
            </Link>
            <Link to="/admin/users" className="text-sm text-gray-300 hover:text-white">
              Users
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-300 hover:text-white"
            >
              View Site
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
