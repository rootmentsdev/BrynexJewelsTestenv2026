import { useState, useCallback, useRef, useEffect } from 'react';

// API Cache with TTL
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const cachedFetch = async (url, options = {}) => {
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  apiCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

// Parallel fetch with error handling
export const useOptimizedFetch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchMultiple = useCallback(async (urls, options = {}) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setLoading(true);
    setError(null);

    try {
      // Fetch all URLs in parallel
      const promises = urls.map(url => 
        cachedFetch(url, { ...options, signal })
      );

      const results = await Promise.allSettled(promises);
      
      // Separate successful and failed results
      const successful = [];
      const errors = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful[index] = result.value;
        } else {
          errors[index] = result.reason;
          successful[index] = null; // Placeholder for failed requests
        }
      });

      // If any critical APIs failed, throw error
      if (errors.length > 0 && errors.some(err => err)) {
        console.warn('Some API calls failed:', errors);
        // Don't throw error, just log warnings and continue with partial data
      }

      return successful;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted');
        return null;
      }
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSingle = useCallback(async (url, options = {}) => {
    const results = await fetchMultiple([url], options);
    return results ? results[0] : null;
  }, [fetchMultiple]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    fetchMultiple,
    fetchSingle,
    loading,
    error,
    clearCache: () => apiCache.clear()
  };
};

// Hook for optimized data processing
export const useOptimizedDataProcessing = () => {
  const processInChunks = useCallback(async (data, processor, chunkSize = 100) => {
    const results = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const processed = chunk.map(processor);
      results.push(...processed);
      
      // Yield control back to browser to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }, []);

  const deduplicateEfficiently = useCallback((data, keyExtractor) => {
    const seen = new Set();
    return data.filter(item => {
      const key = keyExtractor(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const groupByEfficiently = useCallback((data, keyExtractor) => {
    const groups = new Map();
    
    data.forEach(item => {
      const key = keyExtractor(item);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });
    
    return groups;
  }, []);

  return {
    processInChunks,
    deduplicateEfficiently,
    groupByEfficiently
  };
};