import type { Expr } from "./ast.js";
import type { Path, PathValue } from "./types.js";

export function eq<T, L extends Path<T>>(left: L, right: Path<T> | PathValue<T, L>): Expr<T> {
  return { kind: "eq", left, right };
}

export function and<T>(...rules: Expr<T>[]): Expr<T> {
  return { kind: "and", rules };
}

export function or<T>(...rules: Expr<T>[]): Expr<T> {
  return { kind: "or", rules };
}
