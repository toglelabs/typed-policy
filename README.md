# Typed Policy

[![npm version](https://img.shields.io/npm/v/@typed-policy/core.svg)](https://www.npmjs.com/package/@typed-policy/core)
[![CI](https://github.com/toglelabs/typed-policy/workflows/CI/badge.svg)](https://github.com/toglelabs/typed-policy/actions)
[![codecov](https://codecov.io/gh/toglelabs/typed-policy/branch/main/graph/badge.svg)](https://codecov.io/gh/toglelabs/typed-policy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Policy-as-Code for TypeScript**
>
> One policy definition → compile to SQL (Drizzle) + evaluate to boolean (frontend) with guaranteed type safety and zero runtime magic.

## Features

- **Type-safe**: Compile-time path validation prevents typos and mismatched types
- **Universal**: Same policy runs on frontend and backend
- **Zero runtime dependencies**: Core package has no dependencies
- **Framework agnostic**: Works with React, Vue, Svelte, Hono, Express, etc.
- **Drizzle native**: First-class support for Drizzle ORM
- **Policy drift prevention**: Single source of truth for authorization logic

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
  - [Define Your Policy](#define-your-policy)
  - [Frontend Evaluation](#frontend-evaluation)
  - [Backend SQL Compilation](#backend-sql-compilation)
- [Packages](#packages)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Migration Guide](#migration-guide)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

```typescript
import { policy, eq, and, or } from "@typed-policy/core";
import { evaluate } from "@typed-policy/eval";

// Define types for your actor and subject
type MyActor = {
  user: { id: string; role: "admin" | "user" };
};

type MySubject = {
  post: { id: string; ownerId: string; published: boolean };
};

// 1. Define your policy with actor and subject types
const postPolicy = policy<MyActor, MySubject>({
  subject: "Post",
  actions: {
    // Functions for complex logic
    read: ({ actor, subject }) => {
      if (actor.user.role === "admin") return true;
      return subject.post.published || actor.user.id === subject.post.ownerId;
    },
    // Boolean literals
    create: true,
    // Declarative DSL
    delete: eq("post.ownerId", "user.id")
  }
});

// 2. Evaluate on frontend
const canRead = evaluate(postPolicy.actions.read, {
  actor: { user: { id: "1", role: "user" } },
  subject: { post: { id: "1", ownerId: "1", published: false } }
});
// → true

// 3. Compile to SQL on backend (Drizzle)
import { compileToDrizzle } from "@typed-policy/drizzle";
const where = compileToDrizzle(postPolicy.actions.read, {
  actor: { user: { id: "1", role: "user" } },
  tables: { post: posts.ownerId }
});
```

## Installation

```bash
# Core package (required)
npm install @typed-policy/core

# For frontend evaluation
npm install @typed-policy/eval

# For Drizzle ORM integration
npm install @typed-policy/drizzle
```

Or with pnpm:

```bash
pnpm add @typed-policy/core @typed-policy/eval @typed-policy/drizzle
```

## Usage

### Define Your Policy

Policies are defined with separate actor and subject types. Actions can be:

1. **Function expressions** - Pure functions receiving `{ actor, subject }`
2. **Boolean literals** - `true` or `false`
3. **Declarative DSL** - Using operators like `eq`, `and`, `or`

```typescript
import { policy, eq, and, or } from "@typed-policy/core";

type MyActor = {
  user: {
    id: string;
    role: "admin" | "user";
    organizationId: string;
  };
};

type MySubject = {
  resource: {
    id: string;
    ownerId: string;
    organizationId: string;
    status: "draft" | "published" | "archived";
  };
};

export const resourcePolicy = policy<MyActor, MySubject>({
  subject: "Resource",
  actions: {
    // Admin can do everything
    read: ({ actor }) => actor.user.role === "admin",

    // Users can read published resources in their org
    list: ({ actor, subject }) =>
      subject.resource.status === "published" &&
      subject.resource.organizationId === actor.user.organizationId,

    // Owners or admins can update (using DSL)
    update: or(
      eq("resource.ownerId", "user.id"),
      ({ actor }) => actor.user.role === "admin"
    ),

    // Only admins can delete
    delete: ({ actor }) => actor.user.role === "admin"
  }
});
```

**Type Safety**: TypeScript will catch errors at compile time:

```typescript
// ❌ Error: "actor.user.rol" is not a valid path
({ actor }) => actor.user.rol === "admin"

// ❌ Error: Type 'string' is not assignable to 'admin' | 'user'
({ actor }) => actor.user.role === "superadmin"

// ❌ Error: Type mismatch in eq()
eq("resource.ownerId", true)
```

### Frontend Evaluation

Use `@typed-policy/eval` to evaluate policies in the browser:

```typescript
import { evaluate } from "@typed-policy/eval";

// Check permissions for UI rendering
function PostCard({ post, user }) {
  const canEdit = evaluate(resourcePolicy.actions.update, {
    actor: { user },
    subject: { resource: post }
  });

  return (
    <div>
      <h2>{post.title}</h2>
      {canEdit && <button>Edit</button>}
    </div>
  );
}

// Check for route guards
const canAccess = evaluate(resourcePolicy.actions.read, {
  actor: { user },
  subject: { resource: post }
});
if (!canAccess) {
  return <Redirect to="/unauthorized" />;
}
```

### Backend SQL Compilation

Use `@typed-policy/drizzle` to compile policies to SQL:

```typescript
import { compileToDrizzle } from "@typed-policy/drizzle";
import { db, resources } from "./db";

// In your API route
app.get("/resources", async (c) => {
  const user = c.get("user");

  // Compile policy to SQL WHERE clause
  const where = compileToDrizzle(resourcePolicy.actions.list, {
    actor: { user },
    tables: { resource: resources.ownerId }  // Map subject paths to table columns
  });

  // Query only accessible resources
  const results = await db
    .select()
    .from(resources)
    .where(where);

  return c.json({ resources: results });
});
```

## Packages

| Package | Version | Description | Size |
|---------|---------|-------------|------|
| [`@typed-policy/core`](https://www.npmjs.com/package/@typed-policy/core) | ![npm](https://img.shields.io/npm/v/@typed-policy/core) | AST types and DSL operators | 0 deps |
| [`@typed-policy/eval`](https://www.npmjs.com/package/@typed-policy/eval) | ![npm](https://img.shields.io/npm/v/@typed-policy/eval) | Frontend boolean evaluator | 1 dep |
| [`@typed-policy/drizzle`](https://www.npmjs.com/package/@typed-policy/drizzle) | ![npm](https://img.shields.io/npm/v/@typed-policy/drizzle) | Drizzle ORM SQL compiler | 1 dep |

## API Reference

### Core Operators

#### `eq(left, right)`

Equality comparison between a path and a value or another path.

```typescript
eq("post.published", true)         // Compare to literal
eq("post.ownerId", "user.id")      // Compare two paths
```

#### `and(...rules)`

Logical AND of multiple rules. Returns `true` only if all rules are true.

```typescript
and(
  eq("user.role", "admin"),
  eq("resource.published", true)
)
```

#### `or(...rules)`

Logical OR of multiple rules. Returns `true` if any rule is true.

```typescript
or(
  eq("user.role", "admin"),
  eq("resource.ownerId", "user.id")
)
```

#### `policy<Actor, Subject>(config)`

Define a policy with type-safe actor and subject contexts.

```typescript
const myPolicy = policy<MyActor, MySubject>({
  subject: "Resource",
  actions: {
    // Function expression
    read: ({ actor, subject }) => {
      return actor.user.role === "admin" || subject.resource.published;
    },
    // Boolean literal
    create: true,
    // Declarative DSL
    delete: eq("user.role", "admin")
  }
});
```

**Action Types:**

1. **Function expressions**: `({ actor, subject }) => boolean | Expr`
   - Receive typed actor and subject contexts
   - Return boolean or continue with DSL operators

2. **Boolean literals**: `true` or `false`
   - Static permissions
   - Useful for feature flags or hardcoded rules

3. **Declarative DSL**: `eq()`, `and()`, `or()`
   - Type-safe path references
   - Can be compiled to SQL

### Eval Package

#### `evaluate(expr, context)`

Evaluates a policy expression against a runtime context.

```typescript
import { evaluate } from "@typed-policy/eval";

const result = evaluate(policy.actions.read, {
  actor: { user: { id: "1", role: "admin" } },
  subject: { resource: { id: "1", ownerId: "1", published: true } }
});
// → true
```

### Drizzle Package

#### `compileToDrizzle(expr, options)`

Compiles a policy expression to a Drizzle SQL condition.

```typescript
import { compileToDrizzle } from "@typed-policy/drizzle";

const where = compileToDrizzle(policy.actions.read, {
  actor: { user: { id: "1", role: "admin" } },
  tables: {
    resource: resourcesTable.ownerId  // Map "resource.*" paths
  }
});
```

## Examples

### React Interactive Demo

The [React example](examples/react) provides an interactive playground where you can:
- Toggle user roles and permissions
- See real-time policy evaluation results
- View the compiled SQL output

```bash
cd examples/react
pnpm install
pnpm dev
```

### Hono + Drizzle API

The [Hono example](examples/hono-drizzle) shows a full-stack implementation:
- JWT authentication
- Row-level security with Drizzle
- Policy-based route guards

```bash
cd examples/hono-drizzle
pnpm install
pnpm dev
```

## Migration Guide

### Migrating from v0.1 to v0.2

v0.2 introduces a new API with separate actor and subject types. See the [Migration Guide](MIGRATION_v0.1_to_v0.2.md) for detailed instructions.

**Key changes:**
- Policy context is now split into `actor` and `subject`
- Actions can use function expressions `({ actor, subject }) => boolean`
- Actions can use boolean literals `true`, `false`
- New generic signature: `policy<Actor, Subject>()`

### Upgrading

```bash
# Update all packages
pnpm update @typed-policy/core @typed-policy/eval @typed-policy/drizzle

# Or reinstall
pnpm remove @typed-policy/core @typed-policy/eval @typed-policy/drizzle
pnpm add @typed-policy/core @typed-policy/eval @typed-policy/drizzle
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

- [Bug reports](https://github.com/toglelabs/typed-policy/issues)
- [Feature requests](https://github.com/toglelabs/typed-policy/issues)
- [Discussions](https://github.com/toglelabs/typed-policy/discussions)

## Comparison with Alternatives

| Feature | Typed Policy | CASL | Oso | RBAC |
|---------|--------------|------|-----|------|
| TypeScript-first | ✅ | ⚠️ | ⚠️ | ❌ |
| Compile-time safety | ✅ | ❌ | ❌ | ❌ |
| Drizzle native | ✅ | ❌ | ❌ | ❌ |
| Frontend + Backend | ✅ | ✅ | ✅ | ❌ |
| Zero runtime deps | ✅ | ❌ | ❌ | ✅ |
| Complex policies | ✅ | ✅ | ✅ | ⚠️ |
| Function expressions | ✅ | ⚠️ | ❌ | ❌ |

## Roadmap

### Current: v0.2.x ✅

**Status:** Released and stable

**Features:**
- ✅ **Separate Actor/Subject Contexts** - Type-safe separation of user and resource contexts
- ✅ **Function Expressions** - Pure functions for complex authorization logic: `({ actor, subject }) => boolean | Expr`
- ✅ **Boolean Literals** - Static permissions: `true` / `false`
- ✅ **Declarative DSL** - Type-safe operators: `eq`, `and`, `or`
- ✅ **Frontend Evaluation** - `evaluate(action, { actor, subject })`
- ✅ **Backend SQL Compilation** - `compile(action, { actor, tables })`
- ✅ **Zero Runtime Dependencies** - Core package has no dependencies
- ✅ **Type Inference** - Automatic type inference from policy definitions
- ✅ **Drizzle ORM Integration** - First-class SQL compilation support

**Packages:**
- `@typed-policy/core@0.2.x`
- `@typed-policy/eval@0.2.x`
- `@typed-policy/drizzle@0.2.x`

---

### v0.3.0 (In Development) 🔜

**Status:** Planning phase

**Focus:** Additional Operators

**Planned Features:**

#### Essential Operators
- 🔜 **`neq`** - Not equal: `neq("post.status", "deleted")`
- 🔜 **`in`** - Array membership: `in("user.role", ["admin", "moderator"])`
- 🔜 **`in`** - Contains check: `in("post.tags", "featured")`

#### Comparison Operators
- 🔜 **`gt`** / **`lt`** - Greater/Less than: `gt("post.createdAt", date)`
- 🔜 **`gte`** / **`lte`** - Greater/Less than or equal: `gte("user.age", 18)`

#### Null Checks
- 🔜 **`isNull`** - Check if null: `isNull("post.deletedAt")`
- 🔜 **`isNotNull`** - Check if not null: `isNotNull("post.publishedAt")`

#### String Operators
- 🔜 **`startsWith`** - String prefix: `startsWith("post.title", "[DRAFT]")`
- 🔜 **`endsWith`** - String suffix: `endsWith("post.title", "(Archived)")`

**Example Usage:**
```typescript
import { policy, eq, neq, in, gt, isNull } from "@typed-policy/core";

const postPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Not equal
    read: neq("post.status", "archived"),
    
    // Array membership
    update: in("user.role", ["admin", "moderator"]),
    
    // Greater than
    viewRecent: gt("post.createdAt", "2024-01-01"),
    
    // Null check with DSL
    listActive: and(
      isNull("post.deletedAt"),
      eq("post.published", true)
    ),
    
    // Complex combination
    adminOrRecent: or(
      in("user.role", ["admin", "moderator"]),
      and(
        gt("post.createdAt", "2024-01-01"),
        neq("post.status", "draft")
      )
    )
  }
});
```

---

### v0.4.0 (Planned) 📋

**Status:** Backlog

**Focus:** Developer Experience & Utilities

**Planned Features:**

#### Policy Validation
- 📋 **`validatePolicy()`** - Runtime validation of policy definitions
- 📋 **Better Error Messages** - Path suggestions for typos
- 📋 **Debug Mode** - Step-by-step evaluation tracing

#### Multi-Tenancy Helpers
- 📋 **`tenantScoped()`** - Automatic tenant isolation
- 📋 **`belongsToTenant()`** - Helper for organization scoping
- 📋 **`crossTenant()`** - Cross-tenant access rules

#### Policy Composition
- 📋 **`extend()`** - Extend base policies
- 📋 **`andPolicies()`** - Combine multiple policies with AND
- 📋 **`orPolicies()`** - Combine multiple policies with OR

**Example Usage:**
```typescript
// Base policy for all resources
const basePolicy = policy<Actor, Subject>({
  actions: {
    read: ({ actor }) => actor.user.role !== "banned"
  }
});

// Extend with specific rules
const postPolicy = extend(basePolicy, {
  subject: "Post",
  actions: {
    write: ({ actor }) => actor.user.role === "admin"
  }
});

// Tenant-scoped policy
const tenantPolicy = policy<Actor, Subject>({
  actions: {
    read: and(
      tenantScoped("post.organizationId"),
      eq("post.published", true)
    )
  }
});
```

---

### v1.0.0 (Future) 🚀

**Status:** Long-term vision

**Focus:** Production-Ready Features

**Planned Features:**

#### Performance
- 🚀 **Function Result Caching** - Cache pure function results per request
- 🚀 **Compiled Policy Cache** - Cache compiled SQL for repeated use
- 🚀 **Lazy Evaluation** - Smart short-circuiting

#### Additional ORM Support
- 🚀 **Prisma Adapter** - SQL compilation for Prisma ORM
- 🚀 **TypeORM Adapter** - SQL compilation for TypeORM
- 🚀 **Raw SQL Output** - Get SQL AST for custom adapters

#### Advanced Features
- 🚀 **Async Policy Hooks** - Opt-in async operations (with caveats)
- 🚀 **Policy Visualization** - Debug/inspect policies
- 🚀 **ESLint Plugin** - Static analysis for policy patterns
- 🚀 **OpenAPI Integration** - Generate policy documentation

#### Enterprise Features
- 🚀 **Policy Versioning** - Version control for policy changes
- 🚀 **Audit Logging** - Track policy decisions
- 🚀 **Hot Reload** - Update policies without restart

---

### Contributing to the Roadmap

Want to influence the roadmap?

- 💡 **Suggest features** - [Open a discussion](https://github.com/toglelabs/typed-policy/discussions)
- 🐛 **Report bugs** - [Create an issue](https://github.com/toglelabs/typed-policy/issues)
- 🚀 **Contribute code** - See [Contributing Guide](CONTRIBUTING.md)

**Priority factors:**
1. Community demand (👍 reactions on issues)
2. Real-world use cases
3. Breaking change impact
4. Maintenance burden

## License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2024 [Togle Labs](https://github.com/toglelabs)

---

Made with ❤️ by [Ihsan VP](mailto:m.ihsan.vp@gmail.com) and contributors.
