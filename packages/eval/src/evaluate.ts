import type { Expr } from "@typed-policy/core";

type EvalContext<A, T> = {
  actor: A;
  subject: T;
};

function resolveValue(path: string, subject: unknown): unknown {
  const keys = path.split(".");
  let current: unknown = subject;

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

export function evaluate<T, A = unknown>(
  expr: Expr<T, A> | boolean | ((ctx: EvalContext<A, T>) => boolean | Expr<T, A>),
  ctx: EvalContext<A, T>,
): boolean {
  // Handle boolean literals directly
  if (typeof expr === "boolean") {
    return expr;
  }

  // Handle function expressions
  if (typeof expr === "function") {
    const result = expr(ctx as EvalContext<A, T>);
    // Recursively evaluate if the function returns an Expr or boolean
    return evaluate(result, ctx);
  }

  // Handle Expr objects
  switch (expr.kind) {
    case "literal": {
      return expr.value;
    }
    case "function": {
      const result = expr.fn(ctx as EvalContext<A, T>);
      // Recursively evaluate if the function returns an Expr or boolean
      return evaluate(result, ctx);
    }
    case "eq": {
      // Support both old context format (flat Record) and new format ({ actor, subject })
      const subject = "subject" in ctx ? ctx.subject : ctx;
      const leftValue = resolveValue(expr.left, subject);
      const rightValue =
        typeof expr.right === "string" && expr.right.includes(".")
          ? resolveValue(expr.right, subject)
          : expr.right;
      return leftValue === rightValue;
    }
    case "and": {
      return expr.rules.every((rule) => evaluate(rule, ctx));
    }
    case "or": {
      return expr.rules.some((rule) => evaluate(rule, ctx));
    }
    default: {
      throw new Error(`Unknown expression kind: ${JSON.stringify(expr)}`);
    }
  }
}
