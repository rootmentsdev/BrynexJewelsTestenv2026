import NodeCache from 'node-cache';

// Cache for 5 minutes (300 seconds) by default
const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // Better performance, but be careful with object mutations
});

export const getCachedData = (key) => {
  return cache.get(key);
};

export const setCachedData = (key, data, ttl = 300) => {
  return cache.set(key, data, ttl);
};

export const deleteCachedData = (key) => {
  return cache.del(key);
};

export const generateCacheKey = (prefix, params) => {
  // Create a consistent cache key from parameters
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  
  return `${prefix}:${JSON.stringify(sortedParams)}`;
};

export const clearCachePattern = (pattern) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  matchingKeys.forEach(key => cache.del(key));
  return matchingKeys.length;
};

export const getCacheStats = () => {
  return cache.getStats();
};

export default cache;