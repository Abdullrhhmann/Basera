import React, { useState } from 'react';
import { FiInfo } from '../../icons/feather';

const InfoIcon = ({ title, description, className = "" }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className={`inline-flex items-center justify-center w-4 h-4 text-slate-400 hover:text-slate-300 transition-colors ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        <FiInfo className="w-4 h-4" />
      </button>
      
      {showTooltip && (
        <div className="absolute z-[9999] w-64 p-3 mt-2 text-sm text-white bg-slate-800 border border-slate-600 rounded-lg shadow-xl left-1/2 transform -translate-x-1/2">
          <div className="font-medium text-slate-200 mb-1">{title}</div>
          <div className="text-slate-300 text-xs leading-relaxed">{description}</div>
          {/* Arrow pointing up */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
        </div>
      )}
    </div>
  );
};

export default InfoIcon;
