export const getApiUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // If we're on a secure page and the API URL is insecure, force it to https
    if (window.location.protocol === 'https:' && url.includes('http://') && !isLocal) {
      url = url.replace('http://', 'https://');
    }
  }

  // Normalize: strip trailing slash
  return url.endsWith('/') ? url.slice(0, -1) : url;
};
