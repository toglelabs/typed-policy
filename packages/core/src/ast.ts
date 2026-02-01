import type { Path, PathValue } from "./types.js";

export type Expr<T> =
  | {
      kind: "eq";
      left: Path<T>;
      right: Path<T> | PathValue<T, Path<T>>;
    }
  | {
      kind: "and";
      rules: Expr<T>[];
    }
  | {
      kind: "or";
      rules: Expr<T>[];
    };
