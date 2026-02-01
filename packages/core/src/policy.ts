import type { Expr } from "./ast.js";

export function policy<T>(def: {
  subject: string;
  actions: Record<string, Expr<T>>;
}) {
  return def;
}
