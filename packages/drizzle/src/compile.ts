import type { EvalContext, Expr } from "@typed-policy/core";
import {
  type ActorValue,
  type ScopedSubjectPath,
  type SubjectPath,
  getPathInfo,
  getTableName,
  isActorValue,
} from "@typed-policy/core";
import type { AnyColumn, SQL } from "drizzle-orm";
import {
  and as drizzleAnd,
  between as drizzleBetween,
  eq as drizzleEq,
  gt as drizzleGt,
  gte as drizzleGte,
  inArray as drizzleInArray,
  isNotNull as drizzleIsNotNull,
  isNull as drizzleIsNull,
  like as drizzleLike,
  lt as drizzleLt,
  lte as drizzleLte,
  ne as drizzleNe,
  or as drizzleOr,
  sql,
} from "drizzle-orm";

/** Policy action type - matches the type in policy.ts */
type PolicyAction<T, A> = Expr<T, A> | boolean | ((ctx: EvalContext<A>) => boolean | Expr<T, A>);

/** Mapping of subject tables to their columns */
export type TableMapping<T> = {
  [K in keyof T]: {
    [P in keyof T[K]]: AnyColumn;
  };
};

/** Mapping of related tables for cross-table operations */
export type RelatedTableMapping = {
  [tableName: string]: Record<string, AnyColumn>;
};

export type CompileOptions<T, A> = {
  actor: A;
  tables: TableMapping<T>;
  relatedTables?: RelatedTableMapping;
};

/**
 * Get a Drizzle column from a SubjectPath or ScopedSubjectPath
 */
function getColumnFromPath<T>(
  path: SubjectPath | ScopedSubjectPath,
  tables: TableMapping<T>,
): AnyColumn {
  const { table, column } = getPathInfo(path);
  const tableKey = table as keyof T;
  const columnKey = column as keyof T[typeof tableKey];

  const tableDef = tables[tableKey];

  if (!tableDef) {
    throw new Error(
      `Cannot compile path to SQL: "${String(tableKey)}" is not a subject table. Only subject paths (mapped in tables) are allowed in SQL compilation. Available subject tables: ${Object.keys(tables).join(", ")}`,
    );
  }

  const columnDef = tableDef[columnKey];

  if (!columnDef) {
    throw new Error(
      `Cannot compile path to SQL: "${String(columnKey)}" is not a valid column on table "${String(tableKey)}". Available columns: ${Object.keys(tableDef).join(", ")}`,
    );
  }

  return columnDef;
}

/**
 * Get a value from an ActorValue at compile time
 * Actor values are bound as SQL parameters
 */
function getActorValue(actorValue: ActorValue): unknown {
  return actorValue.value;
}

/**
 * Resolve a value for comparison operators
 * - ActorValue is resolved to its value (bound as SQL parameter)
 * - Literal values are returned as-is
 */
function resolveRightValue<T, A>(
  right:
    | SubjectPath
    | ScopedSubjectPath
    | ActorValue
    | string
    | number
    | boolean
    | null
    | undefined,
  _tables: TableMapping<T>,
  _actor: A,
): unknown {
  if (isActorValue(right)) {
    return getActorValue(right);
  }

  // It's a literal value (including undefined)
  return right;
}

/**
 * Compile a policy action to Drizzle SQL
 *
 * The key insight: since functions are pure, we execute them during compilation
 * with the provided actor context. This gives us the resulting expression,
 * which we then compile to SQL.
 *
 * @example
 * ```typescript
 * const listCondition = compile(postPolicy.actions.list, {
 *   actor,
 *   tables: {
 *     post: {
 *       id: posts.id,
 *       ownerId: posts.ownerId,
 *       published: posts.published
 *     }
 *   }
 * });
 * ```
 */
export function compile<T, A>(action: PolicyAction<T, A>, options: CompileOptions<T, A>): SQL {
  const { actor, tables } = options;

  // Handle boolean literals directly
  if (typeof action === "boolean") {
    return action ? sql`1 = 1` : sql`1 = 0`;
  }

  // Handle function expressions - execute with actor context ONLY
  if (typeof action === "function") {
    const result = action({
      actor,
    });

    // If the function returns a boolean, wrap it as SQL
    if (typeof result === "boolean") {
      return result ? sql`1 = 1` : sql`1 = 0`;
    }

    // Otherwise, compile the resulting expression
    return compileExpr(result, tables, actor, options.relatedTables);
  }

  // Handle Expr objects
  return compileExpr(action, tables, actor, options.relatedTables);
}

/**
 * Internal function to compile Expr AST nodes to SQL
 */
function compileExpr<T, A>(
  expr: Expr<T, A>,
  tables: TableMapping<T>,
  actor: A,
  relatedTables?: RelatedTableMapping,
): SQL {
  switch (expr.kind) {
    case "literal": {
      // Boolean literals: true -> 1 = 1, false -> 1 = 0
      return expr.value ? sql`1 = 1` : sql`1 = 0`;
    }

    case "eq": {
      // Left side must be a subject path (column reference)
      const column = getColumnFromPath(expr.left, tables);

      // Right side can be an ActorValue (resolved to value) or a literal
      const value = resolveRightValue(expr.right, tables, actor);

      return drizzleEq(column, value);
    }

    case "neq": {
      const column = getColumnFromPath(expr.left, tables);
      const value = resolveRightValue(expr.right, tables, actor);
      return drizzleNe(column, value);
    }

    case "gt": {
      const column = getColumnFromPath(expr.left, tables);
      const value = resolveRightValue(expr.right, tables, actor);
      return drizzleGt(column, value);
    }

    case "lt": {
      const column = getColumnFromPath(expr.left, tables);
      const value = resolveRightValue(expr.right, tables, actor);
      return drizzleLt(column, value);
    }

    case "gte": {
      const column = getColumnFromPath(expr.left, tables);
      const value = resolveRightValue(expr.right, tables, actor);
      return drizzleGte(column, value);
    }

    case "lte": {
      const column = getColumnFromPath(expr.left, tables);
      const value = resolveRightValue(expr.right, tables, actor);
      return drizzleLte(column, value);
    }

    case "inArray": {
      const column = getColumnFromPath(expr.path, tables);
      return drizzleInArray(column, expr.values);
    }

    case "isNull": {
      const column = getColumnFromPath(expr.path, tables);
      return drizzleIsNull(column);
    }

    case "isNotNull": {
      const column = getColumnFromPath(expr.path, tables);
      return drizzleIsNotNull(column);
    }

    case "startsWith": {
      const column = getColumnFromPath(expr.path, tables);
      return drizzleLike(column, `${expr.prefix}%`);
    }

    case "endsWith": {
      const column = getColumnFromPath(expr.path, tables);
      return drizzleLike(column, `%${expr.suffix}`);
    }

    case "contains": {
      const column = getColumnFromPath(expr.path, tables);
      return drizzleLike(column, `%${expr.value}%`);
    }

    case "between": {
      const column = getColumnFromPath(expr.path, tables);
      const minValue = resolveRightValue(expr.min, tables, actor);
      const maxValue = resolveRightValue(expr.max, tables, actor);
      return drizzleBetween(column, minValue, maxValue);
    }

    case "matches": {
      const column = getColumnFromPath(expr.path, tables);
      // Convert JS RegExp pattern to SQL pattern (simplified)
      // For complex patterns, this is an approximation
      const sqlPattern = expr.pattern
        .replace(/\\d/g, "[0-9]")
        .replace(/\\w/g, "[a-zA-Z0-9_]")
        .replace(/\\s/g, " ")
        .replace(/\.\*/g, "%")
        .replace(/\./g, "_");
      return drizzleLike(column, sqlPattern);
    }

    case "exists": {
      if (!relatedTables) {
        throw new Error(
          "exists() operator requires relatedTables in compile options. " +
            "Provide the related table schema to enable cross-table queries.",
        );
      }

      const tableName = getTableName(expr.table);
      const relatedTable = relatedTables[tableName];

      if (!relatedTable) {
        throw new Error(
          `Related table "${tableName}" not found in relatedTables mapping. ` +
            `Available tables: ${Object.keys(relatedTables).join(", ")}`,
        );
      }

      // TODO: Implement predicate-based exists
      // For now, throw an error indicating this needs implementation
      throw new Error(
        "exists() with predicate-based API requires full implementation. " +
          "Please update compile.ts to handle predicate functions.",
      );
    }

    case "count": {
      if (!relatedTables) {
        throw new Error(
          "count() operator requires relatedTables in compile options. " +
            "Provide the related table schema to enable cross-table queries.",
        );
      }

      const tableName = getTableName(expr.table);
      const relatedTable = relatedTables[tableName];

      if (!relatedTable) {
        throw new Error(
          `Related table "${tableName}" not found in relatedTables mapping. ` +
            `Available tables: ${Object.keys(relatedTables).join(", ")}`,
        );
      }

      // TODO: Implement predicate-based count
      throw new Error(
        "count() with predicate-based API requires full implementation. " +
          "Please update compile.ts to handle predicate functions.",
      );
    }

    case "hasMany": {
      if (!relatedTables) {
        throw new Error(
          "hasMany() operator requires relatedTables in compile options. " +
            "Provide the related table schema to enable cross-table queries.",
        );
      }

      const tableName = getTableName(expr.table);
      const relatedTable = relatedTables[tableName];

      if (!relatedTable) {
        throw new Error(
          `Related table "${tableName}" not found in relatedTables mapping. ` +
            `Available tables: ${Object.keys(relatedTables).join(", ")}`,
        );
      }

      // TODO: Implement predicate-based hasMany
      throw new Error(
        "hasMany() with predicate-based API requires full implementation. " +
          "Please update compile.ts to handle predicate functions.",
      );
    }

    case "tenantScoped": {
      const column = getColumnFromPath(expr.path, tables);
      // Get the column name from the path
      const { column: columnName } = getPathInfo(expr.path);

      // Assume actor has the same field (e.g., "user.organizationId")
      const actorAsRecord = actor as Record<string, unknown>;
      let actorValue: unknown;

      // Try user.{column} pattern
      if (actorAsRecord.user && typeof actorAsRecord.user === "object") {
        actorValue = (actorAsRecord.user as Record<string, unknown>)[columnName];
      }

      // Try direct access as fallback
      if (actorValue === undefined) {
        actorValue = actorAsRecord[columnName];
      }

      if (actorValue === undefined) {
        throw new Error(`tenantScoped() requires actor to have field "${columnName}"`);
      }

      return drizzleEq(column, actorValue);
    }

    case "belongsToTenant": {
      const actorValue = getActorValue(expr.actorValue);
      const subjectColumn = getColumnFromPath(expr.subjectPath, tables);

      if (actorValue === undefined) {
        throw new Error("belongsToTenant() requires actor value");
      }

      return drizzleEq(subjectColumn, actorValue);
    }

    case "not": {
      const innerCondition = compileExpr(expr.expr, tables, actor, relatedTables);
      return sql`NOT (${innerCondition})`;
    }

    case "and": {
      if (expr.rules.length === 0) {
        // Empty and() returns true
        return sql`1 = 1`;
      }
      const conditions = expr.rules.map((rule) => compileExpr(rule, tables, actor, relatedTables));
      const result = drizzleAnd(...conditions);
      return result || sql`1 = 1`;
    }

    case "or": {
      if (expr.rules.length === 0) {
        // Empty or() returns false
        return sql`1 = 0`;
      }
      const conditions = expr.rules.map((rule) => compileExpr(rule, tables, actor, relatedTables));
      const result = drizzleOr(...conditions);
      return result || sql`1 = 0`;
    }

    case "function": {
      // Execute the pure function with the actor context at compile time
      // to get the resulting expression, then compile that expression
      const result = expr.fn({
        actor,
      });

      // If the function returns a boolean, wrap it as a literal
      if (typeof result === "boolean") {
        return result ? sql`1 = 1` : sql`1 = 0`;
      }

      // Otherwise, compile the resulting expression
      return compileExpr(result, tables, actor, relatedTables);
    }

    default: {
      throw new Error(`Unknown expression kind: ${JSON.stringify(expr)}`);
    }
  }
}
