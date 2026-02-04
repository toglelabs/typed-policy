# Architecture Change Progress

## Overview
Implementation of zero-string symbolic API migration as specified in ARCHITECTURE_CHANGE.md.

## Status: Phase 1 Complete ✅, Phase 2-3 In Progress

### Phase 1: Core Rewrite (Foundation) - COMPLETE ✅

#### Completed ✅
- **Phase 1.1** - Created symbolic type system
  - `packages/core/src/symbolic.ts` - All symbolic types defined (SubjectPath, ActorValue, TableRef, etc.)
  - `packages/core/src/proxies.ts` - Proxy factories and helpers with type guards
- **Phase 1.2** - Updated AST to support symbolic paths
  - `packages/core/src/ast.ts` - Replaced string-based paths with symbolic types
  - Added `PathOrValue` type for consistency across operators
- **Phase 1.3** - Operators rewrite
  - `packages/core/src/operators.ts` - Complete rewrite with symbolic API
  - All operators now accept `SubjectPath | ScopedSubjectPath` and `ActorValue`
  - `exists`, `count`, `hasMany` now use `TableRef` with predicate functions
  - `belongsToTenant` now uses `ActorValue` instead of string path
- **Phase 1.4** - Updated policy definition
  - `packages/core/src/policy.ts` - Updated JSDoc examples to use symbolic API
- **Phase 1.5** - Removed deprecated files
  - Deleted `packages/core/src/paths.ts` (no longer needed)
- **Phase 1.6** - Updated core exports
  - `packages/core/src/index.ts` - Exported new symbolic types and helpers

### Phase 2: Evaluate Package - COMPLETE ✅

- **evaluate.ts** - Updated to handle symbolic types
  - New `resolveValue()` function handles `SubjectPath`, `ScopedSubjectPath`, and `ActorValue`
  - All operator cases updated to use symbolic path resolution
  - `exists`, `count`, `hasMany` now support predicate-based evaluation
  - `belongsToTenant` updated to use `ActorValue`

### Phase 3: Drizzle Package - COMPLETE ✅

- **compile.ts** - Updated to handle symbolic types
  - New `getColumnFromPath()` accepts `SubjectPath | ScopedSubjectPath`
  - New `getActorValue()` extracts values from `ActorValue` objects
  - `resolveRightValue()` handles symbolic types and primitives
  - All SQL compilation cases updated for new AST structure

### Phase 4: Tests & Examples - PENDING ⏳

#### Current Status
- **Tests failing** - All tests use old string-based API
  - `packages/eval/src/evaluate.test.ts` - 100+ TypeScript errors
  - Tests need complete rewrite to use new symbolic API

#### Required Work
- Rewrite all tests to use symbolic API:
  ```typescript
  // Old API
  eq<Resources, "post.published", Actor>("post.published", true)
  
  // New API
  eq(subject.post.published, true)
  ```

### Phase 5: Documentation - PENDING ⏳

- Update README with new symbolic API examples
- Document breaking changes
- Add migration guide from string-based to symbolic API

## Current Build Status

| Package | ESM Build | TypeScript Declarations | Tests |
|---------|-----------|------------------------|-------|
| core | ✅ | ✅ | N/A |
| eval | ✅ | ⚠️ (test errors) | ❌ |
| drizzle | ✅ | ⚠️ (test errors) | ❌ |

## Key Changes Made

### 1. Symbolic Types (symbolic.ts)
```typescript
export type SubjectPath<TColumn = unknown> = {
  __kind: "subject-path";
  table: string;
  column: string;
  phantom?: TColumn;
};

export type ActorValue<T = unknown> = {
  __kind: "actor-value";
  value: T;
};

export type TableRef<TTable = unknown> = {
  __kind: "table-ref";
  name: string;
  phantom?: TTable;
};
```

### 2. New Operator Signatures (operators.ts)
```typescript
// Comparison operators
export function eq<T, A = unknown>(
  left: SubjectPath | ScopedSubjectPath,
  right: SubjectPath | ScopedSubjectPath | ActorValue | string | number | boolean | null,
): Expr<T, A>

// Exists with predicate
export function exists<TTable, T, A = unknown>(
  table: TableRef<TTable>,
  predicate: (scoped: TTable) => Expr<T, A>,
): Expr<T, A>

// Belongs to tenant with ActorValue
export function belongsToTenant<T, A = unknown>(
  actorValue: ActorValue,
  subjectPath: SubjectPath | ScopedSubjectPath,
): Expr<T, A>
```

### 3. Usage Examples
```typescript
// Creating proxies
const subject = createSubjectProxy<MySubject>();
const actor = createActorProxy(myActorData);

// Comparison
eq(subject.post.published, true)
eq(subject.post.ownerId, actor.user.id)

// Exists with correlation
exists(subject.comments, (c) =>
  eq(c.postId, subject.post.id)
)

// Tenant scoping
belongsToTenant(actor.user.organizationId, subject.post.organizationId)
```

## Next Steps

1. **Rewrite test suite** - Update all tests to use symbolic API
2. **Update examples** - Convert example projects to new API
3. **Documentation** - Rewrite README and add migration guide
4. **Final verification** - Run full test suite and ensure all packages build correctly

## Notes

- The architecture change is functionally complete
- All packages compile successfully (ESM)
- TypeScript declaration generation fails due to test file errors
- Tests are the only remaining blocker for full completion
- The new API provides stronger type safety with zero string paths

## Last Updated
2026-02-04
