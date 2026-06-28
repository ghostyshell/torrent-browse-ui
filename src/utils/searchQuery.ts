/** Match SearchForm: base + optional quality + studio/custom filter tokens */
export function buildCombinedSearchQuery(
  baseQuery: string,
  quality: string,
  customFilter: string
): string {
  return [baseQuery, quality, customFilter]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join(' ');
}
