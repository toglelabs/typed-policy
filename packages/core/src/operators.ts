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
 * Check if a string path starts with a prefix
 *
 * @example
 * startsWith("post.title", "[DRAFT]")
 * startsWith("file.name", "temp_")
 */
export function startsWith<T, L extends Path<T>, A = unknown>(path: L, prefix: string): Expr<T, A> {
  return { kind: "startsWith", path, prefix };
}

/**
 * Check if a string path ends with a suffix
 *
 * @example
 * endsWith("file.name", ".pdf")
 * endsWith("post.slug", "-draft")
 */
export function endsWith<T, L extends Path<T>, A = unknown>(path: L, suffix: string): Expr<T, A> {
  return { kind: "endsWith", path, suffix };
}

/**
 * Check if a string contains a substring or array contains a value
 *
 * @example
 * contains("post.title", "important")
 * contains("post.tags", "featured")
 */
export function contains<T, L extends Path<T>, A = unknown>(path: L, value: string): Expr<T, A> {
  return { kind: "contains", path, value };
}

/**
 * Check if a value is between min and max (inclusive)
 *
 * @example
 * between("post.createdAt", "2024-01-01", "2024-12-31")
 * between("user.age", 18, 65)
 */
export function between<T, L extends Path<T>, A = unknown>(
  path: L,
  min: Path<T> | PathValue<T, L>,
  max: Path<T> | PathValue<T, L>,
): Expr<T, A> {
  return { kind: "between", path, min, max };
}

/**
 * Check if a string matches a regular expression pattern
 *
 * @example
 * matches("user.email", /@company\.com$/)
 * matches("post.slug", /^[a-z0-9-]+$/)
 */
export function matches<T, L extends Path<T>, A = unknown>(
  path: L,
  pattern: RegExp | string,
  flags?: string,
): Expr<T, A> {
  const patternStr = typeof pattern === "string" ? pattern : pattern.source;
  const patternFlags = typeof pattern === "string" ? flags : pattern.flags || flags;
  return { kind: "matches", path, pattern: patternStr, flags: patternFlags };
}

/**
 * Check if a related record exists in another table
 * Compile-only: Cannot be evaluated on frontend
 *
 * @example
 * exists("task_assignments", { userId: "user.id", taskId: "task.id" })
 */
export function exists<T, A = unknown>(
  table: string,
  conditions: Record<string, string | number | boolean | null>,
): Expr<T, A> {
  return { kind: "exists", table, conditions };
}

/**
 * Count related records in another table
 * Compile-only: Cannot be evaluated on frontend
 *
 * @example
 * count("comments", { postId: "post.id" })
 */
export function count<T, A = unknown>(
  table: string,
  conditions: Record<string, string | number | boolean | null>,
): Expr<T, A> {
  return { kind: "count", table, conditions };
}

/**
 * Check if there are multiple related records in another table (>= minCount, default 2)
 * Compile-only: Cannot be evaluated on frontend
 *
 * @example
 * hasMany("permissions", { userId: "user.id", action: "moderate" }, 3)
 */
export function hasMany<T, A = unknown>(
  table: string,
  conditions: Record<string, string | number | boolean | null>,
  minCount?: number,
): Expr<T, A> {
  return { kind: "hasMany", table, conditions, minCount };
}

/**
 * Automatic tenant isolation - ensure subject belongs to actor's tenant
 *
 * @example
 * tenantScoped("post.organizationId")
 */
export function tenantScoped<T, L extends Path<T>, A = unknown>(path: L): Expr<T, A> {
  return { kind: "tenantScoped", path };
}

/**
 * Check if subject belongs to same tenant as actor
 *
 * @example
 * belongsToTenant("user.organizationId", "post.organizationId")
 */
export function belongsToTenant<T, L extends Path<T>, A = unknown>(
  actorPath: string,
  subjectPath: L,
): Expr<T, A> {
  return { kind: "belongsToTenant", actorPath, subjectPath };
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
