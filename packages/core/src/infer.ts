import type { Expr } from "./ast.js";
// import type { Path } from "./types.js"; // TODO: Remove when migrating to symbolic paths

/**
 * Converts a union type to an intersection type
 * Uses distributive conditional types trick
 */
export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

// TODO: Rewrite these types for symbolic paths
// For now, comment out to allow compilation
// These utilities are designed for string-based paths

// /**
//  * Extracts all subject paths used in an expression
//  * This traverses the expression AST and collects all paths that reference the subject (T)
//  */
// export type ExprPaths<T, A, E extends Expr<T, A>> = never;

// /**
//  * Helper type to extract paths from multiple expressions
//  */
// type ExprPathsMany<T, A, Rules extends readonly Expr<T, A>[]> = never;

// /**
//  * DeepPick - picks nested properties from an object type using dot-notation paths
//  * Similar to a deep version of TypeScript's built-in Pick
//  *
//  * @example
//  * type Obj = { post: { published: boolean; title: string } };
//  * type Picked = DeepPick<Obj, "post.published">; // { post: { published: boolean } }
//  */
// export type DeepPick<T, P extends string> = never;

// /**
//  * Builds minimal context containing only the paths referenced in an expression
//  * This allows creating a subset of the full context with only what's needed
//  *
//  * @example
//  * type Full = { post: { published: boolean; title: string } };
//  * type Minimal = MinimalContext<Full, "post.published">;
//  * // Result: { post: { published: boolean } }
//  */
// export type MinimalContext<T, P extends string> = T;

// /**
//  * Infers the minimal subject context type required for an expression
//  * Only includes the paths that are actually referenced in the expression
//  *
//  * @example
//  * type MySubject = { post: { published: boolean; title: string } };
//  * type MyActor = { user: { id: string } };
//  * type MyExpr = Expr<MySubject, MyActor>; // eq("post.published", true)
//  * type Subject = InferSubjectContext<MySubject, MyActor, MyExpr>;
//  * // Result: { post: { published: boolean } }
//  */
// export type InferSubjectContext<T, A, E extends Expr<T, A>> = T;

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
