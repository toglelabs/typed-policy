/**
 * Proxy factories for zero-string API
 *
 * Creates proxies that capture path access and convert to AST nodes.
 * Proxies are only used during policy authoring and are immediately
 * converted to concrete AST nodes (SubjectPath, TableRef, etc.).
 */

import type {
  ActorValue,
  Primitive,
  ScopedSubjectPath,
  ScopedSubjectProxy,
  SubjectPath,
  SubjectProxy,
  TableRef,
} from "./symbolic.js";

/**
 * Creates a symbolic proxy for subject.
 * The proxy captures table and column access and returns plain objects
 * (SubjectPath or TableRef) instead of staying as a proxy.
 *
 * @example
 * const subject = createSubjectProxy<MySubject>();
 * subject.post.id // → { __kind: "subject-path", table: "post", column: "id" }
 * subject.comments // → { __kind: "table-ref", name: "comments" }
 */
export function createSubjectProxy<T>(): SubjectProxy<T> {
  return createProxyTarget({ table: undefined, path: [] }) as any;
}

/**
 * Creates a simple proxy wrapper for actor.
 * Actor values are runtime data, so this just returns the actor object
 * with a marker for identification.
 *
 * @param actor - Actor object
 * @returns Actor object with __isProxy marker
 *
 * @example
 * const actor = createActorProxy({ user: { id: "1", role: "admin" } });
 * actor.user.id // → "1" (direct access to runtime data)
 */
export function createActorProxy<A>(actor: A): A {
  const proxy = new Proxy(actor as any, {
    get(_target, prop) {
      if (prop === "__isProxy") return true;
      if (prop === "__kind") return "actor-proxy";
      return (actor as any)[prop];
    },
  });
  return proxy as A;
}

/**
 * Creates a scoped proxy for exists/count/hasMany predicates.
 * Paths accessed through this proxy are marked as ScopedSubjectPath.
 *
 * @param tableName - Name of the table being scoped
 * @returns Scoped proxy that marks paths as scoped
 *
 * @internal
 */
export function createScopedProxy<T>(tableName: string): ScopedSubjectProxy<T> {
  return createProxyTarget({ table: tableName, path: [] }) as any;
}

/**
 * Internal proxy target creation.
 * Handles both table-level and column-level access.
 *
 * @param ctx - Proxy context with current table and path
 * @returns Proxy object
 */
function createProxyTarget(ctx: {
  table: string | undefined;
  path: (string | symbol)[];
}): any {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "__isProxy") return true;
        if (prop === "__kind") {
          return ctx.table ? "subject-path" : "table-ref";
        }
        if (prop === "__table") return ctx.table;
        if (prop === "__column") return ctx.path[ctx.path.length - 1];
        if (typeof prop === "symbol") return undefined;

        const propStr = prop as string;

        if (!ctx.table) {
          return createProxyTarget({
            table: propStr,
            path: [...ctx.path, propStr],
          });
        }

        return createProxyTarget({
          table: ctx.table,
          path: [...ctx.path, propStr],
        });
      },
      has(_target, prop) {
        if (
          prop === "__isProxy" ||
          prop === "__kind" ||
          prop === "__table" ||
          prop === "__column"
        ) {
          return true;
        }
        return false;
      },
    },
  );
}

/**
 * Type guard to check if value is a SubjectPath.
 */
export function isSubjectPath(value: unknown): value is SubjectPath {
  return (
    typeof value === "object" &&
    value !== null &&
    "__kind" in value &&
    (value as any).__kind === "subject-path"
  );
}

/**
 * Type guard to check if value is a ScopedSubjectPath.
 */
export function isScopedSubjectPath(value: unknown): value is ScopedSubjectPath {
  return (
    typeof value === "object" &&
    value !== null &&
    "__kind" in value &&
    (value as any).__kind === "scoped-subject-path"
  );
}

/**
 * Type guard to check if value is an ActorValue.
 */
export function isActorValue(value: unknown): value is ActorValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "__kind" in value &&
    (value as any).__kind === "actor-value"
  );
}

/**
 * Type guard to check if value is a TableRef.
 */
export function isTableRef(value: unknown): value is TableRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "__kind" in value &&
    (value as any).__kind === "table-ref"
  );
}

/**
 * Type guard to check if value is any kind of proxy.
 */
export function isProxy(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "__isProxy" in value &&
    (value as any).__isProxy === true
  );
}

/**
 * Check if value is a concrete SubjectPath (not a proxy).
 */
function isConcreteSubjectPath(value: unknown): value is SubjectPath {
  return (
    typeof value === "object" &&
    value !== null &&
    "__kind" in value &&
    (value as any).__kind === "subject-path" &&
    "table" in value &&
    "column" in value
  );
}

/**
 * Check if value is a concrete ScopedSubjectPath (not a proxy).
 */
function isConcreteScopedSubjectPath(value: unknown): value is ScopedSubjectPath {
  return (
    typeof value === "object" &&
    value !== null &&
    "__kind" in value &&
    (value as any).__kind === "scoped-subject-path" &&
    "table" in value &&
    "column" in value
  );
}

/**
 * Check if value is a concrete TableRef (not a proxy).
 */
function isConcreteTableRef(value: unknown): value is TableRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "__kind" in value &&
    (value as any).__kind === "table-ref" &&
    "name" in value
  );
}

/**
 * Normalizes a proxy to a concrete AST node.
 * Handles SubjectPath, ScopedSubjectPath, and TableRef.
 *
 * @param path - Proxy or AST node
 * @returns Concrete AST node (SubjectPath, ScopedSubjectPath, or TableRef)
 */
export function normalizePath(path: any): SubjectPath | ScopedSubjectPath | TableRef {
  // If it's already a concrete path (not a proxy), return as-is
  if (
    isConcreteSubjectPath(path) ||
    isConcreteScopedSubjectPath(path) ||
    isConcreteTableRef(path)
  ) {
    return path;
  }

  // If it's a proxy, extract values and create a concrete object
  if (isProxy(path)) {
    const kind = path.__kind;
    const table = path.__table;
    const column = path.__column;

    if (kind === "subject-path") {
      return {
        __kind: "subject-path",
        table,
        column,
      } as SubjectPath;
    }

    if (kind === "scoped-subject-path") {
      return {
        __kind: "scoped-subject-path",
        table,
        column,
      } as ScopedSubjectPath;
    }

    if (kind === "table-ref") {
      return {
        __kind: "table-ref",
        name: table,
      } as TableRef;
    }
  }

  throw new Error(`Cannot normalize path: ${JSON.stringify(path)}`);
}

/**
 * Normalizes a value for use in operators.
 * If input is an ActorValue, returns it.
 * If input is a primitive, returns it.
 * Otherwise wraps it in ActorValue.
 *
 * @param value - Value to normalize
 * @returns ActorValue or primitive
 */
export function normalizeValue(value: any): ActorValue | Primitive {
  if (isActorValue(value)) {
    return value;
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  // If value has __kind field (TableRef, etc.), return it as-is (not wrapped)
  // Otherwise wrap in ActorValue
  if (value && typeof value === "object" && "__kind" in value) {
    return value;
  }

  return {
    __kind: "actor-value",
    value,
  };
}

/**
 * Extracts table name from a TableRef or proxy.
 *
 * @param table - TableRef or proxy
 * @returns Table name string
 */
export function getTableName(table: any): string {
  if (isTableRef(table)) {
    return table.name;
  }

  if (isProxy(table)) {
    return table.__table;
  }

  throw new Error(`Cannot extract table name from: ${JSON.stringify(table)}`);
}

/**
 * Extracts path info from a SubjectPath or proxy.
 * Throws error for TableRef since it doesn't have a column.
 *
 * @param path - SubjectPath or proxy
 * @returns Object with table and column
 */
export function getPathInfo(path: any): { table: string; column: string } {
  const normalized = normalizePath(path);

  if (isTableRef(normalized)) {
    throw new Error("TableRef does not have a column. Use getTableName() instead.");
  }

  return {
    table: normalized.table,
    column: normalized.column,
  };
}
