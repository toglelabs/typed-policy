import type { Expr } from "./ast.js";
import type { EvalContext } from "./context.js";
import { and, or } from "./operators.js";

/**
 * Policy configuration with separate actor and subject types
 *
 * A = Actor context type (the user/requester)
 * S = Subject context type (the resource being accessed)
 *
 * Functions receive { actor, subject } where subject is a symbolic proxy:
 * @example
 * const policy = policy<MyActor, MySubject>({
 *   subject: "Post",
 *   actions: {
 *     // Function: receives actor and subject proxy
 *     read: ({ actor, subject }) => {
 *       if (actor.user.role === "admin") return true;
 *       return eq(subject.post.published, true);
 *     },
 *     // Boolean literal
 *     create: true,
 *     // Declarative DSL with symbolic paths
 *     delete: eq(subject.post.ownerId, actor.user.id)
 *   }
 * });
 */
export interface PolicyConfig<A, S> {
  subject: string;
  actions: {
    [K: string]:
      | Expr<S, A> // Declarative DSL (subject paths)
      | boolean // Boolean literal (true/false)
      | ((ctx: EvalContext<A>) => boolean | Expr<S, A>); // Pure function (actor only)
  };
}

/**
 * Policy type alias for convenience
 */
export type Policy<A, S> = PolicyConfig<A, S>;

/**
 * Define a policy with type-safe actor and subject contexts
 *
 * Actions can be:
 * - Functions: ({ actor, subject }) => boolean | Expr
 * - Declarative: eq(subject.post.published, true)
 * - Literals: true, false
 */
export function policy<A, S>(config: PolicyConfig<A, S>): Policy<A, S> {
  return config;
}

/**
 * Extend a base policy with additional actions
 * Overlapping actions are combined with AND logic
 *
 * @example
 * const basePolicy = policy<Actor, Subject>({
 *   subject: "Resource",
 *   actions: {
 *     read: ({ actor }) => actor.user.role !== "banned"
 *   }
 * });
 *
 * const postPolicy = extend(basePolicy, {
 *   subject: "Post",
 *   actions: {
 *     write: ({ actor }) => actor.user.role === "admin",
 *     delete: ({ actor }) => actor.user.role === "admin"
 *   }
 * });
 */
export function extend<A, S>(
  basePolicy: Policy<A, S>,
  extension: Partial<PolicyConfig<A, S>>,
): Policy<A, S> {
  const mergedActions: PolicyConfig<A, S>["actions"] = { ...basePolicy.actions };

  // Merge actions from extension
  if (extension.actions) {
    for (const [key, value] of Object.entries(extension.actions)) {
      const actionKey = key as string;
      if (actionKey in mergedActions) {
        // Combine overlapping actions with AND
        const baseAction = mergedActions[actionKey];
        const extendedAction = value as PolicyConfig<A, S>["actions"][string];

        // If both are expressions, combine with and()
        if (
          typeof baseAction === "object" &&
          baseAction !== null &&
          "kind" in baseAction &&
          typeof extendedAction === "object" &&
          extendedAction !== null &&
          "kind" in extendedAction
        ) {
          mergedActions[actionKey] = and(baseAction as Expr<S, A>, extendedAction as Expr<S, A>);
        } else {
          // Otherwise, extension overrides
          mergedActions[actionKey] = extendedAction;
        }
      } else {
        // New action, just add it
        mergedActions[actionKey] = value as PolicyConfig<A, S>["actions"][string];
      }
    }
  }

  return {
    subject: extension.subject ?? basePolicy.subject,
    actions: mergedActions,
  };
}

/**
 * Combine multiple policies with AND logic
 * All policies must allow the action for it to be allowed
 *
 * @example
 * const combinedPolicy = andPolicies([
 *   tenantPolicy,
 *   rolePolicy,
 *   statusPolicy
 * ]);
 */
export function andPolicies<A, S>(policies: Policy<A, S>[]): Policy<A, S> {
  if (policies.length === 0) {
    throw new Error("andPolicies requires at least one policy");
  }

  if (policies.length === 1) {
    return policies[0];
  }

  // Collect all unique action names
  const allActions = new Set<string>();
  for (const policy of policies) {
    for (const action of Object.keys(policy.actions)) {
      allActions.add(action);
    }
  }

  // Merge actions with AND
  const mergedActions: PolicyConfig<A, S>["actions"] = {};

  for (const action of allActions) {
    const expressions: Expr<S, A>[] = [];

    for (const policy of policies) {
      if (action in policy.actions) {
        const actionValue = policy.actions[action];
        // Only combine declarative expressions
        if (typeof actionValue === "object" && actionValue !== null && "kind" in actionValue) {
          expressions.push(actionValue as Expr<S, A>);
        }
      }
    }

    if (expressions.length > 0) {
      mergedActions[action] = expressions.length === 1 ? expressions[0] : and(...expressions);
    }
  }

  return {
    subject: policies[0].subject,
    actions: mergedActions,
  };
}

/**
 * Combine multiple policies with OR logic
 * Any policy can allow the action for it to be allowed
 *
 * @example
 * const combinedPolicy = orPolicies([
 *   adminPolicy,
 *   ownerPolicy,
 *   publicPolicy
 * ]);
 */
export function orPolicies<A, S>(policies: Policy<A, S>[]): Policy<A, S> {
  if (policies.length === 0) {
    throw new Error("orPolicies requires at least one policy");
  }

  if (policies.length === 1) {
    return policies[0];
  }

  // Collect all unique action names
  const allActions = new Set<string>();
  for (const policy of policies) {
    for (const action of Object.keys(policy.actions)) {
      allActions.add(action);
    }
  }

  // Merge actions with OR
  const mergedActions: PolicyConfig<A, S>["actions"] = {};

  for (const action of allActions) {
    const expressions: Expr<S, A>[] = [];

    for (const policy of policies) {
      if (action in policy.actions) {
        const actionValue = policy.actions[action];
        // Only combine declarative expressions
        if (typeof actionValue === "object" && actionValue !== null && "kind" in actionValue) {
          expressions.push(actionValue as Expr<S, A>);
        }
      }
    }

    if (expressions.length > 0) {
      mergedActions[action] = expressions.length === 1 ? expressions[0] : or(...expressions);
    }
  }

  return {
    subject: policies[0].subject,
    actions: mergedActions,
  };
}
