import React, { useState, useRef } from 'react';
import { FiUpload, FiDownload, FiX, FiCheck, FiAlertCircle, FiFileText } from '../../icons/feather';
import { bulkUploadsAPI } from '../../utils/api';
import { showSuccess, showError, showInfo } from '../../utils/sonner';
import { parseExcelFile, isExcelFile } from '../../utils/excelToJson';

const BulkUploadModal = ({ isOpen, onClose, entityType, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const entityTypeNames = {
    users: 'Users',
    properties: 'Properties',
    leads: 'Leads',
    developers: 'Developers',
    cities: 'Cities',
    launches: 'Launches'
  };

  const uploadFunctions = {
    users: bulkUploadsAPI.uploadUsers,
    properties: bulkUploadsAPI.uploadProperties,
    leads: bulkUploadsAPI.uploadLeads,
    developers: bulkUploadsAPI.uploadDevelopers,
    cities: bulkUploadsAPI.uploadCities,
    launches: bulkUploadsAPI.uploadLaunches
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isJsonFile = fileName.endsWith('.json');
    const isExcel = isExcelFile(fileName);

    if (!isJsonFile && !isExcel) {
      showError('Please select a valid JSON or Excel file (.json, .xlsx, .xls)');
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    setJsonData(null);

    try {
      if (isJsonFile) {
        // Handle JSON file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target.result);
            if (!Array.isArray(json)) {
              showError('JSON file must contain an array of records');
              setSelectedFile(null);
              return;
            }
            setJsonData(json);
          } catch (error) {
            showError('Invalid JSON file format');
            setSelectedFile(null);
          }
        };
        reader.readAsText(file);
      } else if (isExcel) {
        // Handle Excel file
        try {
          showInfo('Parsing Excel file...', 'Processing');
          const parsedData = await parseExcelFile(file, entityType);
          if (!Array.isArray(parsedData) || parsedData.length === 0) {
            showError('Excel file contains no valid data rows');
            setSelectedFile(null);
            return;
          }
          setJsonData(parsedData);
          showSuccess(`Successfully parsed ${parsedData.length} records from Excel file`);
        } catch (error) {
          console.error('Excel parsing error:', error);
          showError(error.message || 'Failed to parse Excel file');
          setSelectedFile(null);
        }
      }
    } catch (error) {
      console.error('File processing error:', error);
      showError('Failed to process file');
      setSelectedFile(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDownloadTemplate = async (format = 'json') => {
    try {
      if (format === 'excel') {
        // Download Excel template
        const response = await bulkUploadsAPI.downloadTemplateExcel(entityType);
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${entityType}-template.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showSuccess('Excel template downloaded successfully');
      } else {
        // Download JSON template
        const response = await bulkUploadsAPI.downloadTemplate(entityType);
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${entityType}-template.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showSuccess('JSON template downloaded successfully');
      }
    } catch (error) {
      console.error('Download template error:', error);
      showError('Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!jsonData) {
      showError('Please select a JSON file first');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      // Show info for large uploads
      if (jsonData.length > 100) {
        showInfo(`Uploading ${jsonData.length} records - this may take several minutes...`, 'Large Upload');
      }

      const uploadFunction = uploadFunctions[entityType];
      const response = await uploadFunction(jsonData, {
        timeout: 15 * 60 * 1000 // 15 minutes
      });

      setUploadResult(response.data);
      
      if (response.data.success) {
        const importCount = response.data.summary?.imported || 0;
        showSuccess(`${response.data.message} (${importCount} records imported)`);
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      
      // Handle timeout errors specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        setUploadResult({ 
          success: false, 
          message: 'Upload timeout - please try with smaller batches (200-300 records) or check server logs for progress' 
        });
        showError('Upload timed out. For large datasets, consider splitting into smaller batches.');
      } else {
        const errorData = error.response?.data;
        
        if (errorData) {
          setUploadResult(errorData);
          showError(errorData.message || 'Upload failed');
        } else {
          showError('Failed to upload. Please try again.');
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setJsonData(null);
    setUploadResult(null);
    setIsUploading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#131c2b]/50 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Bulk Upload {entityTypeNames[entityType]}</h2>
            <p className="text-slate-400 text-sm mt-1">Upload multiple {entityType} at once using JSON or Excel files</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <FiX className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Template Download */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FiDownload className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Download Template</h3>
                <p className="text-slate-400 text-sm mb-3">
                  Get a sample template with the correct format and example data
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleDownloadTemplate('json')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Download JSON Template
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate('excel')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Download Excel Template
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.xlsx,.xls"
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-slate-700/50 rounded-full">
                <FiUpload className="w-8 h-8 text-slate-400" />
              </div>
              
              {selectedFile ? (
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-700/50 rounded-lg">
                  <FiFileText className="w-5 h-5 text-green-400" />
                  <span className="text-white font-medium">{selectedFile.name}</span>
                  <span className="text-slate-400 text-sm">
                    ({jsonData?.length || 0} records)
                  </span>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-white font-medium mb-1">
                      Drag and drop your JSON or Excel file here
                    </p>
                    <p className="text-slate-400 text-sm">Supports .json, .xlsx, and .xls formats</p>
                    <p className="text-slate-400 text-sm">or</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Choose File
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Preview */}
          {jsonData && jsonData.length > 0 && !uploadResult && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-white font-semibold mb-3">Preview (First 3 records)</h3>
              <pre className="text-slate-300 text-xs overflow-x-auto p-3 bg-slate-900/50 rounded-lg">
                {JSON.stringify(jsonData.slice(0, 3), null, 2)}
              </pre>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`rounded-xl p-4 border ${
                uploadResult.success 
                  ? 'bg-green-500/10 border-green-500/50' 
                  : 'bg-red-500/10 border-red-500/50'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    uploadResult.success ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {uploadResult.success ? (
                      <FiCheck className="w-6 h-6 text-green-400" />
                    ) : (
                      <FiAlertCircle className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-2 ${
                      uploadResult.success ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {uploadResult.message}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-slate-400">Total:</span>
                        <span className="ml-2 text-white font-medium">{uploadResult.summary?.total || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Imported:</span>
                        <span className="ml-2 text-green-400 font-medium">{uploadResult.summary?.imported || 0}</span>
                      </div>
                      {uploadResult.summary?.skipped > 0 && (
                        <div>
                          <span className="text-slate-400">Skipped:</span>
                          <span className="ml-2 text-yellow-400 font-medium">{uploadResult.summary.skipped}</span>
                        </div>
                      )}
                      {uploadResult.summary?.failed > 0 && (
                        <div>
                          <span className="text-slate-400">Failed:</span>
                          <span className="ml-2 text-red-400 font-medium">{uploadResult.summary.failed}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/50">
                  <h4 className="text-red-400 font-semibold mb-3">Validation Errors</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadResult.errors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="bg-slate-900/50 rounded-lg p-3 text-sm">
                        <div className="text-slate-400 mb-1">Record {error.index + 1}:</div>
                        <ul className="list-disc list-inside text-red-400 space-y-1">
                          {error.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {uploadResult.errors.length > 10 && (
                      <p className="text-slate-400 text-sm text-center">
                        ... and {uploadResult.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Skipped Records */}
              {uploadResult.skippedRecords && uploadResult.skippedRecords.length > 0 && (
                <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/50">
                  <h4 className="text-yellow-400 font-semibold mb-3">Skipped Records</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadResult.skippedRecords.slice(0, 5).map((skip, idx) => (
                      <div key={idx} className="bg-slate-900/50 rounded-lg p-3 text-sm">
                        <div className="text-yellow-400">{skip.reason}</div>
                      </div>
                    ))}
                    {uploadResult.skippedRecords.length > 5 && (
                      <p className="text-slate-400 text-sm text-center">
                        ... and {uploadResult.skippedRecords.length - 5} more skipped
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Image Warnings */}
              {uploadResult.imageWarnings && uploadResult.imageWarnings.length > 0 && (
                <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/50">
                  <h4 className="text-yellow-400 font-semibold mb-3">Image Warnings</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadResult.imageWarnings.slice(0, 5).map((warn, idx) => (
                      <div key={idx} className="bg-slate-900/50 rounded-lg p-3 text-sm">
                        <div className="text-yellow-400">{warn.reason}</div>
                      </div>
                    ))}
                    {uploadResult.imageWarnings.length > 5 && (
                      <p className="text-slate-400 text-sm text-center">
                        ... and {uploadResult.imageWarnings.length - 5} more warnings
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            {uploadResult ? 'Close' : 'Cancel'}
          </button>
          {!uploadResult && (
            <button
              onClick={handleUpload}
              disabled={!jsonData || isUploading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FiUpload className="w-4 h-4" />
                  Upload {entityTypeNames[entityType]}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;

