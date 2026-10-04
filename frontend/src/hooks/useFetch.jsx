import { useState, useEffect, useRef } from "react";
import dataCache from "../utils/cache.js";

const useFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const { useCache = true, cacheTTL } = options;

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // Check cache first
      if (useCache) {
        const cached = dataCache.get(url);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          ...options,
          signal: abortControllerRef.current.signal
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Cache the result
        if (useCache) {
          dataCache.set(url, result, cacheTTL);
        }
        
        setData(result);
      } catch (err) {
        // Don't set error if request was aborted (user initiated)
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup function to abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url, JSON.stringify(options)]); // Use JSON.stringify to prevent infinite loops

  return { data, loading, error };
};

export default useFetch;
