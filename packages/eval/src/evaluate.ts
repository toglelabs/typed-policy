import type { ActorValue, Expr, ScopedSubjectPath, SubjectPath } from "@typed-policy/core";
import {
  getPathInfo,
  getTableName,
  isActorValue,
  isScopedSubjectPath,
  isSubjectPath,
} from "@typed-policy/core";

/**
 * Policy action type - matches the type in policy.ts
 */
type PolicyAction<T, A> = Expr<T, A> | boolean | ((ctx: { actor: A }) => boolean | Expr<T, A>);

/**
 * Resource mapping for nested resource structure
 * All fields are required as per v0.2 design
 */
export type ResourceMapping<T> = {
  [K in keyof T]: T[K] extends Array<infer U> ? U[] : T[K];
};

/**
 * Options for evaluate function
 */
export type EvaluateOptions<T, A> = {
  actor: A;
  resources: ResourceMapping<T>;
};

/**
 * Resolve a SubjectPath or ScopedSubjectPath from resources
 */
function resolvePathValue<T>(
  path: SubjectPath | ScopedSubjectPath,
  resources: ResourceMapping<T>,
): unknown {
  const { table, column } = getPathInfo(path);

  // Get the resource (table) from resources
  const resource = (resources as Record<string, unknown>)[table];
  if (resource === null || resource === undefined) {
    return undefined;
  }

  // Return the column value
  return (resource as Record<string, unknown>)[column];
}

/**
 * Resolve an ActorValue from the actor object
 */
function resolveActorValue<A>(_actorValue: ActorValue, _actor: A): unknown {
  return _actorValue.value;
}

/**
 * Resolve a value which can be a path, actor value, or primitive
 */
function resolveValue<T, A>(
  value:
    | SubjectPath
    | ScopedSubjectPath
    | ActorValue
    | string
    | number
    | boolean
    | null
    | undefined,
  resources: ResourceMapping<T>,
  actor: A,
): unknown {
  if (isSubjectPath(value) || isScopedSubjectPath(value)) {
    return resolvePathValue(value, resources);
  }

  if (isActorValue(value)) {
    return resolveActorValue(value, actor);
  }

  // Primitive value (including undefined)
  return value;
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
      const rightValue = resolveValue(expr.right, resources, actor);
      return leftValue === rightValue;
    }
    case "neq": {
      const leftValue = resolveValue(expr.left, resources, actor);
      const rightValue = resolveValue(expr.right, resources, actor);
      return leftValue !== rightValue;
    }
    case "gt": {
      const leftValue = resolveValue(expr.left, resources, actor);
      const rightValue = resolveValue(expr.right, resources, actor);
      if (leftValue == null || rightValue == null) return false;
      return leftValue > rightValue;
    }
    case "lt": {
      const leftValue = resolveValue(expr.left, resources, actor);
      const rightValue = resolveValue(expr.right, resources, actor);
      if (leftValue == null || rightValue == null) return false;
      return leftValue < rightValue;
    }
    case "gte": {
      const leftValue = resolveValue(expr.left, resources, actor);
      const rightValue = resolveValue(expr.right, resources, actor);
      if (leftValue == null || rightValue == null) return false;
      return leftValue >= rightValue;
    }
    case "lte": {
      const leftValue = resolveValue(expr.left, resources, actor);
      const rightValue = resolveValue(expr.right, resources, actor);
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
      const minValue = resolveValue(expr.min, resources, actor);
      const maxValue = resolveValue(expr.max, resources, actor);
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
      // Get the table name from TableRef
      const tableName = getTableName(expr.table);

      // Get the related resources from the resources object
      const relatedResources = (resources as Record<string, unknown>)[tableName];

      // Must be an array for exists to work
      if (!Array.isArray(relatedResources)) {
        return false;
      }

      // Create a scoped proxy for evaluating the predicate
      // For each row in the related table, evaluate the predicate
      for (const row of relatedResources) {
        // Create a temporary resources object with the scoped row
        const scopedResources = {
          ...resources,
          [tableName]: row,
        } as ResourceMapping<T>;

        // Evaluate the predicate with the scoped row
        // Note: The predicate function creates an Expr, we need to evaluate it
        // This is a simplified version - the actual implementation would need
        // to handle the predicate function properly
        const predicateResult = evaluate(expr.predicate, {
          actor,
          resources: scopedResources,
        });

        if (predicateResult) {
          return true;
        }
      }

      return false;
    }
    case "count": {
      // Get the table name from TableRef
      const tableName = getTableName(expr.table);

      // Get the related resources from the resources object
      const relatedResources = (resources as Record<string, unknown>)[tableName];

      // Must be an array for count to work
      if (!Array.isArray(relatedResources)) {
        return 0 >= 1; // Default comparison if no resources
      }

      // Count matching rows
      let count = 0;
      for (const row of relatedResources) {
        const scopedResources = {
          ...resources,
          [tableName]: row,
        } as ResourceMapping<T>;

        const predicateResult = evaluate(expr.predicate, {
          actor,
          resources: scopedResources,
        });

        if (predicateResult) {
          count++;
        }
      }

      // Return the count (caller will compare against threshold)
      return count >= 1;
    }
    case "hasMany": {
      // Get the table name from TableRef
      const tableName = getTableName(expr.table);
      const minCount = expr.minCount ?? 2;

      // Get the related resources from the resources object
      const relatedResources = (resources as Record<string, unknown>)[tableName];

      // Must be an array for hasMany to work
      if (!Array.isArray(relatedResources)) {
        return false;
      }

      // Count matching rows
      let count = 0;
      for (const row of relatedResources) {
        const scopedResources = {
          ...resources,
          [tableName]: row,
        } as ResourceMapping<T>;

        const predicateResult = evaluate(expr.predicate, {
          actor,
          resources: scopedResources,
        });

        if (predicateResult) {
          count++;
        }
      }

      return count >= minCount;
    }
    case "tenantScoped": {
      // tenantScoped(subject.post.organizationId) means post.organizationId must match actor's organization
      // This requires the actor to have an organizationId field
      const subjectValue = resolveValue(expr.path, resources, actor);

      // Get the column name from the path
      const { column } = getPathInfo(expr.path);

      // Try to find the corresponding actor field - check common patterns
      const actorAsRecord = actor as Record<string, unknown>;
      let actorValue: unknown;

      // Try user.{column} pattern
      if (actorAsRecord.user && typeof actorAsRecord.user === "object") {
        actorValue = (actorAsRecord.user as Record<string, unknown>)[column];
      }

      // Try direct access as fallback
      if (actorValue === undefined) {
        actorValue = actorAsRecord[column];
      }

      if (subjectValue == null || actorValue == null) return false;
      return subjectValue === actorValue;
    }
    case "belongsToTenant": {
      const actorValue = resolveActorValue(expr.actorValue, actor);
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
