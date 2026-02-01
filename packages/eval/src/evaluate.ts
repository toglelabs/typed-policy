import type { Expr } from "@typed-policy/core";

/**
 * Resolve a dot-notation path from an object
 */
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

/**
 * EvalContext passed to policy functions
 * Functions ONLY receive actor - subject is accessed through DSL (eq, and, or)
 */
type EvalContext<A> = {
  actor: A;
};

/**
 * Evaluate a policy expression
 *
 * @param expr - The expression to evaluate (Expr, boolean, or function)
 * @param actor - The actor context (user/requester)
 * @param subject - The subject context (resource being accessed)
 * @returns boolean result
 *
 * @example
 * evaluate(policy.actions.read, { user: { id: "1", role: "admin" } }, { post: { published: true } });
 */
export function evaluate<T, A = unknown>(
  expr: Expr<T, A> | boolean | ((ctx: EvalContext<A>) => boolean | Expr<T, A>),
  actor: A,
  subject: T,
): boolean {
  // Handle boolean literals directly
  if (typeof expr === "boolean") {
    return expr;
  }

  // Handle function expressions - functions ONLY receive { actor }
  if (typeof expr === "function") {
    const fn = expr as (ctx: EvalContext<A>) => boolean | Expr<T, A>;
    const result = fn({ actor });
    // Recursively evaluate if the function returns an Expr or boolean
    return evaluate(result as Expr<T, A> | boolean, actor, subject);
  }

  // Handle Expr objects
  switch (expr.kind) {
    case "literal": {
      return expr.value;
    }
    case "function": {
      // Functions in Expr only receive { actor }
      const result = (expr.fn as (ctx: { actor: A }) => boolean | Expr<T, A>)({ actor });
      // Recursively evaluate if the function returns an Expr or boolean
      return evaluate(result as Expr<T, A> | boolean, actor, subject);
    }
    case "eq": {
      // Path resolution uses subject - DSL accesses subject data
      const leftValue = resolveValue(expr.left, subject);
      const rightValue =
        typeof expr.right === "string" && expr.right.includes(".")
          ? resolveValue(expr.right, subject)
          : expr.right;
      return leftValue === rightValue;
    }
    case "and": {
      return expr.rules.every((rule) => evaluate(rule, actor, subject));
    }
    case "or": {
      return expr.rules.some((rule) => evaluate(rule, actor, subject));
    }
    default: {
      throw new Error(`Unknown expression kind: ${JSON.stringify(expr)}`);
    }
  }
}
