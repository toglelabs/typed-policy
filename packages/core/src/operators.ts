import type { Expr } from "./ast.js";
import type { Path, PathValue } from "./types.js";

/**
 * Equality comparison operator
 * Compares a subject path to a value or another path
 *
 * @example
 * eq("post.published", true)
 * eq("post.ownerId", "user.id")
 */
export function eq<T, L extends Path<T>, A = unknown>(
  left: L,
  right: Path<T> | PathValue<T, L>,
): Expr<T, A> {
  return { kind: "eq", left, right };
}

/**
 * Logical AND operator
 * All rules must be true
 *
 * @example
 * and(eq("post.published", true), eq("user.role", "admin"))
 */
export function and<T, A = unknown>(...rules: Expr<T, A>[]): Expr<T, A> {
  return { kind: "and", rules };
}

/**
 * Logical OR operator
 * At least one rule must be true
 *
 * @example
 * or(eq("user.role", "admin"), eq("post.published", true))
 */
export function or<T, A = unknown>(...rules: Expr<T, A>[]): Expr<T, A> {
  return { kind: "or", rules };
}
