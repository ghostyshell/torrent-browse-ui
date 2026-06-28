/** URL ?preset= values that run a keyword search (never implied when absent) */
export const SEARCH_PRESET_TOKENS = ['xxx', 'trans'] as const;

export type SearchPresetToken = (typeof SEARCH_PRESET_TOKENS)[number];

/** Dropdown: browse = latest category browse; tokens = explicit preset search */
export type CommonSearchMode = 'browse' | SearchPresetToken;

export function isSearchPresetToken(
  value: string | null
): value is SearchPresetToken {
  return value === 'xxx' || value === 'trans';
}
