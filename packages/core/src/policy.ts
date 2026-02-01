import type { Expr } from "./ast.js";
import type { EvalContext } from "./context.js";

/**
 * Policy configuration with separate actor and subject types
 *
 * A = Actor context type (the user/requester)
 * S = Subject context type (the resource being accessed)
 *
 * @example
 * const policy = policy<MyActor, MySubject>({
 *   subject: "Post",
 *   actions: {
 *     read: ({ actor, subject }) => {
 *       if (actor.user.role === "admin") return true;
 *       return subject.post.published;
 *     },
 *     create: true,
 *     delete: eq("post.ownerId", "user.id")
 *   }
 * });
 */
export interface PolicyConfig<A, S> {
  subject: string;
  actions: {
    [K: string]:
      | Expr<S, A> // Declarative DSL
      | boolean // Boolean literal (true/false)
      | ((ctx: EvalContext<A, S>) => boolean | Expr<S, A>); // Pure function
  };
}

/**
 * Define a policy with type-safe actor and subject contexts
 *
 * Actions can be:
 * - Functions: ({ actor, subject }) => boolean | Expr
 * - Declarative: eq("post.published", true)
 * - Literals: true, false
 */
export function policy<A, S>(config: PolicyConfig<A, S>): PolicyConfig<A, S> {
  return config;
}
