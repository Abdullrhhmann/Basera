import React, { useState } from 'react';
import { FiAlertTriangle, FiX } from '../../icons/feather';

const GovernorateDeleteModal = ({
  isOpen,
  governorate,
  counts,
  onClose,
  onConfirm,
  isLoading
}) => {
  const [selectedOption, setSelectedOption] = useState(null); // 'simple' | 'cascade'

  if (!isOpen || !governorate || !counts) return null;

  const handleConfirm = () => {
    if (selectedOption) {
      onConfirm(selectedOption);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[#131c2b] bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full border-2 border-red-500/50 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-red-500/10">
              <FiAlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Delete Governorate</h3>
              <p className="text-sm text-slate-400 mt-1">{governorate.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiX className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Counts Display */}
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
            <p className="text-sm text-slate-300 mb-3 font-medium">This governorate has:</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{counts.citiesCount}</div>
                <div className="text-xs text-slate-400 mt-1">Cities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{counts.areasCount}</div>
                <div className="text-xs text-slate-400 mt-1">Areas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{counts.propertiesCount}</div>
                <div className="text-xs text-slate-400 mt-1">Properties</div>
              </div>
            </div>
          </div>

          {/* Deletion Options */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-white mb-3">Choose deletion option:</p>

            {/* Option 1: Delete Governorate Only */}
            <label className={`block cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedOption === 'simple'
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="deleteOption"
                    value="simple"
                    checked={selectedOption === 'simple'}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    disabled={isLoading}
                    className="mt-1 w-4 h-4 text-yellow-500 bg-slate-700 border-slate-600 focus:ring-yellow-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white mb-2">Delete Governorate Only</div>
                    <div className="text-sm text-slate-400 mb-2">
                      The governorate will be deleted, but all cities and areas will remain in the database.
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                      <p className="text-xs text-yellow-300">
                        ⚠️ <strong>Warning:</strong> Cities will become orphaned (no governorate link). 
                        They will still appear in the Cities list but won't have a parent governorate.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </label>

            {/* Option 2: Cascade Delete All */}
            <label className={`block cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedOption === 'cascade'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="deleteOption"
                    value="cascade"
                    checked={selectedOption === 'cascade'}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    disabled={isLoading}
                    className="mt-1 w-4 h-4 text-red-500 bg-slate-700 border-slate-600 focus:ring-red-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white mb-2">Delete All Related Data (Cascade)</div>
                    <div className="text-sm text-slate-400 mb-2">
                      This will permanently delete the governorate and all related data.
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                      <p className="text-xs text-red-300 mb-2">
                        ⚠️ <strong>Warning:</strong> This will permanently delete:
                      </p>
                      <ul className="text-xs text-red-300 space-y-1 ml-4">
                        <li>• The governorate "{governorate.name}"</li>
                        <li>• All {counts.citiesCount} cities in this governorate</li>
                        <li>• All {counts.areasCount} areas in these cities</li>
                      </ul>
                      <p className="text-xs text-red-300 mt-2">
                        Properties ({counts.propertiesCount}) will remain but will lose their location references.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700 bg-slate-800/30">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedOption || isLoading}
            className={`px-6 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedOption === 'cascade'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Deleting...</span>
              </span>
            ) : (
              'Confirm Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GovernorateDeleteModal;

