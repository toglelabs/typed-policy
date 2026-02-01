import type { Expr } from "@typed-policy/core";

function resolveValue(path: string, ctx: Record<string, unknown>): unknown {
  const keys = path.split(".");
  let current: unknown = ctx;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

export function evaluate<T>(expr: Expr<T>, ctx: Record<string, unknown>): boolean {
  switch (expr.kind) {
    case "eq": {
      const leftValue = resolveValue(expr.left, ctx);
      const rightValue =
        typeof expr.right === "string" && expr.right.includes(".")
          ? resolveValue(expr.right, ctx)
          : expr.right;
      return leftValue === rightValue;
    }
    case "and": {
      return expr.rules.every((rule: Expr<T>) => evaluate(rule, ctx));
    }
    case "or": {
      return expr.rules.some((rule: Expr<T>) => evaluate(rule, ctx));
    }
    default: {
      throw new Error(`Unknown expression kind: ${JSON.stringify(expr)}`);
    }
  }
}
