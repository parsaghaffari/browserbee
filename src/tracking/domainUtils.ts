/**
 * Utility functions for working with domains
 */

/**
 * Normalize a domain to a canonical form
 * @param domain The domain to normalize
 * @returns The normalized domain
 */
export function normalizeDomain(domain: string): string {
  if (!domain) return '';

  // Convert to lowercase
  let normalized = domain.toLowerCase();

  // Remove protocol if present
  if (normalized.includes('://')) {
    try {
      normalized = new URL(normalized).hostname;
    } catch (e) {
      // If URL parsing fails, continue with original
      console.error('Error parsing URL:', e);
    }
  }

  // Remove www. prefix if present
  if (normalized.startsWith('www.')) {
    normalized = normalized.substring(4);
  }

  // Remove any trailing slashes or paths
  normalized = normalized.split('/')[0];

  return normalized;
}
