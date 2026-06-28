/**
 * Feature flags based on environment variables
 */

/**
 * Check if Google Images search functionality is enabled
 * This can be enabled by setting REACT_APP_ENABLE_GOOGLE_IMAGES=true
 * Default is disabled (false) - must be explicitly enabled
 */
export const isGoogleImagesEnabled = (): boolean => {
  const enableGoogleImages = process.env.REACT_APP_ENABLE_GOOGLE_IMAGES;
  return enableGoogleImages === 'true';
};

/**
 * Check if manual image input functionality is enabled
 * This can be disabled by setting REACT_APP_DISABLE_MANUAL_IMAGES=true
 * Default is enabled (true)
 */
export const isManualImageInputEnabled = (): boolean => {
  const disableManualImages = process.env.REACT_APP_DISABLE_MANUAL_IMAGES;
  return disableManualImages !== 'true';
};

/**
 * Check if a feature is enabled based on environment variable
 * @param envVar - Environment variable name (without REACT_APP_ prefix)
 * @param defaultValue - Default value if env var is not set
 */
export const isFeatureEnabled = (
  envVar: string,
  defaultValue: boolean = true
): boolean => {
  const value = process.env[`REACT_APP_${envVar}`];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() !== 'true' ? false : true;
};
