import React from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiEdit, FiTrash2, FiCalendar, FiUser, FiMail } from '../../icons/feather';

const DataTable = ({ 
  title, 
  data = [], 
  columns = [], 
  loading = false, 
  error = null,
  emptyMessage = "No data found",
  viewPath,
  editPath,
  onDelete,
  onStatusChange,
  showActions = true
}) => {
  if (loading) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-600 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <div className="text-center text-red-400">
          <p>Error loading {title.toLowerCase()}</p>
          <p className="text-sm text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="text-center text-slate-400 py-8">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/60">
            <tr>
              {columns.map((column, index) => (
                <th 
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
              {showActions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {(Array.isArray(data) ? data : []).slice(0, 5).map((item, index) => (
              <tr key={item._id || index} className="hover:bg-slate-800/40">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-slate-200">
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {viewPath && (
                        <Link
                          to={viewPath(item._id)}
                          className="text-blue-400 hover:text-blue-300"
                          title="View"
                        >
                          <FiEye className="w-4 h-4" />
                        </Link>
                      )}
                      {editPath && (
                        <Link
                          to={editPath(item._id)}
                          className="text-green-400 hover:text-green-300"
                          title="Edit"
                        >
                          <FiEdit className="w-4 h-4" />
                        </Link>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item._id, item.title || item.name)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {Array.isArray(data) && data.length > 5 && (
        <div className="px-6 py-3 bg-slate-800/60 border-t border-slate-700/50">
          <Link
            to={viewPath ? viewPath() : '#'}
            className="text-sm text-blue-400 hover:text-blue-300 font-medium"
          >
            View all {Array.isArray(data) ? data.length : 0} items →
          </Link>
        </div>
      )}
    </div>
  );
};

export default DataTable;
