/**
 * Global console control.
 *
 * Controlled by the REACT_APP_SHOW_CONSOLE_LOGS environment variable:
 *   - "ON" (or not set) → console logs are hidden  (default behaviour)
 *   - "OFF"             → all console logs are shown
 *
 * `console.error` is always left intact so genuine errors are never swallowed.
 */

const HIDDEN_METHODS = ['log', 'info', 'debug', 'warn', 'trace'] as const;

/**
 * Returns true when console logs should be visible.
 * Logs are hidden by default and only shown when the flag is explicitly "OFF".
 */
const logsEnabled = (): boolean =>
  (process.env.REACT_APP_SHOW_CONSOLE_LOGS || 'ON').toUpperCase() === 'OFF';

/**
 * Patches the global console to suppress noisy log methods unless logs are
 * explicitly enabled. Idempotent — safe to call more than once.
 */
export const installConsoleControl = (): void => {
  if (logsEnabled()) return;

  const noop = () => {};
  for (const method of HIDDEN_METHODS) {
    // eslint-disable-next-line no-console
    (console as unknown as Record<string, unknown>)[method] = noop;
  }
};
