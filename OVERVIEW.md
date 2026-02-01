# Typed Policy Engine (End-to-End Blueprint)

> **Policy-as-Code for TypeScript**
>
> One policy →
> • compile to SQL (Drizzle)
> • evaluate to boolean (frontend)
> • guaranteed type safety
> • zero runtime magic

---

## 1️⃣ Problem This Project Solves

Modern TypeScript apps suffer from **policy drift**:

* Frontend checks permissions one way
* Backend enforces differently
* SQL filters get forgotten or mis-implemented
* ORMs (especially Drizzle) lack first-class policy composition

**This project provides:**

* A **single canonical policy**
* Written once
* Compiled to:

  * boolean evaluators (UI)
  * SQL filters (backend)
* With **compile-time guarantees** that policies are correct

---

## 2️⃣ Core Principles (Non-Negotiable)

These guide every design decision.

### 1. Declarative policies

Policies are **data**, not imperative code.

### 2. One context, statically typed

All rules are defined against **one fixed policy context**.

### 3. Type safety > expressiveness

If TypeScript can’t prove it, the API doesn’t allow it.

### 4. Same AST, different executors

Frontend and backend **consume the same policy**, never re-implement logic.

### 5. Zero runtime reflection

No decorators, no proxies, no schema inspection.

---

## 3️⃣ What This Project Is / Is Not

### ✅ It IS

* A policy definition DSL
* A typed AST
* A compiler target for ORMs
* A runtime evaluator
* Framework-agnostic

### ❌ It is NOT

* An auth provider
* A role-permission table
* A rule engine with async hooks
* A replacement for backend enforcement

---

## 4️⃣ High-Level Architecture

```
User Policy (TypeScript)
        ↓
  Typed AST (core)
        ↓
 ┌──────────────┬──────────────┐
 │              │              │
evaluate()   compileToSQL   (future)
(frontend)   (Drizzle)     (Prisma, raw SQL)
```

---

## 5️⃣ Monorepo Layout (Required)

```
typed-policy/
├─ packages/
│  ├─ core/
│  │  ├─ src/
│  │  │  ├─ policy.ts
│  │  │  ├─ ast.ts
│  │  │  ├─ operators.ts
│  │  │  ├─ paths.ts
│  │  │  └─ types.ts
│  │  └─ index.ts
│  │
│  ├─ eval/
│  │  ├─ src/evaluate.ts
│  │  └─ index.ts
│  │
│  ├─ drizzle/
│  │  ├─ src/compile.ts
│  │  ├─ src/mapping.ts
│  │  └─ index.ts
│
├─ examples/
│  ├─ react/
│  └─ hono-drizzle/
│
├─ tsconfig.base.json
├─ package.json
└─ README.md
```

---

## 6️⃣ Core Types (Foundation)

### Policy Context

```ts
export type PolicyContext = {
  user: {
    id: string
    role: "admin" | "user"
  }
  post: {
    id: string
    ownerId: string
    published: boolean
  }
}
```

> Every policy is bound to **exactly one context type**.

---

## 7️⃣ Path System (Critical)

### Path Extraction

```ts
type Primitive = string | number | boolean | null | undefined

export type Path<T> =
  T extends Primitive
    ? never
    : {
        [K in keyof T & string]:
          T[K] extends Primitive
            ? K
            : K | `${K}.${Path<T[K]>}`
      }[keyof T & string]
```

### Value-at-Path

```ts
export type PathValue<T, P extends Path<T>> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? PathValue<T[K], Extract<Rest, Path<T[K]>>>
      : never
    : P extends keyof T
      ? T[P]
      : never
```

This powers **all safety guarantees**.

---

## 8️⃣ AST Definition

```ts
export type Expr<T> =
  | {
      kind: "eq"
      left: Path<T>
      right: Path<T> | PathValue<T, Path<T>>
    }
  | {
      kind: "and"
      rules: Expr<T>[]
    }
  | {
      kind: "or"
      rules: Expr<T>[]
    }
```

Users never construct this directly.

---

## 9️⃣ Public DSL (Core API)

### Operators

```ts
export function eq<T, L extends Path<T>>(
  left: L,
  right: Path<T> | PathValue<T, L>
): Expr<T> {
  return { kind: "eq", left, right }
}

export function and<T>(...rules: Expr<T>[]): Expr<T> {
  return { kind: "and", rules }
}

export function or<T>(...rules: Expr<T>[]): Expr<T> {
  return { kind: "or", rules }
}
```

### Policy Wrapper

```ts
export function policy<T>(def: {
  subject: string
  actions: Record<string, Expr<T>>
}) {
  return def
}
```

---

## 🔟 Developer Experience (What Users Write)

```ts
export const postPolicy = policy<PolicyContext>({
  subject: "Post",
  actions: {
    read: or(
      eq("user.role", "admin"),
      eq("post.ownerId", "user.id")
    ),
    delete: or(
      eq("user.role", "admin"),
      eq("post.ownerId", "user.id")
    )
  }
})
```

### Compile-time guarantees

❌ `"user.rol"`
❌ `"post.owner"`
❌ `"superadmin"`
❌ comparing incompatible types

---

## 1️⃣1️⃣ Context Narrowing (Advanced but Essential)

Policies **slice the required runtime context** automatically.

### Extract used paths

```ts
type ExprPaths<T, E> =
  E extends { kind: "eq"; left: infer L; right: infer R }
    ? L | (R extends Path<T> ? R : never)
    : E extends { rules: infer R extends Expr<T>[] }
      ? ExprPaths<T, R[number]>
      : never
```

### Build minimal required context

```ts
type ContextFromExpr<T, E> =
  UnionToIntersection<PickByPath<T, ExprPaths<T, E>>>
```

This ensures:

* No over-fetching
* No missing data
* Perfect frontend DX

---

## 1️⃣2️⃣ Frontend Evaluator (`@typed-policy/eval`)

### API

```ts
evaluate(expr, context) => boolean
```

### Implementation sketch

```ts
export function evaluate<T>(
  expr: Expr<T>,
  ctx: any
): boolean {
  switch (expr.kind) {
    case "eq":
      return resolve(expr.left, ctx) === resolve(expr.right, ctx)
    case "and":
      return expr.rules.every(r => evaluate(r, ctx))
    case "or":
      return expr.rules.some(r => evaluate(r, ctx))
  }
}
```

Frontend uses this for:

* conditional rendering
* disabled states
* optimistic UI

---

## 1️⃣3️⃣ Drizzle Compiler (`@typed-policy/drizzle`)

### Goal

Compile:

```ts
eq("post.ownerId", "user.id")
```

Into:

```ts
posts.ownerId = $userId
```

### API

```ts
compileToDrizzle(expr, {
  user,
  tables: { post: postsTable }
})
```

### Mapping Strategy

* `"post.ownerId"` → `postsTable.ownerId`
* `"user.id"` → bound parameter
* `"admin"` → SQL literal

### Guarantees

* Missing table mapping → ❌ compile error
* Invalid column → ❌ compile error
* Policy always enforced at query level

---

## 1️⃣4️⃣ Constraints (By Design)

This project **does NOT support**:

* async rules
* API calls
* time-based conditions
* joins across unknown tables
* non-deterministic logic

These belong elsewhere.

---

## 1️⃣5️⃣ MVP Scope (Build This First)

### v0.1 (Ship This)

* `eq`, `and`, `or`
* frontend evaluation
* Drizzle `where` compilation
* single-table policies
* full type safety

### v0.2

* `in`, `neq`
* multi-tenant helpers
* row-level filters

### v1.0

* Prisma adapter
* SQL AST output
* policy visualization
* ESLint rule enforcement

---

## 1️⃣6️⃣ What to Ask OpenCode to Do

Use this **step order**:

1. Scaffold monorepo with `pnpm + tsup`
2. Implement `Path<T>` + `PathValue<T, P>`
3. Build AST + DSL
4. Add frontend evaluator
5. Add Drizzle compiler
6. Write README with one killer example
7. Publish `@typed-policy/core`

---

## Final Take

This is:

* **small**
* **sharp**
* **useful**
* **difficult in exactly the right places**

If built correctly, this becomes:

> “CASL, but actually safe — and Drizzle-native.”
