/**
 * Production backend URL (Railway).
 * Always HTTPS to prevent Mixed Content errors on the Vercel frontend.
 */
const PRODUCTION_API_URL = 'https://sekakama-production-0aa3.up.railway.app/api';

export const getApiUrl = (): string => {
  // If we are definitely on the client, check if we're on localhost
  if (typeof window !== 'undefined') {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.');

    if (isLocal) {
      // Local development
      const localEnv = process.env.NEXT_PUBLIC_API_URL;
      return localEnv ? localEnv.replace(/\/$/, '') : 'http://localhost:8000/api';
    }
    
    // We are on the client, but NOT on localhost. 
    // Always return the secure production URL, ignoring the env var entirely.
    return PRODUCTION_API_URL;
  }

  // If we are on the server (SSR), use the env var, but force HTTPS if it points to production
  let url = process.env.NEXT_PUBLIC_API_URL || PRODUCTION_API_URL;
  
  if (url.includes('sekakama-production') && url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  return url.endsWith('/') ? url.slice(0, -1) : url;
};
