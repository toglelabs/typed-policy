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
 * Resolve a dot-notation path from actor or resources context
 * Path format: "post.published" -> resources.post.published
 * Path format: "user.age" -> actor.user.age
 */
function resolveValue<T, A>(path: string, resources: ResourceMapping<T>, actor: A): unknown {
  const keys = path.split(".");
  const firstKey = keys[0];

  // Determine if this is an actor path by checking if first key exists in actor
  // and not in resources, or exists in both but we prioritize actor for certain keys
  let current: unknown;

  // Check if path starts with a resources key
  if (firstKey && firstKey in resources) {
    current = resources;
  } else if (firstKey && firstKey in (actor as Record<string, unknown>)) {
    // Otherwise try actor
    current = actor;
  } else {
    // Default to resources (will return undefined if not found)
    current = resources;
  }

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
      const leftValue = resolveValue(expr.left, resources, actor);
      const rightValue =
        typeof expr.right === "string" && expr.right.includes(".")
          ? resolveValue(expr.right, resources, actor)
          : expr.right;
      return leftValue === rightValue;
    }
    case "neq": {
      const leftValue = resolveValue(expr.left, resources, actor);
      const rightValue =
        typeof expr.right === "string" && expr.right.includes(".")
          ? resolveValue(expr.right, resources, actor)
          : expr.right;
      return leftValue !== rightValue;
    }
    case "gt": {
      const leftValue = resolveValue(expr.left, resources, actor);
      const rightValue =
        typeof expr.right === "string" && expr.right.includes(".")
          ? resolveValue(expr.right, resources, actor)
          : expr.right;
      if (leftValue == null || rightValue == null) return false;
      return leftValue > rightValue;
    }
    case "lt": {
      const leftValue = resolveValue(expr.left, resources, actor);
      const rightValue =
        typeof expr.right === "string" && expr.right.includes(".")
          ? resolveValue(expr.right, resources, actor)
          : expr.right;
      if (leftValue == null || rightValue == null) return false;
      return leftValue < rightValue;
    }
    case "gte": {
      const leftValue = resolveValue(expr.left, resources, actor);
      const rightValue =
        typeof expr.right === "string" && expr.right.includes(".")
          ? resolveValue(expr.right, resources, actor)
          : expr.right;
      if (leftValue == null || rightValue == null) return false;
      return leftValue >= rightValue;
    }
    case "lte": {
      const leftValue = resolveValue(expr.left, resources, actor);
      const rightValue =
        typeof expr.right === "string" && expr.right.includes(".")
          ? resolveValue(expr.right, resources, actor)
          : expr.right;
      if (leftValue == null || rightValue == null) return false;
      return leftValue <= rightValue;
    }
    case "inArray": {
      const pathValue = resolveValue(expr.path, resources, actor);
      return expr.values.includes(pathValue as never);
    }
    case "isNull": {
      const pathValue = resolveValue(expr.path, resources, actor);
      return pathValue === null;
    }
    case "isNotNull": {
      const pathValue = resolveValue(expr.path, resources, actor);
      return pathValue !== null;
    }
    case "not": {
      return !evaluate(expr.expr, { actor, resources });
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
