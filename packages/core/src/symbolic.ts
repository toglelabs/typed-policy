/**
 * Symbolic type system for zero-string API
 *
 * These types replace string-based paths with symbolic proxies
 * that are immediately converted to AST nodes.
 */

export type Primitive = string | number | boolean | null | undefined;

/**
 * Symbolic path to a subject column.
 * This is the concrete representation after proxy conversion.
 * Stores path explicitly (never depends on live proxy).
 *
 * @template TColumn - Type of the column (for type safety)
 *
 * @example
 * // Created from: subject.post.id
 * const path: SubjectPath<string> = { __kind: "subject-path", table: "post", column: "id" };
 */
export type SubjectPath<TColumn = unknown> = {
  __kind: "subject-path";
  table: string;
  column: string;
  phantom?: TColumn;
};

/**
 * Wrapper for actor values (runtime data).
 * Simple wrapper that marks values as coming from actor.
 *
 * @template T - Type of the value
 *
 * @example
 * const actorValue: ActorValue<string> = { __kind: "actor-value", value: "user-1" };
 */
export type ActorValue<T = unknown> = {
  __kind: "actor-value";
  value: T;
};

/**
 * Symbolic reference to a table (for exists/count/hasMany).
 * Fully typed with table schema.
 *
 * @template TTable - Type of the table
 *
 * @example
 * // Created from: subject.comments
 * const tableRef: TableRef<{ id: string; postId: string; content: string }> = {
 *   __kind: "table-ref",
 *   name: "comments",
 * };
 */
export type TableRef<TTable = unknown> = {
  __kind: "table-ref";
  name: string;
  phantom?: TTable;
};

/**
 * Subject proxy type (for policy authoring).
 * TypeScript sees this as T, but at runtime it's a proxy.
 *
 * @template T - Subject type
 *
 * @example
 * const subject = createSubjectProxy<MySubject>();
 * // TypeScript thinks subject is MySubject
 * // At runtime it's a proxy that captures path access
 */
export type SubjectProxy<T> = T;

/**
 * Scoped subject path (for exists/count/hasMany predicates).
 * Same as SubjectPath but scoped to a specific table context.
 *
 * @template TColumn - Type of the column
 *
 * @example
 * // In exists(subject.comments, (c) => ...)
 * // c.postId becomes: { __kind: "scoped-subject-path", table: "comments", column: "postId" }
 */
export type ScopedSubjectPath<TColumn = unknown> = {
  __kind: "scoped-subject-path";
  table: string;
  column: string;
  phantom?: TColumn;
};

/**
 * Scoped subject proxy (for exists/count/hasMany predicate functions).
 * TypeScript sees this as T, but at runtime it's a scoped proxy.
 *
 * @template T - Table type
 *
 * @example
 * exists(subject.comments, (c) => eq(c.postId, subject.post.id))
 * // c is ScopedSubjectProxy<{ id: string; postId: string; content: string }>
 */
export type ScopedSubjectProxy<T> = T;
