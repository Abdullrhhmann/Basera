import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const RangeSlider = ({ min, max, step, value, onChange, formatLabel, className = '', histogramData = null, histogramField = 'price', useDataMax = false, useDataMin = false }) => {
  
  // Calculate actual min and max from data if useDataMax or useDataMin is true
  const actualMinMax = useMemo(() => {
    if ((useDataMax || useDataMin) && histogramData && histogramData.length > 0) {
      const values = histogramData
        .map(item => {
          if (histogramField === 'price') {
            return item.price || 0;
          } else if (histogramField === 'area') {
            return item.specifications?.area || 0;
          }
          return 0;
        })
        .filter(v => v > 0 && isFinite(v));
      
      if (values.length > 0) {
        const dataMin = Math.min(...values);
        const dataMax = Math.max(...values);
        // When useDataMin is true, use actual cheapest price (with 5% padding below)
        // When useDataMax is true, use actual most expensive price (with 10% padding above)
        // Don't clamp to hardcoded min/max when using data-based values
        const paddedMin = useDataMin ? Math.floor(dataMin * 0.95) : Math.max(min, Math.floor(dataMin * 0.95));
        const paddedMax = useDataMax ? Math.ceil(dataMax * 1.1) : Math.min(max, Math.ceil(dataMax * 1.1));
        return { min: paddedMin, max: paddedMax };
      }
    }
    return { min, max };
  }, [histogramData, histogramField, min, max, useDataMax, useDataMin]);
  
  // Effective min and max to use (actualMinMax if useDataMax/useDataMin is true, otherwise original min/max)
  // Use the exact same logic pattern for both min and max
  const effectiveMin = useMemo(() => {
    return useDataMin ? actualMinMax.min : min;
  }, [useDataMin, actualMinMax.min, min]);
  
  const effectiveMax = useMemo(() => {
    return useDataMax ? actualMinMax.max : max;
  }, [useDataMax, actualMinMax.max, max]);
  
  const [minVal, setMinVal] = useState(() => {
    // Initialize with value if provided
    if (value?.min !== undefined && value?.min !== null && value?.min !== '') {
      return Number(value.min);
    }
    // Otherwise start with min, will be updated by useEffect when data loads
    return min;
  });
  const [maxVal, setMaxVal] = useState(() => {
    // Initialize with value if provided
    if (value?.max !== undefined && value?.max !== null && value?.max !== '') {
      return Number(value.max);
    }
    // Otherwise start with max, will be updated by useEffect when data loads
    return max;
  });
  const sliderRef = useRef(null);
  const minHandleRef = useRef(null);
  const maxHandleRef = useRef(null);
  const [activeHandle, setActiveHandle] = useState(null); // 'min' or 'max' or null
  const initializedRef = useRef(false);
  const prevEffectiveMinRef = useRef(min);
  const prevEffectiveMaxRef = useRef(max);

  // Update internal state when effective min/max or value changes
  useEffect(() => {
    // Determine if we have explicit filter values
    const hasMinFilter = value?.min !== undefined && value?.min !== null && value?.min !== '';
    const hasMaxFilter = value?.max !== undefined && value?.max !== null && value?.max !== '';
    
    // Check if we have data available for data-based range
    const hasDataNow = (useDataMin || useDataMax) && histogramData && histogramData.length > 0;
    const usingDataRange = hasDataNow && (effectiveMin !== min || effectiveMax !== max);
    
    // Determine the effective values to use - use data-based min/max when no filter is set
    let newMinVal, newMaxVal;
    
    if (hasMinFilter) {
      // If value.min is provided, clamp it to effectiveMin
      newMinVal = Math.max(Number(value.min), effectiveMin);
    } else {
      // If no value.min, use effectiveMin (cheapest price from data)
      newMinVal = effectiveMin;
    }
    
    if (hasMaxFilter) {
      // If value.max is provided, clamp it to effectiveMax
      newMaxVal = Math.min(Number(value.max), effectiveMax);
    } else {
      // If no value.max, use effectiveMax (most expensive price from data)
      newMaxVal = effectiveMax;
    }
    
    // Check if effectiveMin/Max changed (data loaded or changed) - use same logic for both
    const effectiveMinChanged = Math.abs(effectiveMin - prevEffectiveMinRef.current) > step;
    const effectiveMaxChanged = Math.abs(effectiveMax - prevEffectiveMaxRef.current) > step;
    
    // Always update when values differ significantly
    const minChanged = Math.abs(newMinVal - minVal) > step;
    const maxChanged = Math.abs(newMaxVal - maxVal) > step;
    const isFirstInit = !initializedRef.current;
    
    // Update if values changed, first init, or when effectiveMin/Max changes
    if (minChanged || maxChanged || isFirstInit || effectiveMinChanged || effectiveMaxChanged) {
      setMinVal(newMinVal);
      setMaxVal(newMaxVal);
      prevEffectiveMinRef.current = effectiveMin;
      prevEffectiveMaxRef.current = effectiveMax;
      initializedRef.current = true;
      
      // If filters are not explicitly set and we're using data-based range, update parent
      // This ensures the slider starts from the cheapest/most expensive prices
      // Use the EXACT same logic for both min and max - just check if effectiveMin/Max changed
      if (!hasMinFilter && !hasMaxFilter && usingDataRange && hasDataNow) {
        // Update parent when effectiveMin/Max changed OR on first init with data
        // This is the same logic that works for max, so it should work for min too
        const shouldUpdateParent = effectiveMinChanged || effectiveMaxChanged || (isFirstInit && hasDataNow);
        if (shouldUpdateParent) {
          // Call onChange with the new data-based values
          onChange?.({ min: newMinVal, max: newMaxVal });
        }
      }
    }
  }, [value?.min, value?.max, effectiveMin, effectiveMax, minVal, maxVal, onChange, step, min, max, useDataMax, useDataMin, histogramData]);

  // Calculate positions as percentages (using effective min/max for calculations)
  const minPercent = ((minVal - effectiveMin) / (effectiveMax - effectiveMin)) * 100;
  const maxPercent = ((maxVal - effectiveMin) / (effectiveMax - effectiveMin)) * 100;

  // Get value from position
  const getValueFromPosition = useCallback((clientX) => {
    if (!sliderRef.current) return effectiveMin;
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const rawValue = effectiveMin + (percentage / 100) * (effectiveMax - effectiveMin);
    return Math.round(rawValue / step) * step; // Snap to step
  }, [effectiveMin, effectiveMax, step]);

  // Handle mouse down
  const handleMouseDown = useCallback((e, handle) => {
    e.preventDefault();
    setActiveHandle(handle);

      const handleMove = (moveEvent) => {
        const newValue = getValueFromPosition(moveEvent.clientX);
        
        if (handle === 'min') {
          const clampedValue = Math.max(effectiveMin, Math.min(newValue, maxVal - step));
          setMinVal(clampedValue);
          onChange?.({ min: clampedValue, max: maxVal });
        } else {
          const clampedValue = Math.min(effectiveMax, Math.max(newValue, minVal + step));
          setMaxVal(clampedValue);
          onChange?.({ min: minVal, max: clampedValue });
        }
      };

    const handleUp = () => {
      setActiveHandle(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);
  }, [minVal, maxVal, effectiveMin, effectiveMax, step, getValueFromPosition, onChange]);

  // Handle track click
  const handleTrackClick = useCallback((e) => {
    if (activeHandle) return; // Don't handle track clicks while dragging
    
    const clickValue = getValueFromPosition(e.clientX);
    const minDistance = Math.abs(clickValue - minVal);
    const maxDistance = Math.abs(clickValue - maxVal);
    
    if (minDistance < maxDistance) {
      // Move min handle
      const newMin = Math.max(effectiveMin, Math.min(clickValue, maxVal - step));
      setMinVal(newMin);
      onChange?.({ min: newMin, max: maxVal });
    } else {
      // Move max handle
      const newMax = Math.min(effectiveMax, Math.max(clickValue, minVal + step));
      setMaxVal(newMax);
      onChange?.({ min: minVal, max: newMax });
    }
  }, [minVal, maxVal, effectiveMin, effectiveMax, step, getValueFromPosition, onChange, activeHandle]);

  // Histogram bars - use actual property distribution if provided, otherwise use mock data
  const numBars = 30;
  
  // Calculate histogram from actual property data
  const calculateHistogramFromData = useCallback((data, numBars, field, sliderMin, sliderMax) => {
    if (!data || data.length === 0) return null;
    
    // Extract values based on field type
    const values = data
      .map(item => {
        if (field === 'price') {
          return item.price;
        } else if (field === 'area') {
          return item.specifications?.area || 0;
        }
        return 0;
      })
      .filter(v => v > 0 && v >= sliderMin && v <= sliderMax); // Only include values within slider range
    
    if (values.length === 0) return null;
    
    // Use slider min/max for binning (not actual data min/max)
    // This ensures histogram aligns with the slider scale
    const range = sliderMax - sliderMin;
    
    // Create bins based on slider range
    const bins = Array(numBars).fill(0);
    const binSize = range / numBars;
    
    // Count properties in each bin
    values.forEach(value => {
      const binIndex = Math.min(numBars - 1, Math.max(0, Math.floor((value - sliderMin) / binSize)));
      bins[binIndex]++;
    });
    
    // Normalize heights to percentage (0-100)
    const maxCount = Math.max(...bins);
    if (maxCount === 0) return null;
    
    // Apply smoothing to histogram for better visual appearance
    const smoothedBins = bins.map((count, i) => {
      // Simple moving average for smoothing (smaller window for better shape)
      const windowSize = 1;
      let sum = count;
      let weight = 1;
      
      // Average with immediate neighbors only
      for (let j = Math.max(0, i - windowSize); j <= Math.min(bins.length - 1, i + windowSize); j++) {
        if (j !== i) {
          sum += bins[j] * 0.2; // Neighbors have 20% weight for subtle smoothing
          weight += 0.2;
        }
      }
      
      return sum / weight;
    });
    
    const normalizedBins = smoothedBins.map(count => {
      const percent = (count / maxCount) * 100;
      // Ensure minimum height for visibility but allow natural variation
      return Math.max(8, percent);
    });
    
    // Map to position and height
    return normalizedBins.map((height, i) => ({
      height: Math.max(8, height), // Minimum 8% height for visibility
      position: (i / (numBars - 1)) * 100,
      count: bins[i] // Store actual count
    }));
  }, []);
  
  // Create histogram data - use actual data if provided, otherwise fallback to mock
  const histogramBars = useMemo(() => {
    if (histogramData && histogramData.length > 0) {
      // Use actual property distribution with effective min/max
      const actualBars = calculateHistogramFromData(histogramData, numBars, histogramField, effectiveMin, effectiveMax);
      if (actualBars) return actualBars;
    }
    
    // Fallback to mock distribution if no data provided
    return Array.from({ length: numBars }, (_, i) => {
      const position = i / (numBars - 1); // 0 to 1
      
      // Create a left-skewed distribution with peak around 20% of the range
      let height;
      if (position < 0.2) {
        height = 30 + 60 * (position / 0.2);
      } else if (position < 0.4) {
        height = 90 - 20 * ((position - 0.2) / 0.2);
      } else {
        const tailPosition = (position - 0.4) / 0.6;
        height = 70 * Math.exp(-tailPosition * 3);
      }
      
      const variation = 0.85 + (Math.random() * 0.3);
      height = Math.max(10, Math.min(100, height * variation));
      
      return { height, position: position * 100, count: 0 };
    });
  }, [histogramData, numBars, calculateHistogramFromData, effectiveMin, effectiveMax, histogramField]);

  return (
    <div className={`relative ${className}`}>
      {/* Histogram */}
      <div className="h-20 mb-3 flex items-end justify-between gap-0.5">
        {histogramBars.map((bar, i) => {
          // Calculate if bar is in selected range
          const isInRange = bar.position >= minPercent && bar.position <= maxPercent;
          
          return (
            <div
              key={i}
              className={`flex-1 rounded-t transition-colors duration-200 ${
                isInRange 
                  ? 'bg-fuchsia-600 hover:bg-fuchsia-700' 
                  : 'bg-fuchsia-400/80 hover:bg-fuchsia-500'
              }`}
              style={{ 
                height: `${bar.height}%`,
                minHeight: '2px'
              }}
            />
          );
        })}
      </div>

      {/* Slider track */}
      <div 
        ref={sliderRef}
        className="relative h-2 mb-10 cursor-pointer"
        onClick={handleTrackClick}
      >
        {/* Track line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-fuchsia-500 -translate-y-1/2"></div>
        
        {/* Active range highlight */}
        <div
          className="absolute top-1/2 h-0.5 bg-fuchsia-600 -translate-y-1/2"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min handle */}
        <div
          ref={minHandleRef}
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-fuchsia-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-transform z-20 ${
            activeHandle === 'min' ? 'scale-125' : 'hover:scale-110'
          }`}
          style={{
            left: `${minPercent}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'min')}
          onTouchStart={(e) => handleMouseDown(e.touches[0], 'min')}
        />

        {/* Max handle */}
        <div
          ref={maxHandleRef}
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-fuchsia-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-transform z-20 ${
            activeHandle === 'max' ? 'scale-125' : 'hover:scale-110'
          }`}
          style={{
            left: `${maxPercent}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'max')}
          onTouchStart={(e) => handleMouseDown(e.touches[0], 'max')}
        />
      </div>

      {/* Labels and values - Fixed positions at edges */}
      <div className="relative h-16 flex justify-between">
        {/* Minimum label - Fixed at left */}
        <div className="flex flex-col items-start">
          <span className="text-xs text-gray-500 mb-1.5">
            Minimum
          </span>
          <div className="px-3 py-1.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-900 shadow-sm hover:border-fuchsia-500 transition-colors whitespace-nowrap">
            {formatLabel ? formatLabel(minVal, 'min') : minVal}
          </div>
        </div>
        {/* Maximum label - Fixed at right */}
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-500 mb-1.5">
            Maximum
          </span>
          <div className="px-3 py-1.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-900 shadow-sm hover:border-fuchsia-500 transition-colors whitespace-nowrap">
            {formatLabel ? formatLabel(maxVal, 'max') : maxVal}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RangeSlider;

