import type { EvalContext, Expr } from "@typed-policy/core";
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
 * Get a Drizzle column from a subject path
 * Only subject paths (starting with a table key in tables) are allowed
 */
function getColumnFromPath<T>(path: string, tables: TableMapping<T>): AnyColumn {
  const parts = path.split(".");
  const tableKey = parts[0] as keyof T;
  const columnKey = parts[1] as keyof T[typeof tableKey];

  const table = tables[tableKey];

  if (!table) {
    throw new Error(
      `Cannot compile path "${path}" to SQL: "${String(tableKey)}" is not a subject table. Only subject paths (mapped in tables) are allowed in SQL compilation. Available subject tables: ${Object.keys(tables).join(", ")}`,
    );
  }

  const column = table[columnKey];

  if (!column) {
    throw new Error(
      `Cannot compile path "${path}" to SQL: "${String(columnKey)}" is not a valid column on table "${String(tableKey)}". Available columns: ${Object.keys(table).join(", ")}`,
    );
  }

  return column;
}

/**
 * Check if a path is an actor path (not mapped as a subject table)
 */
function isActorPath<T>(path: string, tables: TableMapping<T>): boolean {
  const parts = path.split(".");
  const tableKey = parts[0] as keyof T;
  // It's an actor path if it's not mapped as a subject table
  return !(tableKey in tables);
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
 * Resolve a value for comparison operators
 * - Actor paths are resolved to their values (bound as SQL parameters)
 * - Literal values are returned as-is
 * - Subject paths on right side throw an error
 */
function resolveRightValue<T, A>(
  right: string | number | boolean | null | undefined,
  tables: TableMapping<T>,
  actor: A,
): unknown {
  // If it's a string that looks like a path (contains dot)
  if (typeof right === "string" && right.includes(".")) {
    // Check if it's an actor path
    if (isActorPath(right, tables)) {
      const value = getActorValueFromPath(right, actor);
      if (value === undefined) {
        throw new Error(
          `Actor value not found for path: ${right}. Ensure the path exists in the actor object provided to compile().`,
        );
      }
      return value;
    }

    // It's a subject path - not allowed on the right side
    throw new Error(
      `Cannot use subject path "${right}" on the right side of comparison operator. SQL compilation only supports subject paths on the left side (for column references) and actor paths on the right side (for parameterized values).`,
    );
  }

  // It's a literal value
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

      // Right side can be an actor path (resolved to value) or a literal
      const value = resolveRightValue(
        expr.right as string | number | boolean | null,
        tables,
        actor,
      );

      return drizzleEq(column, value);
    }

    case "neq": {
      const column = getColumnFromPath(expr.left, tables);
      const value = resolveRightValue(
        expr.right as string | number | boolean | null,
        tables,
        actor,
      );
      return drizzleNe(column, value);
    }

    case "gt": {
      const column = getColumnFromPath(expr.left, tables);
      const value = resolveRightValue(
        expr.right as string | number | boolean | null,
        tables,
        actor,
      );
      return drizzleGt(column, value);
    }

    case "lt": {
      const column = getColumnFromPath(expr.left, tables);
      const value = resolveRightValue(
        expr.right as string | number | boolean | null,
        tables,
        actor,
      );
      return drizzleLt(column, value);
    }

    case "gte": {
      const column = getColumnFromPath(expr.left, tables);
      const value = resolveRightValue(
        expr.right as string | number | boolean | null,
        tables,
        actor,
      );
      return drizzleGte(column, value);
    }

    case "lte": {
      const column = getColumnFromPath(expr.left, tables);
      const value = resolveRightValue(
        expr.right as string | number | boolean | null,
        tables,
        actor,
      );
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
      const minValue = resolveRightValue(
        expr.min as string | number | boolean | null,
        tables,
        actor,
      );
      const maxValue = resolveRightValue(
        expr.max as string | number | boolean | null,
        tables,
        actor,
      );
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

      const relatedTable = relatedTables[expr.table];
      if (!relatedTable) {
        throw new Error(
          `Related table "${expr.table}" not found in relatedTables mapping. ` +
            `Available tables: ${Object.keys(relatedTables).join(", ")}`,
        );
      }

      // Build EXISTS subquery
      // Note: This is a simplified version. Full implementation would require
      // access to the actual Drizzle table definitions.
      const conditions = Object.entries(expr.conditions).map(([key, value]) => {
        const column = relatedTable[key];
        if (!column) {
          throw new Error(`Column "${key}" not found in related table "${expr.table}"`);
        }

        // If value looks like a path, resolve it
        if (typeof value === "string" && value.includes(".")) {
          const resolvedValue = isActorPath(value, tables)
            ? getActorValueFromPath(value, actor)
            : value; // Subject path - needs correlation
          return drizzleEq(column, resolvedValue);
        }

        return drizzleEq(column, value);
      });

      // Return EXISTS with subquery using sql template
      const subqueryWhere = conditions.length === 1 ? conditions[0] : drizzleAnd(...conditions);
      return sql`EXISTS (SELECT 1 FROM "${sql.raw(expr.table)}" WHERE ${subqueryWhere})`;
    }

    case "count": {
      if (!relatedTables) {
        throw new Error(
          "count() operator requires relatedTables in compile options. " +
            "Provide the related table schema to enable cross-table queries.",
        );
      }

      const relatedTable = relatedTables[expr.table];
      if (!relatedTable) {
        throw new Error(
          `Related table "${expr.table}" not found in relatedTables mapping. ` +
            `Available tables: ${Object.keys(relatedTables).join(", ")}`,
        );
      }

      // Build COUNT subquery
      const conditions = Object.entries(expr.conditions).map(([key, value]) => {
        const column = relatedTable[key];
        if (!column) {
          throw new Error(`Column "${key}" not found in related table "${expr.table}"`);
        }

        if (typeof value === "string" && value.includes(".")) {
          const resolvedValue = isActorPath(value, tables)
            ? getActorValueFromPath(value, actor)
            : value;
          return drizzleEq(column, resolvedValue);
        }

        return drizzleEq(column, value);
      });

      const subqueryWhere = conditions.length === 1 ? conditions[0] : drizzleAnd(...conditions);
      return sql`(SELECT count(*) FROM "${sql.raw(expr.table)}" WHERE ${subqueryWhere})`;
    }

    case "hasMany": {
      if (!relatedTables) {
        throw new Error(
          "hasMany() operator requires relatedTables in compile options. " +
            "Provide the related table schema to enable cross-table queries.",
        );
      }

      const relatedTable = relatedTables[expr.table];
      if (!relatedTable) {
        throw new Error(
          `Related table "${expr.table}" not found in relatedTables mapping. ` +
            `Available tables: ${Object.keys(relatedTables).join(", ")}`,
        );
      }

      // Build COUNT subquery and compare against minCount
      const conditions = Object.entries(expr.conditions).map(([key, value]) => {
        const column = relatedTable[key];
        if (!column) {
          throw new Error(`Column "${key}" not found in related table "${expr.table}"`);
        }

        if (typeof value === "string" && value.includes(".")) {
          const resolvedValue = isActorPath(value, tables)
            ? getActorValueFromPath(value, actor)
            : value;
          return drizzleEq(column, resolvedValue);
        }

        return drizzleEq(column, value);
      });

      const minCount = expr.minCount ?? 2;
      const subqueryWhere = conditions.length === 1 ? conditions[0] : drizzleAnd(...conditions);
      return sql`(SELECT count(*) FROM "${sql.raw(expr.table)}" WHERE ${subqueryWhere}) >= ${minCount}`;
    }

    case "tenantScoped": {
      const column = getColumnFromPath(expr.path, tables);
      // Extract the field name from the path (e.g., "post.organizationId" -> "organizationId")
      const pathParts = expr.path.split(".");
      const fieldName = pathParts[pathParts.length - 1];
      // Assume actor has the same field (e.g., "user.organizationId")
      const actorPath = `user.${fieldName}`;
      const actorValue = getActorValueFromPath(actorPath, actor);

      if (actorValue === undefined) {
        throw new Error(
          `tenantScoped() requires actor to have field "${fieldName}" at path "${actorPath}"`,
        );
      }

      return drizzleEq(column, actorValue);
    }

    case "belongsToTenant": {
      const actorValue = getActorValueFromPath(expr.actorPath, actor);
      const subjectColumn = getColumnFromPath(expr.subjectPath, tables);

      if (actorValue === undefined) {
        throw new Error(`belongsToTenant() requires actor value at path "${expr.actorPath}"`);
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
