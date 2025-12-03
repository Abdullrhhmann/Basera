import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiPlus } from '../../icons/feather';

const QuickActionCard = ({
  title,
  description,
  path,
  icon: Icon,
  color = 'bg-blue-500',
  hoverColor = 'hover:bg-blue-600',
  showAddButton = false,
  onAddClick,
  onClick,
  buttonText = 'View All'
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 min-h-[180px]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color} text-white`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">{title}</h2>
            <p className="text-sm text-gray-700">{description}</p>
          </div>
        </div>
        {showAddButton && (
          <button
            onClick={onAddClick}
            type="button"
            aria-label="Add new item"
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiPlus className="w-4 h-4" />
          </button>
        )}
      </div>

      {onClick ? (
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-2 ${color} ${hoverColor} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer`}
          style={{ minHeight: '40px', border: 'none' }}
        >
          {buttonText}
          <FiArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <Link
          to={path}
          className={`inline-flex items-center gap-2 ${color} ${hoverColor} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
        >
          {buttonText}
          <FiArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
};

export default QuickActionCard;
