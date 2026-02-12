// API Configuration for CLARITY Frontend
// This module provides centralized API URL management

/**
 * Base URL for API requests
 *
 * In development: Uses VITE_API_URL from .env.local (e.g., http://127.0.0.1:8082)
 * In production (SPCS): Uses /api which nginx proxies to the backend container
 *
 * If VITE_API_URL is not set, defaults to empty string (relative paths)
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Helper function to construct API endpoint URLs
 * @param endpoint - The API endpoint path (e.g., '/clean-report')
 * @returns Full URL for the API endpoint
 */
export function getApiUrl(endpoint: string): string {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
}

// Export individual endpoint URLs for convenience
export const API_ENDPOINTS = {
  CLEAN_REPORT: getApiUrl('/clean-report'),
  CLEAN_REPORT_RUNS: getApiUrl('/clean-report/runs'),
  LIST_TABLES: getApiUrl('/list-tables'),
  RUN_ANALYSIS: getApiUrl('/run-analysis'),
  CHAT: getApiUrl('/chat'),
} as const;
