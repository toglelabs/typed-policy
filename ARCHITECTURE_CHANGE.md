# Typed Policy — Final Redesign Plan (Zero-String, Symbolic API)

> **Goal**
> Design the *correct* long-term API for Typed Policy by removing string paths, eliminating ambiguity, and unifying frontend evaluation and backend compilation under a single symbolic AST.

This document is the **source of truth** for the Typed Policy redesign.

---

## Assumptions

This plan assumes:

* 🚨 **Breaking changes are allowed**
* ✅ `compileToDrizzle` is renamed to `compile`
* ❌ `relations` is removed entirely

---

## 1️⃣ Breaking change is OK

Since the package is not yet published:

* ❌ No backward compatibility
* ❌ No dual API
* ❌ No string overloads
* ❌ No deprecation layers

✅ We design the *right* API once.

This enables:

* a smaller core
* stronger type guarantees
* fewer runtime checks
* a cleaner mental model

---

## 2️⃣ Single compiler: `compile`

`compileToDrizzle` is renamed to:

```ts
compile(expr, options)
```

### Rationale

* There is **one compiler**
* SQL generation is an adapter concern
* Other backends (Prisma, raw SQL, etc.) can be added later

---

## 3️⃣ `relations` is NOT needed (and removed)

### Final decision

**`relations` does not exist.**

All tables that may appear in a policy must be explicitly provided via `tables`.

---

### Why `relations` is unnecessary

`relations` was intended to:

* give `exists()` access to related tables

But this is already solved by `tables`.

```ts
compile(expr, {
  actor,
  tables: {
    post: posts,
    comments: comments,
    assignments: taskAssignments,
  }
});
```

This already defines:

* all legal tables
* all legal columns
* all allowed joins / subqueries

Adding `relations`:

* duplicates responsibility
* risks divergence
* complicates typing
* weakens security guarantees

---

## 4️⃣ Hard rule (SQL-side invariant)

> **Any table referenced in a policy MUST be explicitly present in `tables`.**

This applies to:

* the main subject
* `exists`
* `count`
* `hasMany`
* future joins

This mirrors SQL privilege models and is a **major correctness and security win**.

---

## 5️⃣ Zero-string API (core shift)

### ❌ Old (string-based)

```ts
eq("post.ownerId", "user.id")
```

### ✅ New (symbolic)

```ts
eq(subject.post.ownerId, actor.user.id)
```

### Key distinctions

| Concept                       | Nature              |
| ----------------------------- | ------------------- |
| `actor.*`                     | runtime values      |
| `subject.*`                   | symbolic references |
| operators (`eq`, `and`, etc.) | AST builders        |

Strings are removed entirely from user-facing APIs.

---

## 6️⃣ Symbolic subject model

`subject` is **not data**.
It is a **typed symbolic proxy** used to build an AST.

Internally:

```ts
type SubjectPath<T> = {
  __kind: "subject-path";
  table: string;
  column: string;
  phantom?: T;
};
```

Example:

```ts
subject.post.ownerId
// → SubjectPath<string>
```

---

## 7️⃣ Final `exists` API (clean & minimal)

### Policy authoring

```ts
list: ({ actor, subject }) =>
  exists(subject.comments, (c) =>
    eq(c.postId, subject.post.id)
  )
```

### Compile

```ts
compile(policy.actions.list, {
  actor,
  tables: {
    post: posts,
    comments: comments,
  },
});
```

### Guarantees

* ❌ No table-name strings
* ❌ No column-name strings
* ❌ No uncorrelated subqueries
* ❌ No hidden SQL
* ✅ Correlation enforced by construction

---

## 8️⃣ How `exists` works internally

### Table reference

```ts
type TableRef<T> = {
  __kind: "table-ref";
  name: string;
  phantom?: T;
};
```

```ts
subject.comments
// → TableRef<Comment>
```

### Scoped predicate

```ts
exists(tableRef, (c) => Expr)
```

* `c` is a scoped symbolic proxy for the related table
* outer subject paths remain available
* correlation is mandatory and explicit

---

## 9️⃣ `compile` signature (final)

```ts
compile<TSubject, TActor>(
  action: PolicyAction<TSubject, TActor>,
  options: {
    actor: TActor;
    tables: {
      [K in keyof TSubject | ExtraTables]: DrizzleTable;
    };
  }
)
```

### Hard guarantees

* ❌ Cannot reference undeclared tables
* ❌ Cannot inject arbitrary SQL
* ❌ Cannot forget correlation
* ✅ Full type safety
* ✅ Explicit SQL surface

---

## 🔟 Frontend `evaluate` (browser-safe)

### Core invariant

> **`evaluate()` only reasons over data you explicitly provide.**

* No DB access
* No implicit fetching
* No side effects
* Deterministic and synchronous

---

### Evaluate usage

```ts
evaluate(policy.actions.read, {
  actor,
  resources: {
    post,
    comments, // optional, if exists() is used
  },
});
```

---

### 🔒 Data-shape invariants for `evaluate`

> **Invariant:**
>
> If a table is used as the target of `exists`, `count`, or `hasMany`,
> then the corresponding entry in `resources` **MUST be an array**.
>
> * A missing entry or non-array value is treated as “no rows”
> * `exists` evaluates to `false`
> * `count` evaluates to `0`
> * `hasMany` evaluates accordingly
>
> No automatic coercion (e.g. `{}` → `[{…}]`) is performed.

This behavior intentionally mirrors SQL semantics:

> “Given the data I have, does a matching row exist?”

#### Examples

```ts
// ✅ Correct
resources: {
  company: Company,
  company_joining: CompanyJoining[],
}

// ❌ Incorrect (treated as no rows)
resources: {
  company: Company,
  company_joining: CompanyJoining,
}
```

This rule is **intentional** and **non-negotiable**.

---

## 1️⃣1️⃣ What this removes (by design)

| Removed             | Reason         |
| ------------------- | -------------- |
| `relations`         | Redundant      |
| string table names  | Unsafe         |
| string column paths | Bug-prone      |
| path parsing        | Runtime errors |
| raw SQL identifiers | Injection risk |
| compile-only hacks  | Unified AST    |

---

## 1️⃣2️⃣ Clean mental model (final)

| Concept                       | Meaning                |
| ----------------------------- | ---------------------- |
| `actor`                       | Runtime values         |
| `subject.*`                   | Symbolic query paths   |
| `exists(subject.comments, …)` | Correlated subquery    |
| `tables`                      | Explicit SQL surface   |
| `resources`                   | Available runtime data |
| `compile()`                   | Backend interpreter    |
| `evaluate()`                  | Frontend interpreter   |

Same AST. Two interpreters. No ambiguity.

---

## 1️⃣3️⃣ Implementation phases

### Phase 1 — Core rewrite

* Remove all string paths
* Introduce symbolic proxies
* Update all operators (`eq`, `gt`, `and`, etc.)

### Phase 2 — Exists redesign

* `exists(tableRef, predicate)`
* Scoped predicate
* Mandatory correlation

### Phase 3 — Compiler cleanup

* Single `compile()`
* No `relations`
* No raw SQL
* `tables` are authoritative

### Phase 4 — Docs & examples

* Rewrite README
* Explain symbolic vs runtime
* Document `exists` and data-shape invariants clearly
* Emphasize invariants

---

## Final recommendation

This is the **right architectural decision**:

* ✔ Breaking change now (cheap)
* ✔ No compatibility hacks
* ✔ Explicit tables
* ✔ Explicit data requirements
* ✔ Zero strings
* ✔ One AST, two interpreters

This foundation will scale cleanly to:

* complex joins
* Prisma / other ORMs
* policy visualization
* static analysis
* enterprise-grade authorization models
