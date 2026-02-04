import type { Expr } from "./ast.js";
import { normalizePath } from "./proxies.js";
import type { ActorValue, ScopedSubjectPath, SubjectPath, TableRef } from "./symbolic.js";

/**
 * Normalizes left side of comparison operators
 */
function normalizeLeft(left: SubjectPath | ScopedSubjectPath): SubjectPath | ScopedSubjectPath {
  return normalizePath(left) as SubjectPath | ScopedSubjectPath;
}

/**
 * Normalizes right side of comparison operators
 */
function normalizeRight(
  right: SubjectPath | ScopedSubjectPath | ActorValue | string | number | boolean | null,
): SubjectPath | ScopedSubjectPath | ActorValue | string | number | boolean | null {
  if (typeof right === "object" && right !== null && "__kind" in right) {
    const normalized = normalizePath(right);
    if (normalized && "__kind" in normalized) {
      return normalized as SubjectPath | ScopedSubjectPath;
    }
  }
  return right;
}

/**
 * Equality comparison operator
 * Compares a subject path to a value or another path
 *
 * @example
 * eq(subject.post.published, true)
 * eq(subject.post.ownerId, actor.user.id)
 */
export function eq<T, A = unknown>(
  left: SubjectPath | ScopedSubjectPath,
  right: SubjectPath | ScopedSubjectPath | ActorValue | string | number | boolean | null,
): Expr<T, A> {
  return { kind: "eq", left: normalizeLeft(left), right: normalizeRight(right) };
}

/**
 * Not equal comparison operator
 * Returns true when left and right values are not equal
 *
 * @example
 * neq(subject.post.status, "deleted")
 * neq(subject.user.role, "banned")
 */
export function neq<T, A = unknown>(
  left: SubjectPath | ScopedSubjectPath,
  right: SubjectPath | ScopedSubjectPath | ActorValue | string | number | boolean | null,
): Expr<T, A> {
  return { kind: "neq", left: normalizeLeft(left), right: normalizeRight(right) };
}

/**
 * Greater than comparison operator
 *
 * @example
 * gt(subject.user.age, 18)
 * gt(subject.post.createdAt, "2024-01-01")
 */
export function gt<T, A = unknown>(
  left: SubjectPath | ScopedSubjectPath,
  right: SubjectPath | ScopedSubjectPath | ActorValue | string | number,
): Expr<T, A> {
  return { kind: "gt", left: normalizeLeft(left), right: normalizeRight(right) };
}

/**
 * Less than comparison operator
 *
 * @example
 * lt(subject.user.age, 18)
 * lt(subject.post.createdAt, "2024-12-31")
 */
export function lt<T, A = unknown>(
  left: SubjectPath | ScopedSubjectPath,
  right: SubjectPath | ScopedSubjectPath | ActorValue | string | number,
): Expr<T, A> {
  return { kind: "lt", left: normalizeLeft(left), right: normalizeRight(right) };
}

/**
 * Greater than or equal comparison operator
 *
 * @example
 * gte(subject.post.score, 0)
 * gte(subject.user.createdAt, "2024-01-01")
 */
export function gte<T, A = unknown>(
  left: SubjectPath | ScopedSubjectPath,
  right: SubjectPath | ScopedSubjectPath | ActorValue | string | number,
): Expr<T, A> {
  return { kind: "gte", left: normalizeLeft(left), right: normalizeRight(right) };
}

/**
 * Less than or equal comparison operator
 *
 * @example
 * lte(subject.user.loginAttempts, 3)
 * lte(subject.post.createdAt, "2024-12-31")
 */
export function lte<T, A = unknown>(
  left: SubjectPath | ScopedSubjectPath,
  right: SubjectPath | ScopedSubjectPath | ActorValue | string | number,
): Expr<T, A> {
  return { kind: "lte", left: normalizeLeft(left), right: normalizeRight(right) };
}

/**
 * Array membership operator
 * Returns true if the path value is in the provided array
 *
 * @example
 * inArray(subject.user.role, ["admin", "moderator"])
 * inArray(subject.post.status, ["published", "draft"])
 */
export function inArray<T, A = unknown>(
  path: SubjectPath | ScopedSubjectPath,
  values: (string | number | boolean | null)[],
): Expr<T, A> {
  return { kind: "inArray", path: normalizeLeft(path), values };
}

/**
 * Check if a path value is null
 *
 * @example
 * isNull(subject.post.deletedAt)
 */
export function isNull<T, A = unknown>(path: SubjectPath | ScopedSubjectPath): Expr<T, A> {
  return { kind: "isNull", path: normalizeLeft(path) };
}

/**
 * Check if a path value is not null
 *
 * @example
 * isNotNull(subject.post.publishedAt)
 */
export function isNotNull<T, A = unknown>(path: SubjectPath | ScopedSubjectPath): Expr<T, A> {
  return { kind: "isNotNull", path: normalizeLeft(path) };
}

/**
 * Check if a string path starts with a prefix
 *
 * @example
 * startsWith(subject.post.title, "[DRAFT]")
 * startsWith(subject.file.name, "temp_")
 */
export function startsWith<T, A = unknown>(
  path: SubjectPath | ScopedSubjectPath,
  prefix: string,
): Expr<T, A> {
  return { kind: "startsWith", path: normalizeLeft(path), prefix };
}

/**
 * Check if a string path ends with a suffix
 *
 * @example
 * endsWith(subject.file.name, ".pdf")
 * endsWith(subject.post.slug, "-draft")
 */
export function endsWith<T, A = unknown>(
  path: SubjectPath | ScopedSubjectPath,
  suffix: string,
): Expr<T, A> {
  return { kind: "endsWith", path: normalizeLeft(path), suffix };
}

/**
 * Check if a string contains a substring or array contains a value
 *
 * @example
 * contains(subject.post.title, "important")
 * contains(subject.post.tags, "featured")
 */
export function contains<T, A = unknown>(
  path: SubjectPath | ScopedSubjectPath,
  value: string,
): Expr<T, A> {
  return { kind: "contains", path: normalizeLeft(path), value };
}

/**
 * Check if a value is between min and max (inclusive)
 *
 * @example
 * between(subject.post.createdAt, "2024-01-01", "2024-12-31")
 * between(subject.user.age, 18, 65)
 */
export function between<T, A = unknown>(
  path: SubjectPath | ScopedSubjectPath,
  min: SubjectPath | ScopedSubjectPath | ActorValue | string | number,
  max: SubjectPath | ScopedSubjectPath | ActorValue | string | number,
): Expr<T, A> {
  return {
    kind: "between",
    path: normalizeLeft(path),
    min: normalizeRight(min),
    max: normalizeRight(max),
  };
}

/**
 * Check if a string matches a regular expression pattern
 *
 * @example
 * matches(subject.user.email, /@company\.com$/)
 * matches(subject.post.slug, /^[a-z0-9-]+$/)
 */
export function matches<T, A = unknown>(
  path: SubjectPath | ScopedSubjectPath,
  pattern: RegExp | string,
  flags?: string,
): Expr<T, A> {
  const patternStr = typeof pattern === "string" ? pattern : pattern.source;
  const patternFlags = typeof pattern === "string" ? flags : pattern.flags || flags;
  return {
    kind: "matches",
    path: normalizeLeft(path),
    pattern: patternStr,
    flags: patternFlags,
  };
}

/**
 * Check if a related record exists in another table
 *
 * @example
 * exists(subject.comments, (c) =>
 *   eq(c.postId, subject.post.id)
 * )
 */
export function exists<TTable, T, A = unknown>(
  table: TableRef<TTable>,
  predicate: (scoped: TTable) => Expr<T, A>,
): Expr<T, A> {
  // Normalize the table ref
  const normalizedTable = normalizePath(table) as TableRef<TTable>;
  return { kind: "exists", table: normalizedTable, predicate: predicate as any };
}

/**
 * Count related records in another table
 *
 * @example
 * count(subject.comments, (c) =>
 *   eq(c.postId, subject.post.id)
 * )
 */
export function count<TTable, T, A = unknown>(
  table: TableRef<TTable>,
  predicate: (scoped: TTable) => Expr<T, A>,
): Expr<T, A> {
  const normalizedTable = normalizePath(table) as TableRef<TTable>;
  return { kind: "count", table: normalizedTable, predicate: predicate as any };
}

/**
 * Check if there are multiple related records in another table (>= minCount, default 2)
 *
 * @example
 * hasMany(subject.permissions, (p) =>
 *   and(
 *     eq(p.userId, actor.user.id),
 *     eq(p.action, "moderate")
 *   ),
 *   3
 * )
 */
export function hasMany<TTable, T, A = unknown>(
  table: TableRef<TTable>,
  predicate: (scoped: TTable) => Expr<T, A>,
  minCount?: number,
): Expr<T, A> {
  const normalizedTable = normalizePath(table) as TableRef<TTable>;
  return { kind: "hasMany", table: normalizedTable, predicate: predicate as any, minCount };
}

/**
 * Automatic tenant isolation - ensure subject belongs to actor's tenant
 *
 * @example
 * tenantScoped(subject.post.organizationId)
 */
export function tenantScoped<T, A = unknown>(path: SubjectPath | ScopedSubjectPath): Expr<T, A> {
  return { kind: "tenantScoped", path: normalizeLeft(path) };
}

/**
 * Check if subject belongs to same tenant as actor
 *
 * @example
 * belongsToTenant(actor.user.organizationId, subject.post.organizationId)
 */
export function belongsToTenant<T, A = unknown>(
  actorValue: ActorValue,
  subjectPath: SubjectPath | ScopedSubjectPath,
): Expr<T, A> {
  return { kind: "belongsToTenant", actorValue, subjectPath: normalizeLeft(subjectPath) };
}

/**
 * Logical negation operator
 * Returns the opposite of the given expression
 *
 * @example
 * not(eq(subject.post.archived, true))
 * not(and(eq(subject.post.deleted, true), isNull(subject.post.publishedAt)))
 */
export function not<T, A = unknown>(expr: Expr<T, A>): Expr<T, A> {
  return { kind: "not", expr };
}

/**
 * Logical AND operator
 * All rules must be true
 *
 * @example
 * and(eq(subject.post.published, true), eq(subject.user.role, "admin"))
 */
export function and<T, A = unknown>(...rules: Expr<T, A>[]): Expr<T, A> {
  return { kind: "and", rules };
}

/**
 * Logical OR operator
 * At least one rule must be true
 *
 * @example
 * or(eq(subject.user.role, "admin"), eq(subject.post.published, true))
 */
export function or<T, A = unknown>(...rules: Expr<T, A>[]): Expr<T, A> {
  return { kind: "or", rules };
}
