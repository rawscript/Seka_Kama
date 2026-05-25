/**
 * Production backend URL (Railway).
 * Always HTTPS to prevent Mixed Content errors on the Vercel frontend.
 */
const PRODUCTION_API_URL = 'https://sekakama-production-0aa3.up.railway.app/api';

export const getApiUrl = (): string => {
  // 1. Start with the env var, falling back to localhost for dev
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  if (typeof window !== 'undefined') {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.');

    if (!isLocal) {
      // 2. On any non-local deployment, force the production HTTPS URL
      //    regardless of what was baked in at build time.
      if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
        url = PRODUCTION_API_URL;
      }

      // 3. Upgrade remaining http:// → https://
      if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
      }
    }
  }

  // Normalize: strip trailing slash
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

