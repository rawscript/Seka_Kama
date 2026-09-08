/**
 * The deployed Cloudflare Worker URL is intentionally supplied by Vercel's
 * NEXT_PUBLIC_API_URL environment variable. Do not bake a provider-specific
 * URL into the client bundle: it makes previews silently call an expired API.
 */
const LOCAL_API_URL = 'http://localhost:8000/api';

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
      return LOCAL_API_URL;
    }
    
    throw new Error('NEXT_PUBLIC_API_URL is not configured for this deployment.');
  }

  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error('NEXT_PUBLIC_API_URL is not configured for this deployment.');
  return url.endsWith('/') ? url.slice(0, -1) : url;
};
