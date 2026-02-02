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
 * Not equal comparison operator
 * Returns true when left and right values are not equal
 *
 * @example
 * neq("post.status", "deleted")
 * neq("user.role", "banned")
 */
export function neq<T, L extends Path<T>, A = unknown>(
  left: L,
  right: Path<T> | PathValue<T, L>,
): Expr<T, A> {
  return { kind: "neq", left, right };
}

/**
 * Greater than comparison operator
 *
 * @example
 * gt("user.age", 18)
 * gt("post.createdAt", "2024-01-01")
 */
export function gt<T, L extends Path<T>, A = unknown>(
  left: L,
  right: Path<T> | PathValue<T, L>,
): Expr<T, A> {
  return { kind: "gt", left, right };
}

/**
 * Less than comparison operator
 *
 * @example
 * lt("user.age", 18)
 * lt("post.createdAt", "2024-12-31")
 */
export function lt<T, L extends Path<T>, A = unknown>(
  left: L,
  right: Path<T> | PathValue<T, L>,
): Expr<T, A> {
  return { kind: "lt", left, right };
}

/**
 * Greater than or equal comparison operator
 *
 * @example
 * gte("post.score", 0)
 * gte("user.createdAt", "2024-01-01")
 */
export function gte<T, L extends Path<T>, A = unknown>(
  left: L,
  right: Path<T> | PathValue<T, L>,
): Expr<T, A> {
  return { kind: "gte", left, right };
}

/**
 * Less than or equal comparison operator
 *
 * @example
 * lte("user.loginAttempts", 3)
 * lte("post.createdAt", "2024-12-31")
 */
export function lte<T, L extends Path<T>, A = unknown>(
  left: L,
  right: Path<T> | PathValue<T, L>,
): Expr<T, A> {
  return { kind: "lte", left, right };
}

/**
 * Array membership operator
 * Returns true if the path value is in the provided array
 *
 * @example
 * inArray("user.role", ["admin", "moderator"])
 * inArray("post.status", ["published", "draft"])
 */
export function inArray<T, L extends Path<T>, A = unknown>(
  path: L,
  values: PathValue<T, L>[],
): Expr<T, A> {
  return { kind: "inArray", path, values };
}

/**
 * Check if a path value is null
 *
 * @example
 * isNull("post.deletedAt")
 */
export function isNull<T, L extends Path<T>, A = unknown>(path: L): Expr<T, A> {
  return { kind: "isNull", path };
}

/**
 * Check if a path value is not null
 *
 * @example
 * isNotNull("post.publishedAt")
 */
export function isNotNull<T, L extends Path<T>, A = unknown>(path: L): Expr<T, A> {
  return { kind: "isNotNull", path };
}

/**
 * Logical negation operator
 * Returns the opposite of the given expression
 *
 * @example
 * not(eq("post.archived", true))
 * not(and(eq("post.deleted", true), isNull("post.publishedAt")))
 */
export function not<T, A = unknown>(expr: Expr<T, A>): Expr<T, A> {
  return { kind: "not", expr };
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
