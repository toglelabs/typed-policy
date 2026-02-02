import type { Path, PathValue } from "./types.js";

/**
 * Conditions for cross-table operations
 */
export type CrossTableConditions = Record<string, string | number | boolean | null>;

/**
 * Expression AST type
 *
 * T = Subject context type (paths reference this)
 * A = Actor context type (available to functions)
 *
 * @example
 * type MyExpr = Expr<{ post: { published: boolean } }, { user: { role: string } }>;
 */
export type Expr<T, A = unknown> =
  | {
      kind: "eq";
      left: Path<T>;
      right: Path<T> | PathValue<T, Path<T>>;
    }
  | {
      kind: "neq";
      left: Path<T>;
      right: Path<T> | PathValue<T, Path<T>>;
    }
  | {
      kind: "gt";
      left: Path<T>;
      right: Path<T> | PathValue<T, Path<T>>;
    }
  | {
      kind: "lt";
      left: Path<T>;
      right: Path<T> | PathValue<T, Path<T>>;
    }
  | {
      kind: "gte";
      left: Path<T>;
      right: Path<T> | PathValue<T, Path<T>>;
    }
  | {
      kind: "lte";
      left: Path<T>;
      right: Path<T> | PathValue<T, Path<T>>;
    }
  | {
      kind: "inArray";
      path: Path<T>;
      values: PathValue<T, Path<T>>[];
    }
  | {
      kind: "isNull";
      path: Path<T>;
    }
  | {
      kind: "isNotNull";
      path: Path<T>;
    }
  | {
      kind: "startsWith";
      path: Path<T>;
      prefix: string;
    }
  | {
      kind: "endsWith";
      path: Path<T>;
      suffix: string;
    }
  | {
      kind: "contains";
      path: Path<T>;
      value: string;
    }
  | {
      kind: "between";
      path: Path<T>;
      min: Path<T> | PathValue<T, Path<T>>;
      max: Path<T> | PathValue<T, Path<T>>;
    }
  | {
      kind: "matches";
      path: Path<T>;
      pattern: string; // Store as string, compile to RegExp
      flags?: string;
    }
  | {
      kind: "exists";
      table: string;
      conditions: CrossTableConditions;
    }
  | {
      kind: "count";
      table: string;
      conditions: CrossTableConditions;
    }
  | {
      kind: "hasMany";
      table: string;
      conditions: CrossTableConditions;
      minCount?: number; // Default: 2
    }
  | {
      kind: "tenantScoped";
      path: Path<T>;
    }
  | {
      kind: "belongsToTenant";
      actorPath: string; // e.g., "user.organizationId"
      subjectPath: Path<T>; // e.g., "post.organizationId"
    }
  | {
      kind: "not";
      expr: Expr<T, A>;
    }
  | {
      kind: "and";
      rules: Expr<T, A>[];
    }
  | {
      kind: "or";
      rules: Expr<T, A>[];
    }
  | {
      kind: "literal";
      value: boolean;
    }
  | {
      kind: "function";
      fn: (ctx: { actor: A }) => boolean | Expr<T, A>;
      description?: string;
    };
