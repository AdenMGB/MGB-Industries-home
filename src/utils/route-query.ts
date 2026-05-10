import type { LocationQueryValue } from 'vue-router'

/** First string value from a route query param (handles `?x=a&x=b` array form). */
export function queryFirstString(
  v: LocationQueryValue | LocationQueryValue[] | undefined | null,
): string {
  if (v == null) return ''
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : ''
  return v
}
