import type { AnyColumn } from "drizzle-orm";

export type PathMapping<T> = {
  [K in keyof T]?: AnyColumn;
};

export function createMapping<T>(mappings: PathMapping<T>): PathMapping<T> {
  return mappings;
}

export function validateMapping<T>(path: string, mapping: PathMapping<T>): boolean {
  const parts = path.split(".");
  const root = parts[0] as keyof T;
  return root in mapping;
}
