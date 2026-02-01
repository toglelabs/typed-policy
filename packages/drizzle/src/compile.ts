import type { EvalContext, Expr } from "@typed-policy/core";
import type { AnyColumn, SQL } from "drizzle-orm";
import { and as drizzleAnd, eq as drizzleEq, or as drizzleOr, sql } from "drizzle-orm";

/** Policy action type - matches the type in policy.ts */
type PolicyAction<T, A> = Expr<T, A> | boolean | ((ctx: EvalContext<A, T>) => boolean | Expr<T, A>);

export type TableMapping<T> = {
  [K in keyof T]?: AnyColumn;
};

export type CompileOptions<T, A = unknown> = {
  /** The actor (user) making the request - used to resolve actor paths and execute functions */
  actor: A;
  /** Mapping from subject paths to Drizzle columns */
  tables: TableMapping<T>;
};

/**
 * Get a Drizzle column from a subject path
 * Only subject paths (starting with a table key in tables) are allowed
 */
function getColumnFromPath<T, A>(path: string, options: CompileOptions<T, A>): AnyColumn {
  const parts = path.split(".");
  const tableKey = parts[0] as keyof T;
  const column = options.tables[tableKey];

  if (!column) {
    throw new Error(
      `Cannot compile path "${path}" to SQL: "${String(tableKey)}" is not a subject table. Only subject paths (mapped in tables) are allowed in SQL compilation. Available subject tables: ${Object.keys(options.tables).join(", ")}`,
    );
  }

  return column;
}

/**
 * Check if a path is an actor path (user.*, not a subject table)
 */
function isActorPath<T, A>(path: string, options: CompileOptions<T, A>): boolean {
  const parts = path.split(".");
  const tableKey = parts[0] as keyof T;
  // It's an actor path if it's not mapped as a subject table
  return !(tableKey in options.tables);
}

/**
 * Get a value from an actor path at compile time
 * Actor values are bound as SQL parameters
 */
function getActorValueFromPath<A>(path: string, actor: A): unknown {
  const parts = path.split(".");

  let current: unknown = actor;
  for (let i = 0; i < parts.length; i++) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[parts[i]];
  }
  return current;
}

/**
 * Resolve the right-hand side of an eq expression
 * - Actor paths are resolved to their values (bound as SQL parameters)
 * - Literal values are returned as-is
 * - Subject paths are NOT allowed (error)
 */
function resolveRightValue<T, A>(
  right: string | number | boolean | null | undefined,
  options: CompileOptions<T, A>,
): unknown {
  // If it's a string that looks like a path (contains dot)
  if (typeof right === "string" && right.includes(".")) {
    // Check if it's an actor path
    if (isActorPath(right, options)) {
      const value = getActorValueFromPath(right, options.actor);
      if (value === undefined) {
        throw new Error(
          `Actor value not found for path: ${right}. Ensure the path exists in the actor context provided to compile().`,
        );
      }
      return value;
    }

    // It's a subject path - not allowed on the right side
    throw new Error(
      `Cannot use subject path "${right}" on the right side of eq(). SQL compilation only supports subject paths on the left side (for column references) and actor paths on the right side (for parameterized values).`,
    );
  }

  // It's a literal value
  return right;
}

/**
 * Compile an expression to Drizzle SQL
 *
 * The key insight: since functions are pure, we execute them during compilation
 * with the provided actor context. This gives us the resulting expression,
 * which we then compile to SQL.
 */
export function compileToDrizzle<T, A>(
  action: PolicyAction<T, A>,
  options: CompileOptions<T, A>,
): SQL {
  // Handle boolean literals directly
  if (typeof action === "boolean") {
    return action ? sql`1 = 1` : sql`1 = 0`;
  }

  // Handle function expressions - execute with actor context
  if (typeof action === "function") {
    const result = action({
      actor: options.actor,
      subject: {} as T,
    });

    // If the function returns a boolean, wrap it as SQL
    if (typeof result === "boolean") {
      return result ? sql`1 = 1` : sql`1 = 0`;
    }

    // Otherwise, compile the resulting expression
    return compileExpr(result, options);
  }

  // Handle Expr objects
  return compileExpr(action, options);
}

/**
 * Internal function to compile Expr AST nodes to SQL
 */
function compileExpr<T, A>(expr: Expr<T, A>, options: CompileOptions<T, A>): SQL {
  switch (expr.kind) {
    case "literal": {
      // Boolean literals: true -> 1 = 1, false -> 1 = 0
      return expr.value ? sql`1 = 1` : sql`1 = 0`;
    }

    case "eq": {
      // Left side must be a subject path (column reference)
      const column = getColumnFromPath(expr.left, options);

      // Right side can be an actor path (resolved to value) or a literal
      const value = resolveRightValue(expr.right as string | number | boolean | null, options);

      return drizzleEq(column, value);
    }

    case "and": {
      if (expr.rules.length === 0) {
        // Empty and() returns true
        return sql`1 = 1`;
      }
      const conditions = expr.rules.map((rule) => compileExpr(rule, options));
      const result = drizzleAnd(...conditions);
      return result || sql`1 = 1`;
    }

    case "or": {
      if (expr.rules.length === 0) {
        // Empty or() returns false
        return sql`1 = 0`;
      }
      const conditions = expr.rules.map((rule) => compileExpr(rule, options));
      const result = drizzleOr(...conditions);
      return result || sql`1 = 0`;
    }

    case "function": {
      // Execute the pure function with the actor context at compile time
      // to get the resulting expression, then compile that expression
      const result = expr.fn({
        actor: options.actor,
        subject: {} as T, // Subject is empty at compile time (will be queried)
      });

      // If the function returns a boolean, wrap it as a literal
      if (typeof result === "boolean") {
        return result ? sql`1 = 1` : sql`1 = 0`;
      }

      // Otherwise, compile the resulting expression
      return compileExpr(result, options);
    }

    default: {
      throw new Error(`Unknown expression kind: ${JSON.stringify(expr)}`);
    }
  }
}

/**
 * Compile a policy expression to Drizzle SQL
 *
 * @example
 * ```typescript
 * const expr = eq("post.published", true);
 * const sql = compile(expr, {
 *   actor: { user: { id: "123", role: "admin" } },
 *   tables: { post: postsTable.id }
 * });
 * ```
 */
export function compile<T, A>(expr: Expr<T, A>, options: CompileOptions<T, A>): SQL {
  return compileToDrizzle(expr, options);
}
