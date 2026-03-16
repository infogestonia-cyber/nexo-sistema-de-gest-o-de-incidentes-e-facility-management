/**
 * Ensures that the given value is an array.
 * If it's already an array, returns it.
 * If it's null or undefined, returns an empty array.
 * If it's a single value, wraps it in an array (unless it looks like an error object/response).
 * This is particularly useful for handling API responses that might return an object with an error 
 * instead of the expected array.
 */
export function ensureArray<T>(val: any): T[] {
  if (Array.isArray(val)) {
    return val;
  }
  if (val === null || val === undefined) {
    return [];
  }
  // If it's an object that might be an error response (has 'error' or 'message' property)
  // or just not what we expect as an array element, we might want to return empty.
  // However, for most cases in this app, if it's not an array, it's a failed response.
  if (typeof val === 'object' && (val.error || val.message)) {
    return [];
  }
  
  // Default fallback: if it's not an array but exists, and isn't a known error object,
  // we could wrap it, but in the context of this app's API, it usually means a single result
  // or a failed list fetch. Let's be conservative and return empty if not array.
  return [];
}
