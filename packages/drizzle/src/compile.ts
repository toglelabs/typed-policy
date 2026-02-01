import type { Expr } from "@typed-policy/core";
import type { AnyColumn, SQL } from "drizzle-orm";
import { and as drizzleAnd, eq as drizzleEq, or as drizzleOr, sql } from "drizzle-orm";

export type TableMapping<T> = {
  [K in keyof T]?: AnyColumn;
};

export type CompileOptions<T> = {
  user: Record<string, unknown>;
  tables: TableMapping<T>;
};

function getColumnFromPath<T>(path: string, options: CompileOptions<T>): AnyColumn {
  const parts = path.split(".");
  const tableKey = parts[0] as keyof T;
  const column = options.tables[tableKey];

  if (!column) {
    throw new Error(
      `No table mapping found for: ${String(tableKey)}. Available mappings: ${Object.keys(options.tables).join(", ")}`,
    );
  }

  return column;
}

function getValueFromPath<T>(path: string, options: CompileOptions<T>): unknown {
  const parts = path.split(".");

  if (parts[0] === "user") {
    let current: unknown = options.user;
    for (let i = 1; i < parts.length; i++) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[parts[i]];
    }
    return current;
  }

  throw new Error(`Cannot get value from path: ${path}. Only user.* paths are supported.`);
}

export function compileToDrizzle<T>(expr: Expr<T>, options: CompileOptions<T>): SQL {
  switch (expr.kind) {
    case "eq": {
      const column = getColumnFromPath(expr.left, options);

      let value: unknown;
      if (typeof expr.right === "string" && expr.right.includes(".")) {
        value = getValueFromPath(expr.right, options);
        if (value === undefined) {
          throw new Error(`Value not found for path: ${expr.right}`);
        }
      } else {
        value = expr.right;
      }

      return drizzleEq(column, value);
    }

    case "and": {
      if (expr.rules.length === 0) {
        return sql`1 = 1`;
      }
      const conditions = expr.rules.map((rule: Expr<T>) => compileToDrizzle(rule, options));
      return drizzleAnd(...conditions) || sql`1 = 1`;
    }

    case "or": {
      if (expr.rules.length === 0) {
        return sql`1 = 0`;
      }
      const conditions = expr.rules.map((rule: Expr<T>) => compileToDrizzle(rule, options));
      return drizzleOr(...conditions) || sql`1 = 0`;
    }

    default: {
      throw new Error(`Unknown expression kind: ${JSON.stringify(expr)}`);
    }
  }
}

export function compile<T>(expr: Expr<T>, options: CompileOptions<T>): SQL {
  return compileToDrizzle(expr, options);
}
