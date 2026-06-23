/**
 * Production backend URL (Railway).
 * Always HTTPS to prevent Mixed Content errors on the Vercel frontend.
 */
const PRODUCTION_API_URL = 'https://sekakama-production-0aa3.up.railway.app/api';

export const getApiUrl = (): string => {
  // If we are definitely on the client
  if (typeof window !== 'undefined') {
    // Check environment variable first (for development overrides)
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    
    // If env var is set and not empty, use it (allows development overrides)
    if (envUrl && envUrl.trim() !== '') {
      const url = envUrl.replace(/\/$/, '');
      console.log(`Using API URL from env: ${url}`);
      return url;
    }
    
    // Check if we're on localhost
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.');

    if (isLocal) {
      // Local development - default to localhost:8000
      return 'http://localhost:8000/api';
    }
    
    // Not localhost and no env override - use production
    console.log(`No API URL override detected, using production: ${PRODUCTION_API_URL}`);
    return PRODUCTION_API_URL;
  }

  // Server-side (SSR) - use env var or default to production
  let url = process.env.NEXT_PUBLIC_API_URL || PRODUCTION_API_URL;
  
  // Force HTTPS for production URLs
  if (url.includes('sekakama-production') && url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  return url.endsWith('/') ? url.slice(0, -1) : url;
};
