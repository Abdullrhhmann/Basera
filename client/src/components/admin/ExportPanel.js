import React, { useState, useCallback } from 'react';
import {
  FiDownload,
  FiFileText,
  FiDatabase,
  FiX,
  FiCheck,
  FiFilter,
  FiSettings,
  FiBarChart2
} from '../../icons/feather';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { showSuccess, showError } from '../../utils/sonner';

// Configuration constants
const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', description: 'Comma-separated values', icon: '📄' },
  { value: 'excel', label: 'Excel', description: 'XLSX format', icon: '📊' },
  { value: 'pdf', label: 'PDF', description: 'Portable document', icon: '📋' },
  { value: 'json', label: 'JSON', description: 'JavaScript object notation', icon: '⚙️' },
  { value: 'xml', label: 'XML', description: 'Extensible markup language', icon: '🔖' },
  { value: 'txt', label: 'TXT', description: 'Plain text format', icon: '📝' }
];

const DATA_TYPES = [
  { value: 'properties', label: 'Properties', icon: '🏠', color: 'blue' },
  { value: 'leads', label: 'Leads', icon: '🎯', color: 'green' },
  { value: 'inquiries', label: 'Inquiries', icon: '💬', color: 'purple' },
  { value: 'users', label: 'Users', icon: '👥', color: 'orange' }
];

// Mock data for different types
const MOCK_DATA = {
  properties: [
    {
      id: 1,
      title: 'Luxury Villa in Dubai Marina',
      type: 'Villa',
      status: 'available',
      price: 2500000,
      bedrooms: 4,
      bathrooms: 3,
      area: 3000,
      location: 'Dubai Marina',
      createdAt: '2024-01-15',
      agent: 'Ahmed Hassan'
    },
    {
      id: 2,
      title: 'Modern Apartment in JLT',
      type: 'Apartment',
      status: 'sold',
      price: 1800000,
      bedrooms: 2,
      bathrooms: 2,
      area: 1200,
      location: 'Jumeirah Lake Towers',
      createdAt: '2024-01-10',
      agent: 'Sarah Ahmed'
    }
  ],
  leads: [
    {
      id: 1,
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+971501234567',
      source: 'Website',
      status: 'hot',
      budget: 2000000,
      preferredLocation: 'Dubai Marina',
      createdAt: '2024-01-20'
    }
  ],
  inquiries: [
    {
      id: 1,
      name: 'Maria Garcia',
      email: 'maria@example.com',
      phone: '+971507654321',
      propertyTitle: 'Luxury Villa in Dubai Marina',
      status: 'new',
      priority: 'high',
      message: 'Interested in viewing this property',
      createdAt: '2024-01-22'
    }
  ],
  users: [
    {
      id: 1,
      name: 'Ahmed Hassan',
      email: 'ahmed@basira.com',
      role: 'agent',
      status: 'active',
      joinDate: '2023-06-15',
      phone: '+971501234567'
    }
  ]
};

const ExportPanel = ({
  isOpen,
  onClose,
  data = MOCK_DATA,
  title = "Export Dashboard Data"
}) => {
  const [selectedDataType, setSelectedDataType] = useState('properties');
  const [selectedFormats, setSelectedFormats] = useState(['csv']);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [statusFilter, _setStatusFilter] = useState('');

  // Enhanced data types with counts - handle different data structures
  const dataTypes = DATA_TYPES.map(type => {
    const typeData = data[type.value];
    let count = 0;

    if (Array.isArray(typeData)) {
      count = typeData.length;
    } else if (typeData && typeof typeData === 'object') {
      // Handle cases where data might be an object with different structure
      count = Object.keys(typeData).length;
    } else if (typeData === null || typeData === undefined) {
      count = 0;
    } else {
      count = 0;
    }

    return {
      ...type,
      count: count
    };
  });

  // Enhanced export formats with icons
  const exportFormats = EXPORT_FORMATS;

  // Utility functions for data conversion
  const convertToCSV = useCallback((data) => {
    if (!data || data.length === 0) return '';

    // Helper function to format values for CSV
    const formatValue = (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') {
        // Handle nested objects
        if (value.name) return value.name;
        if (value.title) return value.title;
        if (value.email) return value.email;
        if (value.city) return value.city;
        if (value.phone) return value.phone;
        // For other objects, stringify but clean it up
        return JSON.stringify(value).replace(/"/g, '""');
      }
      return String(value);
    };

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = formatValue(row[header]);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }, []);

  const convertToJSON = useCallback((data) => {
    return JSON.stringify(data, null, 2);
  }, []);

  const convertToXML = useCallback((data) => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<${selectedDataType}>\n`;

    data.forEach((item, index) => {
      xml += `  <record_${index + 1}>\n`;
      headers.forEach(header => {
        const value = item[header];
        xml += `    <${header}>${typeof value === 'object' ? JSON.stringify(value) : value}</${header}>\n`;
      });
      xml += `  </record_${index + 1}>\n`;
    });

    xml += `</${selectedDataType}>`;
    return xml;
  }, [selectedDataType]);

  const convertToTXT = useCallback((data) => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    let txt = `${selectedDataType.toUpperCase()} EXPORT\n`;
    txt += '='.repeat(50) + '\n\n';

    data.forEach((item, index) => {
      txt += `Record ${index + 1}:\n`;
      txt += '-'.repeat(20) + '\n';
      headers.forEach(header => {
        txt += `${header}: ${item[header]}\n`;
      });
      txt += '\n';
    });

    return txt;
  }, [selectedDataType]);

  const generatePDF = useCallback(async (data) => {
    // Create PDF in landscape mode for maximum width utilization
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const leftMargin = 10;
    const rightMargin = 10;
    const topMargin = 15;
    const bottomMargin = 15;
    const usableWidth = pageWidth - leftMargin - rightMargin;
    let currentY = topMargin;

    // Helper function to format data for display
    const formatValue = (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') {
        if (value.name) return value.name;
        if (value.title) return value.title;
        if (value.email) return value.email;
        if (value.city) return value.city;
        if (value.phone) return value.phone;
        if (value.location && typeof value.location === 'object') {
          return value.location.city || value.location.address || JSON.stringify(value.location);
        }
        return JSON.stringify(value).replace(/"/g, '');
      }
      return String(value);
    };

    // Professional header with company branding
    pdf.setFillColor(41, 98, 255);
    pdf.rect(0, 0, pageWidth, 20, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BASIRA REAL ESTATE', leftMargin, 14);

    // Report title section
    currentY = 30;
    pdf.setTextColor(41, 98, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${selectedDataType.toUpperCase()} REPORT`, leftMargin, currentY);
    currentY += 15;

    // Report metadata
    pdf.setTextColor(80, 80, 80);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, leftMargin, currentY);
    pdf.text(`Total Records: ${data.length}`, pageWidth - rightMargin, currentY, { align: 'right' });
    currentY += 12;

    if (data.length === 0) {
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text('No data available for export', leftMargin, currentY);
      return pdf;
    }

    // Get headers and prepare data
    let filteredHeaders = [];

    // Special handling for leads - only include specific fields
    if (selectedDataType === 'leads') {
      const leadFields = ['name', 'email', 'phone', 'requiredService', 'propertyType', 'purpose', 'dateApplied'];
      filteredHeaders = leadFields.filter(field => data[0] && data[0].hasOwnProperty(field));
    } else {
      // For other data types, use the existing logic
      const rawHeaders = Object.keys(data[0] || {});
      const headersToExclude = ['_id', 'id', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'modifiedAt', 'modified_at', 'lastModified', 'last_modified', 'timestamp', 'updated', 'modified', 'dateCreated', 'dateModified', 'createdDate', 'updatedDate', 'lastUpdated', 'dateUpdated', '__v'];
      const imageFields = ['image', 'images', 'photo', 'photos', 'picture', 'pictures', 'avatar', 'logo', 'thumbnail', 'imageUrl', 'image_url', 'photoUrl', 'photo_url', 'pictureUrl', 'picture_url', 'img', 'imgUrl', 'img_url'];
      const allFieldsToExclude = [...headersToExclude, ...imageFields];
      filteredHeaders = rawHeaders.filter(header => !allFieldsToExclude.includes(header.toLowerCase()));
    }

    const headers = filteredHeaders.map(header => {
      return header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    });

    // NEW APPROACH: Dynamic column width calculation with intelligent distribution
    const calculateColumnWidths = () => {
      const minColWidth = 40; // Minimum width for any column
      const maxColWidth = 60; // Maximum width for any column

      // Analyze content to determine optimal widths
      const contentAnalysis = filteredHeaders.map((header, index) => {
        const headerWidth = Math.min(header.length * 3.5, maxColWidth);

        // Sample first 10 rows to analyze content width
        const sampleSize = Math.min(10, data.length);
        const sampleWidths = [];

        for (let i = 0; i < sampleSize; i++) {
          const value = formatValue(data[i][header]);
          const contentWidth = Math.min(value.length * 2.8, maxColWidth);
          sampleWidths.push(contentWidth);
        }

        const avgContentWidth = sampleWidths.reduce((sum, w) => sum + w, 0) / sampleWidths.length;
        const optimalWidth = Math.max(headerWidth, avgContentWidth, minColWidth);

        return {
          header,
          index,
          optimalWidth: Math.min(optimalWidth, maxColWidth),
          maxContentWidth: Math.max(...sampleWidths)
        };
      });

      // Calculate total required width
      const totalRequiredWidth = contentAnalysis.reduce((sum, col) => sum + col.optimalWidth, 0);

      if (totalRequiredWidth <= usableWidth) {
        // Enough space - use optimal widths
        return contentAnalysis.map(col => col.optimalWidth);
      } else {
        // Need compression - distribute proportionally
        const compressionRatio = usableWidth / totalRequiredWidth;
        return contentAnalysis.map(col => Math.max(col.optimalWidth * compressionRatio, minColWidth));
      }
    };

    const columnWidths = calculateColumnWidths();

    // Advanced table rendering system
    const renderTable = () => {
      const rowHeight = 8;
      const headerHeight = 10;

      // Render headers
      pdf.setFillColor(41, 98, 255);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);

      // Header background
      pdf.rect(leftMargin, currentY - 3, usableWidth, headerHeight, 'F');

      // Header text - centered in columns
      let currentX = leftMargin;
      headers.forEach((header, index) => {
        const colWidth = columnWidths[index];
        const textWidth = pdf.getTextWidth(header);
        const textX = currentX + (colWidth - textWidth) / 2;

        pdf.text(header, textX, currentY + 4);
        currentX += colWidth;
      });
      currentY += headerHeight + 2;

      // Render data rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.setTextColor(30, 30, 30);

      data.slice(0, 100).forEach((row, rowIndex) => {
        // Check if we need a new page
        if (currentY > pageHeight - bottomMargin - 20) {
          pdf.addPage();
          currentY = topMargin + 15; // Reset Y position for new page

          // Re-render headers on new page
          pdf.setFillColor(41, 98, 255);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);

          currentX = leftMargin;
          pdf.rect(leftMargin, currentY - 3, usableWidth, headerHeight, 'F');

          headers.forEach((header, index) => {
            const colWidth = columnWidths[index];
            const textWidth = pdf.getTextWidth(header);
            const textX = currentX + (colWidth - textWidth) / 2;

            pdf.text(header, textX, currentY + 4);
            currentX += colWidth;
          });
          currentY += headerHeight + 2;

          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(30, 30, 30);
        }

        // Alternate row background for better readability
        if (rowIndex % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          currentX = leftMargin;
          columnWidths.forEach(colWidth => {
            pdf.rect(currentX, currentY - 2, colWidth, rowHeight, 'F');
            currentX += colWidth;
          });
        }

        // Render cell data with intelligent text handling
        currentX = leftMargin;

        filteredHeaders.forEach((header, colIndex) => {
          const value = formatValue(row[header]);
          const colWidth = columnWidths[colIndex];

          // Center all text values in their columns with consistent spacing
          let displayValue = value;
          let textX;

          // Handle text truncation for very narrow columns only
          if (colWidth < 25) {
            // Very narrow column - minimal truncation
            const maxLength = Math.floor(colWidth / 2.2);
            if (value.length > maxLength) {
              displayValue = value.substring(0, maxLength - 1) + '.';
            }
          } else if (colWidth < 35) {
            // Narrow column - moderate truncation
            const maxLength = Math.floor(colWidth / 2.8);
            if (value.length > maxLength) {
              displayValue = value.substring(0, maxLength - 2) + '..';
            }
          }

          // Always center the text in the column
          const textWidth = pdf.getTextWidth(displayValue);
          textX = currentX + (colWidth - textWidth) / 2;

          // Ensure text doesn't go outside column boundaries
          textX = Math.max(currentX + 2, Math.min(textX, currentX + colWidth - 2));

          pdf.text(displayValue, textX, currentY + 4);
          currentX += colWidth;
        });

        currentY += rowHeight;
      });
    };

    // Execute table rendering
    renderTable();

    // Professional footer
    const footerY = pageHeight - 10;
    pdf.setDrawColor(41, 98, 255);
    pdf.setLineWidth(0.5);
    pdf.line(leftMargin, footerY - 3, pageWidth - rightMargin, footerY - 3);

    pdf.setFontSize(7);
    pdf.setTextColor(80, 80, 80);
    pdf.text(`Confidential Business Report | Basira Real Estate Dashboard | Generated ${new Date().toLocaleString()}`, leftMargin, footerY);
    pdf.text(`Page ${pdf.getCurrentPageInfo().pageNumber} | Total Records: ${data.length}`, pageWidth - rightMargin, footerY, { align: 'right' });

    return pdf;
  }, [selectedDataType]);

  // Main export handler
  const handleExport = useCallback(async () => {
    if (selectedFormats.length === 0) {
      showError('Please select at least one export format');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Get the raw data for the selected type
      const rawData = data[selectedDataType];

      // Handle different data structures
      let exportData = [];
      if (Array.isArray(rawData)) {
        exportData = rawData;
      } else if (rawData && typeof rawData === 'object') {
        // If it's an object, convert to array of values
        exportData = Object.values(rawData);
      } else {
        exportData = [];
      }

      // Apply filters if specified
      if (dateRange.start || dateRange.end || statusFilter) {
        exportData = exportData.filter(item => {
          if (!item || typeof item !== 'object') return false;

          const itemDate = new Date(item.createdAt || item.date || item.joinDate || item.created_at);
          const startDate = dateRange.start ? new Date(dateRange.start) : null;
          const endDate = dateRange.end ? new Date(dateRange.end) : null;

          const dateMatch = (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);
          const statusMatch = !statusFilter || item.status === statusFilter;

          return dateMatch && statusMatch;
        });
      }

      if (exportData.length === 0) {
        showError(`No ${selectedDataType} data to export after applying filters`);
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `${selectedDataType}_${timestamp}`;

      setExportProgress(25);

      // Export each selected format
      for (let i = 0; i < selectedFormats.length; i++) {
        const format = selectedFormats[i];
        const progress = 25 + (i / selectedFormats.length) * 50;

        switch (format) {
          case 'csv':
            const csvContent = convertToCSV(exportData);
            const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            saveAs(csvBlob, `${baseFilename}.csv`);
            break;

          case 'excel':
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, selectedDataType);
            XLSX.writeFile(wb, `${baseFilename}.xlsx`);
            break;

          case 'pdf':
            const pdf = await generatePDF(exportData);
            pdf.save(`${baseFilename}.pdf`);
            break;

          case 'json':
            const jsonContent = convertToJSON(exportData);
            const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
            saveAs(jsonBlob, `${baseFilename}.json`);
            break;

          case 'xml':
            const xmlContent = convertToXML(exportData);
            const xmlBlob = new Blob([xmlContent], { type: 'application/xml' });
            saveAs(xmlBlob, `${baseFilename}.xml`);
            break;

          case 'txt':
            const txtContent = convertToTXT(exportData);
            const txtBlob = new Blob([txtContent], { type: 'text/plain' });
            saveAs(txtBlob, `${baseFilename}.txt`);
            break;

          default:
            console.warn(`Unsupported format: ${format}`);
        }

        setExportProgress(progress);
      }

      setExportProgress(100);
      showSuccess(`Successfully exported ${selectedDataType} in ${selectedFormats.length} format(s)`);

    } catch (error) {
      console.error('Export error:', error);
      showError('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [selectedDataType, selectedFormats, data, dateRange, statusFilter, convertToCSV, convertToJSON, convertToXML, convertToTXT, generatePDF]);

  const handleFormatToggle = (format) => {
    setSelectedFormats(prev =>
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#131c2b] bg-opacity-70 flex items-center justify-center z-50 p-3 animate-in fade-in duration-200">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-auto transform transition-all border border-slate-700/50" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}} onMouseEnter={(e) => {e.target.style.scrollbarWidth = 'none'; e.target.style.msOverflowStyle = 'none';}}>
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 px-6 py-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-full">
                <FiDownload className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                <p className="text-blue-100 text-xs mt-1">Export your data in multiple formats with professional styling</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all duration-200 transform hover:scale-105"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-slate-800/30">
          {/* Export Progress */}
          {isExporting && (
            <div className="mb-6 p-5 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                  <span className="text-lg font-semibold text-white">Exporting Data...</span>
                </div>
                <span className="text-lg font-bold text-blue-400">{Math.round(exportProgress)}%</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: `${exportProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white bg-opacity-30 animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Data Type Selection */}
            <div className="xl:col-span-1">
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl p-4 border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg mr-2">
                    <FiDatabase className="w-4 h-4 text-blue-400" />
                  </div>
                  Data Source
                </h3>

                <div className="space-y-4">
                  {dataTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedDataType(type.value)}
                      className={`w-full group relative p-5 rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] ${
                        selectedDataType === type.value
                          ? 'border-blue-500 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white shadow-lg'
                          : 'border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-full flex-shrink-0 ${
                            selectedDataType === type.value
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-700/50 text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-400'
                          }`}>
                            <span className="text-2xl">{type.icon}</span>
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <div className="font-semibold text-base truncate text-white">{type.label}</div>
                            <div className={`text-sm ${
                              selectedDataType === type.value ? 'text-blue-400' : 'text-slate-400'
                            }`}>
                              {type.count} records
                            </div>
                          </div>
                        </div>
                        {selectedDataType === type.value && (
                          <div className="absolute -top-1 -right-1">
                            <div className="bg-green-500 rounded-full p-1.5">
                              <FiCheck className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Enhanced Filters */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      showFilters ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FiFilter className="w-5 h-5" />
                      <span className="font-medium">Advanced Filters</span>
                    </div>
                    <FiSettings className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </button>

                  {showFilters && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4 animate-in slide-in-from-top duration-200">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          📅 Date Range
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          />
                          <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div className="xl:col-span-3">
              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <div className="p-1.5 bg-green-100 rounded-lg mr-2">
                    <FiFileText className="w-4 h-4 text-green-600" />
                  </div>
                  Export Formats
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {exportFormats.map(format => (
                    <button
                      key={format.value}
                      onClick={() => handleFormatToggle(format.value)}
                      className={`group relative p-4 border-2 rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${
                        selectedFormats.includes(format.value)
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 text-blue-900 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`text-3xl mb-3 ${selectedFormats.includes(format.value) ? 'animate-bounce' : ''}`}>
                          {format.icon}
                        </div>
                        <div className="font-bold text-base mb-1">{format.label}</div>
                        <div className="text-xs text-gray-500 leading-tight">{format.description}</div>
                      </div>
                      {selectedFormats.includes(format.value) && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                          <FiCheck className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Export Button */}
                <div className="mt-6">
                  <button
                    onClick={handleExport}
                    disabled={isExporting || selectedFormats.length === 0}
                    className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white py-3 px-6 rounded-xl font-bold text-base hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                  >
                    <FiDownload className="w-5 h-5" />
                    <span>
                      {isExporting
                        ? 'Exporting...'
                        : `Export ${selectedFormats.length} Format${selectedFormats.length > 1 ? 's' : ''}`
                      }
                    </span>
                  </button>

                  {selectedFormats.length > 0 && !isExporting && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <div className="text-xs font-semibold text-green-800 mb-2 flex items-center">
                        <FiBarChart2 className="w-4 h-4 mr-1" />
                        Selected Formats:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedFormats.map(format => (
                          <span
                            key={format}
                            className="px-2 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200"
                          >
                            {format.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
