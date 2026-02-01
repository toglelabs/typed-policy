/**
 * Error message utilities for Typed Policy
 *
 * Provides consistent error messages for common failure scenarios.
 */

/**
 * Creates a standardized error message for missing context paths
 *
 * @param missingPath - The path that was not found in the context
 * @returns A formatted error message string
 *
 * @example
 * ```ts
 * throw new Error(createContextError("user.role"));
 * // throws: Missing required context path: "user.role"
 * ```
 */
export function createContextError(missingPath: string): string {
  return `Missing required context path: "${missingPath}"`;
}
