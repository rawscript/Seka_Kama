export const getApiUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.startsWith('192.168.');
    
    // If we're on a secure page, force the API URL to https unless it's local
    if (window.location.protocol === 'https:' && !isLocal) {
      if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
      } else if (url.startsWith('//')) {
        url = 'https:' + url;
      }
    }
  }

  // Normalize: strip trailing slash
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

