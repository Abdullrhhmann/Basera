import * as XLSX from 'xlsx';

/**
 * Sets a nested property value in an object using dot notation
 * @param {Object} obj - Target object
 * @param {String} path - Dot-separated path (e.g., 'location.city')
 * @param {*} value - Value to set
 */
const setNestedProperty = (obj, path, value) => {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  const lastKey = keys[keys.length - 1];
  if (value !== null && value !== undefined && value !== '') {
    current[lastKey] = value;
  }
};

/**
 * Parse a comma-separated string into an array
 * @param {String} str - Comma-separated string
 * @returns {Array} Array of trimmed strings
 */
const parseArray = (str) => {
  if (!str || typeof str !== 'string') return [];
  return str.split(',').map(item => item.trim()).filter(item => item.length > 0);
};

/**
 * Try to parse a JSON string, return original value if it fails
 * @param {String} str - JSON string
 * @returns {*} Parsed object or original value
 */
const tryParseJSON = (str) => {
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

/**
 * Convert Excel row to nested object based on column names
 * @param {Object} row - Flat row object from Excel
 * @param {String} entityType - Type of entity (properties, users, etc.)
 * @returns {Object} Nested object matching JSON structure
 */
const convertRowToObject = (row, entityType) => {
  const result = {};
  
  // List of fields that should be parsed as arrays (comma-separated)
  const arrayFields = {
    properties: ['features', 'amenities'],
    users: ['preferences.propertyTypes', 'preferences.locations'],
    leads: ['preferredLocation'],
    launches: ['features', 'amenities'],
    cities: [],
    developers: [],
    governorates: [],
    areas: []
  };
  
  // List of fields that should be parsed as JSON (complex objects)
  const jsonFields = {
    properties: ['images', 'nearbyFacilities', 'documents', 'video', 'virtualTour', 'investment'],
    users: ['preferences'],
    leads: ['budget', 'notes'],
    launches: ['coordinates', 'nearbyFacilities', 'paymentPlans', 'contactInfo'],
    cities: [],
    developers: [],
    governorates: [],
    areas: []
  };
  
  const arrayFieldsForType = arrayFields[entityType] || [];
  const jsonFieldsForType = jsonFields[entityType] || [];
  
  Object.keys(row).forEach(key => {
    const value = row[key];
    
    // Skip empty values
    if (value === null || value === undefined || value === '') {
      return;
    }
    
    // Check if it's a JSON field (can be either dot notation or exact match)
    const isJsonField = jsonFieldsForType.some(field => {
      if (key === field) return true;
      if (key.startsWith(field + '.')) return true;
      return false;
    });
    
    // Check if it's an array field
    const isArrayField = arrayFieldsForType.some(field => {
      if (key === field) return true;
      if (key.startsWith(field + '.')) return false; // Don't treat nested as arrays
      return false;
    });
    
    // Handle JSON fields (try parsing as JSON first)
    if (isJsonField && typeof value === 'string') {
      const parsed = tryParseJSON(value);
      if (parsed !== value) {
        // Successfully parsed JSON
        if (key.includes('.')) {
          setNestedProperty(result, key, parsed);
        } else {
          result[key] = parsed;
        }
        return;
      }
    }
    
    // Handle array fields (comma-separated)
    if (isArrayField && !key.includes('.')) {
      result[key] = parseArray(value);
      return;
    }
    
    // Handle nested properties (dot notation)
    if (key.includes('.')) {
      setNestedProperty(result, key, value);
    } else {
      // Handle special numeric conversions
      if (typeof value === 'number') {
        result[key] = value;
      } else if (typeof value === 'string') {
        // Try to convert numeric strings to numbers for certain fields
        const numericFields = ['price', 'bedrooms', 'bathrooms', 'area', 'floors', 'parking', 'startingPrice', 'annualAppreciationRate'];
        if (numericFields.includes(key) || key.includes('.')) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && isFinite(numValue)) {
            setNestedProperty(result, key, numValue);
          } else {
            setNestedProperty(result, key, value);
          }
        } else {
          // Try boolean conversion
          if (value.toLowerCase() === 'true') {
            setNestedProperty(result, key, true);
          } else if (value.toLowerCase() === 'false') {
            setNestedProperty(result, key, false);
          } else {
            setNestedProperty(result, key, value);
          }
        }
      } else {
        setNestedProperty(result, key, value);
      }
    }
  });
  
  // Post-process arrays that might be in nested structures
  if (entityType === 'properties' && result.specifications) {
    // Ensure numeric fields in specifications are numbers
    const specNumericFields = ['bedrooms', 'bathrooms', 'area', 'floors', 'parking'];
    specNumericFields.forEach(field => {
      if (result.specifications[field] !== undefined) {
        const num = parseFloat(result.specifications[field]);
        if (!isNaN(num) && isFinite(num)) {
          result.specifications[field] = num;
        }
      }
    });
  }
  
  // Handle coordinates if present as separate fields
  if (entityType === 'properties' || entityType === 'launches') {
    if (result.location && typeof result.location === 'object') {
      if (result.location.coordinates === undefined) {
        result.location.coordinates = {};
      }
      // Check if latitude/longitude are at root level and move them
      if (result['location.coordinates.latitude'] !== undefined) {
        result.location.coordinates.latitude = parseFloat(result['location.coordinates.latitude']);
        delete result['location.coordinates.latitude'];
      }
      if (result['location.coordinates.longitude'] !== undefined) {
        result.location.coordinates.longitude = parseFloat(result['location.coordinates.longitude']);
        delete result['location.coordinates.longitude'];
      }
    }
  }
  
  return result;
};

/**
 * Parse Excel file and convert to JSON array
 * @param {File} file - Excel file (.xlsx or .xls)
 * @param {String} entityType - Type of entity (properties, users, etc.)
 * @returns {Promise<Array>} Array of objects matching JSON structure
 */
export const parseExcelFile = async (file, entityType) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('Excel file contains no sheets'));
          return;
        }
        
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: null, // Default value for empty cells
          raw: false, // Convert dates to strings
        });
        
        if (!Array.isArray(jsonData) || jsonData.length === 0) {
          reject(new Error('Excel file contains no data rows'));
          return;
        }
        
        // Convert each row to nested object structure
        const convertedData = jsonData.map(row => convertRowToObject(row, entityType));
        
        resolve(convertedData);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Get file extension
 * @param {String} filename - File name
 * @returns {String} File extension
 */
export const getFileExtension = (filename) => {
  return filename.toLowerCase().split('.').pop();
};

/**
 * Check if file is Excel format
 * @param {String} filename - File name
 * @returns {Boolean} True if Excel file
 */
export const isExcelFile = (filename) => {
  const ext = getFileExtension(filename);
  return ext === 'xlsx' || ext === 'xls';
};

