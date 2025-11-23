// Utility functions for handling URLs in both client and server environments

/**
 * Get the base URL for API calls
 * Works in both client-side and server-side environments
 */
export function getBaseUrl(): string {
  // Client-side
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Fallback for development
  return 'http://localhost:3000';
}

/**
 * Build an absolute API URL
 * @param path API path (e.g., '/api/auth/microsoft/token')
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}