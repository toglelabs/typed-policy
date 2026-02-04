export type { Primitive } from "./types.js";
export type { Expr } from "./ast.js";
export type {
  SubjectPath,
  ActorValue,
  TableRef,
  SubjectProxy,
  ScopedSubjectPath,
  ScopedSubjectProxy,
} from "./symbolic.js";
export {
  createSubjectProxy,
  createActorProxy,
  createScopedProxy,
  isSubjectPath,
  isScopedSubjectPath,
  isActorValue,
  isTableRef,
  isProxy,
  normalizePath,
  normalizeValue,
  getTableName,
  getPathInfo,
} from "./proxies.js";
export type {
  ActorContext,
  SubjectContext,
  EvalContext,
  FullContext,
  ResourceMapping,
} from "./context.js";
export {
  eq,
  neq,
  gt,
  lt,
  gte,
  lte,
  inArray,
  isNull,
  isNotNull,
  startsWith,
  endsWith,
  contains,
  between,
  matches,
  exists,
  count,
  hasMany,
  tenantScoped,
  belongsToTenant,
  not,
  and,
  or,
} from "./operators.js";
export { policy, extend, andPolicies, orPolicies } from "./policy.js";
export type { PolicyConfig, Policy } from "./policy.js";
export type {
  UnionToIntersection,
  InferActorContext,
} from "./infer.js";
export { createContextError } from "./errors.js";
