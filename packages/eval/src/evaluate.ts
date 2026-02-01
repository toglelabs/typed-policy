import type { Expr } from "@typed-policy/core";

/**
 * Policy action type - matches the type in policy.ts
 */
type PolicyAction<T, A> = Expr<T, A> | boolean | ((ctx: { actor: A }) => boolean | Expr<T, A>);

/**
 * Resource mapping for nested resource structure
 * All fields are required as per v0.2 design
 */
export type ResourceMapping<T> = {
  [K in keyof T]: {
    [P in keyof T[K]]: T[K][P];
  };
};

/**
 * Options for evaluate function
 */
export type EvaluateOptions<T, A> = {
  actor: A;
  resources: ResourceMapping<T>;
};

/**
 * Resolve a dot-notation path from a nested resources object
 * Path format: "post.published" -> resources.post.published
 */
function resolveValue<T>(path: string, resources: ResourceMapping<T>): unknown {
  const keys = path.split(".");
  let current: unknown = resources;

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
 * Evaluate a policy expression
 *
 * @param expr - The expression to evaluate (Expr, boolean, or function)
 * @param options - Evaluation options with actor and resources
 * @returns boolean result
 *
 * @example
 * ```typescript
 * const canRead = evaluate(postPolicy.actions.read, {
 *   actor: { user: { id: "1", role: "admin" } },
 *   resources: {
 *     post: {
 *       id: "post-1",
 *       ownerId: "user-1",
 *       published: true
 *     }
 *   }
 * });
 * ```
 */
export function evaluate<T, A = unknown>(
  expr: PolicyAction<T, A>,
  options: EvaluateOptions<T, A>,
): boolean {
  const { actor, resources } = options;

  // Handle boolean literals directly
  if (typeof expr === "boolean") {
    return expr;
  }

  // Handle function expressions - functions ONLY receive { actor }
  if (typeof expr === "function") {
    const result = expr({ actor });
    // Recursively evaluate if the function returns an Expr or boolean
    return evaluate(result as PolicyAction<T, A>, { actor, resources });
  }

  // Handle Expr objects
  switch (expr.kind) {
    case "literal": {
      return expr.value;
    }
    case "function": {
      // Functions in Expr only receive { actor }
      const result = expr.fn({ actor });
      // Recursively evaluate if the function returns an Expr or boolean
      return evaluate(result as PolicyAction<T, A>, { actor, resources });
    }
    case "eq": {
      // Path resolution uses resources - DSL accesses resource data
      const leftValue = resolveValue(expr.left, resources);
      const rightValue =
        typeof expr.right === "string" && expr.right.includes(".")
          ? resolveValue(expr.right, resources)
          : expr.right;
      return leftValue === rightValue;
    }
    case "and": {
      return expr.rules.every((rule: Expr<T, A>) => evaluate(rule, { actor, resources }));
    }
    case "or": {
      return expr.rules.some((rule: Expr<T, A>) => evaluate(rule, { actor, resources }));
    }
    default: {
      throw new Error(`Unknown expression kind: ${JSON.stringify(expr)}`);
    }
  }
}
