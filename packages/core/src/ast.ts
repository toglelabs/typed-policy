import type {
  ActorValue,
  Primitive,
  ScopedSubjectPath,
  SubjectPath,
  TableRef,
} from "./symbolic.js";

/**
 * Path or value type for right side of operators
 * Includes SubjectPath, ScopedSubjectPath, ActorValue, and primitive types
 */
export type PathOrValue = SubjectPath | ScopedSubjectPath | ActorValue | Primitive;

/**
 * Expression AST type
 *
 * T = Subject context type (paths reference this)
 * A = Actor context type (available to functions)
 *
 * @example
 * type MyExpr = Expr<{ post: { published: boolean } }, { user: { role: string } }>;
 */
export type Expr<T, A> =
  | {
      kind: "eq";
      left: SubjectPath | ScopedSubjectPath;
      right: PathOrValue;
    }
  | {
      kind: "neq";
      left: SubjectPath | ScopedSubjectPath;
      right: PathOrValue;
    }
  | {
      kind: "gt";
      left: SubjectPath | ScopedSubjectPath;
      right: PathOrValue;
    }
  | {
      kind: "lt";
      left: SubjectPath | ScopedSubjectPath;
      right: PathOrValue;
    }
  | {
      kind: "gte";
      left: SubjectPath | ScopedSubjectPath;
      right: PathOrValue;
    }
  | {
      kind: "lte";
      left: SubjectPath | ScopedSubjectPath;
      right: PathOrValue;
    }
  | { kind: "inArray"; path: SubjectPath | ScopedSubjectPath; values: Primitive[] }
  | { kind: "isNull"; path: SubjectPath | ScopedSubjectPath }
  | { kind: "isNotNull"; path: SubjectPath | ScopedSubjectPath }
  | { kind: "startsWith"; path: SubjectPath | ScopedSubjectPath; prefix: string }
  | { kind: "endsWith"; path: SubjectPath | ScopedSubjectPath; suffix: string }
  | { kind: "contains"; path: SubjectPath | ScopedSubjectPath; value: string }
  | {
      kind: "between";
      path: SubjectPath | ScopedSubjectPath;
      min: PathOrValue;
      max: PathOrValue;
    }
  | { kind: "matches"; path: SubjectPath | ScopedSubjectPath; pattern: string; flags?: string }
  | { kind: "exists"; table: TableRef; predicate: Expr<any, A> }
  | { kind: "count"; table: TableRef; predicate: Expr<any, A> }
  | { kind: "hasMany"; table: TableRef; predicate: Expr<any, A>; minCount?: number }
  | { kind: "tenantScoped"; path: SubjectPath | ScopedSubjectPath }
  | {
      kind: "belongsToTenant";
      actorValue: ActorValue;
      subjectPath: SubjectPath | ScopedSubjectPath;
    }
  | { kind: "not"; expr: Expr<T, A> }
  | { kind: "and"; rules: Expr<T, A>[] }
  | { kind: "or"; rules: Expr<T, A>[] }
  | { kind: "literal"; value: boolean }
  | {
      kind: "function";
      fn: (ctx: { actor: A }) => boolean | Expr<T, A>;
      description?: string;
    };
