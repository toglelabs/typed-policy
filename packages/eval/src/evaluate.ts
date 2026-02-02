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
    case "startsWith": {
      const pathValue = resolveValue(expr.path, resources, actor);
      if (typeof pathValue !== "string") return false;
      return pathValue.startsWith(expr.prefix);
    }
    case "endsWith": {
      const pathValue = resolveValue(expr.path, resources, actor);
      if (typeof pathValue !== "string") return false;
      return pathValue.endsWith(expr.suffix);
    }
    case "contains": {
      const pathValue = resolveValue(expr.path, resources, actor);
      if (typeof pathValue === "string") {
        return pathValue.includes(expr.value);
      }
      if (Array.isArray(pathValue)) {
        return pathValue.includes(expr.value);
      }
      return false;
    }
    case "between": {
      const pathValue = resolveValue(expr.path, resources, actor);
      const minValue =
        typeof expr.min === "string" && expr.min.includes(".")
          ? resolveValue(expr.min, resources, actor)
          : expr.min;
      const maxValue =
        typeof expr.max === "string" && expr.max.includes(".")
          ? resolveValue(expr.max, resources, actor)
          : expr.max;
      if (pathValue == null || minValue == null || maxValue == null) return false;
      return pathValue >= minValue && pathValue <= maxValue;
    }
    case "matches": {
      const pathValue = resolveValue(expr.path, resources, actor);
      if (typeof pathValue !== "string") return false;
      const regex = new RegExp(expr.pattern, expr.flags);
      return regex.test(pathValue);
    }
    case "exists": {
      throw new Error(
        "exists() operator is compile-only and cannot be evaluated on the frontend. " +
          "Use compile() from @typed-policy/drizzle to generate SQL.",
      );
    }
    case "count": {
      throw new Error(
        "count() operator is compile-only and cannot be evaluated on the frontend. " +
          "Use compile() from @typed-policy/drizzle to generate SQL.",
      );
    }
    case "hasMany": {
      throw new Error(
        "hasMany() operator is compile-only and cannot be evaluated on the frontend. " +
          "Use compile() from @typed-policy/drizzle to generate SQL.",
      );
    }
    case "tenantScoped": {
      // tenantScoped("post.organizationId") means post.organizationId must match actor's organization
      // This requires the actor to have an organizationId field
      const subjectValue = resolveValue(expr.path, resources, actor);
      // Extract the field name from the path (e.g., "post.organizationId" -> "organizationId")
      const pathParts = expr.path.split(".");
      const fieldName = pathParts[pathParts.length - 1];
      // Try to find the corresponding actor field
      const actorPath = `user.${fieldName}`;
      const actorValue = resolveValue(actorPath, resources, actor);
      if (subjectValue == null || actorValue == null) return false;
      return subjectValue === actorValue;
    }
    case "belongsToTenant": {
      const actorValue = resolveValue(expr.actorPath, resources, actor);
      const subjectValue = resolveValue(expr.subjectPath, resources, actor);
      if (actorValue == null || subjectValue == null) return false;
      return actorValue === subjectValue;
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
