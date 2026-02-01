import type { Expr } from "./ast.js";
import type { EvalContext } from "./context.js";

/**
 * Policy configuration with separate actor and subject types
 *
 * A = Actor context type (the user/requester)
 * S = Subject context type (the resource being accessed)
 *
 * Functions ONLY receive actor - subject is accessed through DSL:
 * @example
 * const policy = policy<MyActor, MySubject>({
 *   subject: "Post",
 *   actions: {
 *     // Function: only actor available
 *     read: ({ actor }) => {
 *       if (actor.user.role === "admin") return true;
 *       return eq("post.published", true); // Subject via DSL
 *     },
 *     // Boolean literal
 *     create: true,
 *     // Declarative DSL
 *     delete: eq("post.ownerId", "user.id")
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
 * Define a policy with type-safe actor and subject contexts
 *
 * Actions can be:
 * - Functions: ({ actor }) => boolean | Expr  (actor only!)
 * - Declarative: eq("post.published", true)  (subject via DSL)
 * - Literals: true, false
 */
export function policy<A, S>(config: PolicyConfig<A, S>): PolicyConfig<A, S> {
  return config;
}
