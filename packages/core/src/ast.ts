import type { Path, PathValue } from "./types.js";

/**
 * Expression AST type
 *
 * T = Subject context type (paths reference this)
 * A = Actor context type (available to functions)
 *
 * @example
 * type MyExpr = Expr<{ post: { published: boolean } }, { user: { role: string } }>;
 */
export type Expr<T, A = unknown> =
  | {
      kind: "eq";
      left: Path<T>;
      right: Path<T> | PathValue<T, Path<T>>;
    }
  | {
      kind: "and";
      rules: Expr<T, A>[];
    }
  | {
      kind: "or";
      rules: Expr<T, A>[];
    }
  | {
      kind: "literal";
      value: boolean;
    }
  | {
      kind: "function";
      fn: (ctx: { actor: A; subject: T }) => boolean | Expr<T, A>;
      description?: string;
    };
