import type { Expr } from "./ast.js";
import type { Path } from "./types.js";

/**
 * Converts a union type to an intersection type
 * Uses distributive conditional types trick
 */
export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * Extracts all subject paths used in an expression
 * This traverses the expression AST and collects all paths that reference the subject (T)
 */
export type ExprPaths<T, A, E extends Expr<T, A>> = E extends {
  kind: "eq";
  left: infer L extends Path<T>;
  right: infer R;
}
  ? R extends Path<T>
    ? L | R
    : L
  : E extends { kind: "and" | "or"; rules: infer Rules extends readonly Expr<T, A>[] }
    ? Rules extends readonly [infer First, ...infer Rest]
      ? First extends Expr<T, A>
        ? Rest extends readonly Expr<T, A>[]
          ? ExprPaths<T, A, First> | ExprPathsMany<T, A, Rest>
          : ExprPaths<T, A, First>
        : never
      : never
    : never;

/**
 * Helper type to extract paths from multiple expressions
 */
type ExprPathsMany<T, A, Rules extends readonly Expr<T, A>[]> = Rules extends readonly [
  infer First,
  ...infer Rest,
]
  ? First extends Expr<T, A>
    ? Rest extends readonly Expr<T, A>[]
      ? ExprPaths<T, A, First> | ExprPathsMany<T, A, Rest>
      : ExprPaths<T, A, First>
    : never
  : never;

/**
 * DeepPick - picks nested properties from an object type using dot-notation paths
 * Similar to a deep version of TypeScript's built-in Pick
 *
 * @example
 * type Obj = { post: { published: boolean; title: string } };
 * type Picked = DeepPick<Obj, "post.published">; // { post: { published: boolean } }
 */
export type DeepPick<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? { [Key in K]: DeepPick<T[K], Rest> }
    : never
  : P extends keyof T
    ? { [Key in P]: T[Key] }
    : never;

/**
 * Builds minimal context containing only the paths referenced in an expression
 * This allows creating a subset of the full context with only what's needed
 *
 * @example
 * type Full = { post: { published: boolean; title: string } };
 * type Minimal = MinimalContext<Full, "post.published">;
 * // Result: { post: { published: boolean } }
 */
export type MinimalContext<T, P extends Path<T>> = UnionToIntersection<DeepPick<T, P>>;

/**
 * Infers the minimal subject context type required for an expression
 * Only includes the paths that are actually referenced in the expression
 *
 * @example
 * type MySubject = { post: { published: boolean; title: string } };
 * type MyActor = { user: { id: string } };
 * type MyExpr = Expr<MySubject, MyActor>; // eq("post.published", true)
 * type Subject = InferSubjectContext<MySubject, MyActor, MyExpr>;
 * // Result: { post: { published: boolean } }
 */
export type InferSubjectContext<T, A, E extends Expr<T, A>> = ExprPaths<T, A, E> extends Path<T>
  ? UnionToIntersection<DeepPick<T, ExprPaths<T, A, E>>>
  : T;

/**
 * Infers the actor context type from an expression
 * The actor context is passed to function expressions and contains user/requester data
 *
 * @example
 * type MyActor = { user: { id: string; role: string } };
 * type MySubject = { post: { published: boolean } };
 * type MyExpr = Expr<MySubject, MyActor>;
 * type Actor = InferActorContext<MySubject, MyActor, MyExpr>;
 * // Result: { user: { id: string; role: string } }
 */
export type InferActorContext<T, A, _E extends Expr<T, A>> = A;
