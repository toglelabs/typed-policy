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
import { 
  policy, eq, and, or, neq, gt, inArray, 
  between, startsWith, contains, tenantScoped 
} from "@typed-policy/core";
import { evaluate } from "@typed-policy/eval";

// Define types for your actor and subject
type MyActor = {
  user: { 
    id: string; 
    role: "admin" | "user";
    organizationId: string;
    age: number;
  };
};

type MySubject = {
  post: { 
    id: string; 
    ownerId: string; 
    published: boolean;
    organizationId: string;
    status: "draft" | "published" | "archived";
    tags: string[];
    createdAt: Date;
  };
};

// 1. Define a comprehensive policy using v0.4 features
const postPolicy = policy<MyActor, MySubject>({
  subject: "Post",
  actions: {
    // Functions for complex logic
    read: ({ actor, subject }) => {
      if (actor.user.role === "admin") return true;
      return subject.post.published || actor.user.id === subject.post.ownerId;
    },
    
    // Multi-tenancy with tenant isolation
    list: and(
      tenantScoped("post.organizationId"),
      eq("post.status", "published")
    ),
    
    // String operators for search
    searchByTag: contains("post.tags", "featured"),
    
    // Date range queries
    listThisMonth: between("post.createdAt", startOfMonth, endOfMonth),
    
    // Role-based access with collection operator
    moderate: inArray("user.role", ["admin", "moderator"]),
    
    // Boolean literals
    create: true,
    
    // Declarative DSL with multiple operators
    delete: and(
      eq("post.ownerId", "user.id"),
      neq("post.status", "published")
    )
  }
});

// 2. Evaluate on frontend
const canRead = evaluate(postPolicy.actions.read, {
  actor: { 
    user: { id: "1", role: "user", organizationId: "org-1", age: 25 } 
  },
  subject: { 
    post: { 
      id: "1", 
      ownerId: "1", 
      published: false,
      organizationId: "org-1",
      status: "draft",
      tags: ["featured", "tech"],
      createdAt: new Date()
    } 
  }
});
// → true

// 3. Compile to SQL on backend (Drizzle) with cross-table support
import { compileToDrizzle, exists } from "@typed-policy/drizzle";

const enhancedPolicy = policy<MyActor, MySubject>({
  subject: "Post",
  actions: {
    // Cross-table operations (compile-only)
    listWithComments: ({ actor }) => and(
      tenantScoped("post.organizationId"),
      exists("comments", { postId: "post.id" })  // Only for SQL compilation
    )
  }
});

const where = compileToDrizzle(enhancedPolicy.actions.listWithComments, {
  actor: { user: { id: "1", role: "user", organizationId: "org-1", age: 25 } },
  tables: { post: posts }
});

// Generates SQL like:
// WHERE post.organization_id = 'org-1' 
// AND EXISTS (SELECT 1 FROM comments WHERE comments.post_id = post.id)
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

**Support:** Frontend ✅ | Compile ✅

#### `neq(left, right)`

Not equal comparison.

```typescript
neq("post.status", "deleted")
neq("user.id", "post.ownerId")
```

**Support:** Frontend ✅ | Compile ✅

#### `and(...rules)`

Logical AND of multiple rules. Returns `true` only if all rules are true.

```typescript
and(
  eq("user.role", "admin"),
  eq("resource.published", true)
)
```

**Support:** Frontend ✅ | Compile ✅

#### `or(...rules)`

Logical OR of multiple rules. Returns `true` if any rule is true.

```typescript
or(
  eq("user.role", "admin"),
  eq("resource.ownerId", "user.id")
)
```

**Support:** Frontend ✅ | Compile ✅

#### `not(expr)`

Logical negation of an expression.

```typescript
not(eq("post.archived", true))
not(isNull("post.publishedAt"))
```

**Support:** Frontend ✅ | Compile ✅

### Comparison Operators

#### `gt(left, right)` / `lt(left, right)`

Greater than / less than comparison.

```typescript
gt("user.age", 18)
lt("post.createdAt", cutoffDate)
```

**Support:** Frontend ✅ | Compile ✅

#### `gte(left, right)` / `lte(left, right)`

Greater than or equal / less than or equal comparison.

```typescript
gte("post.score", 0)
lte("user.loginAttempts", 3)
```

**Support:** Frontend ✅ | Compile ✅

#### `between(path, min, max)`

Check if a value is within a range (inclusive).

```typescript
between("post.createdAt", startDate, endDate)
between("user.age", 18, 65)
```

**Support:** Frontend ✅ | Compile ✅

### Collection Operators

#### `inArray(path, values)`

Check if a path's value is in an array of allowed values.

```typescript
inArray("user.role", ["admin", "moderator", "editor"])
inArray("post.status", ["published", "draft"])
```

**Support:** Frontend ✅ | Compile ✅

**Note:** Renamed from `in` in v0.3 to avoid conflict with TypeScript's `in` keyword.

#### `contains(path, value)`

Check if an array or string contains a value.

```typescript
contains("post.tags", "featured")
contains("user.email", "@company.com")
```

**Support:** Frontend ✅ | Compile ✅

### String Operators

#### `startsWith(path, prefix)` / `endsWith(path, suffix)`

String prefix/suffix checks.

```typescript
startsWith("post.title", "[DRAFT]")
endsWith("file.name", ".pdf")
```

**Support:** Frontend ✅ | Compile ✅

#### `matches(path, regex)`

Regex pattern matching.

```typescript
matches("user.email", /^[^@]+@company\.com$/)
matches("post.slug", /^[a-z0-9-]+$/)
```

**Support:** Frontend ✅ | Compile ✅

### Null Operators

#### `isNull(path)` / `isNotNull(path)`

Null / not-null checks.

```typescript
isNull("post.deletedAt")           // Soft-delete check
isNotNull("post.publishedAt")      // Published check
```

**Support:** Frontend ✅ | Compile ✅

### Cross-Table Operators (Compile-Only)

These operators enable cross-table relationships but are **only available for SQL compilation** (backend).

#### `exists(table, conditions)`

Check if a related record exists in another table.

```typescript
exists("task_assignments", {
  userId: "user.id",
  taskId: "task.id"
})
```

**Support:** Frontend ❌ | Compile ✅

**Note:** Generates SQL EXISTS subquery. Not available for frontend evaluation because it requires database access.

#### `count(table, conditions)`

Count related records.

```typescript
gte(
  count("comments", { postId: "post.id" }),
  1
)
```

**Support:** Frontend ❌ | Compile ✅

**Note:** Generates SQL subquery with COUNT. Use for "has at least N comments" type queries.

#### `hasMany(table, conditions)`

Check if multiple related records exist.

```typescript
hasMany("user_permissions", {
  userId: "user.id",
  action: "moderate"
})
```

**Support:** Frontend ❌ | Compile ✅

**Note:** Similar to `exists` but returns boolean indicating if multiple matches exist.

### Multi-Tenancy Helpers

#### `tenantScoped(field)`

Automatic tenant isolation. Shorthand for checking if the subject belongs to the actor's tenant.

```typescript
import { belongsToTenant } from "@typed-policy/core";

const tenantScoped = (field) => eq(field, "user.organizationId");

// Usage:
read: tenantScoped("post.organizationId")
// Equivalent to: eq("post.organizationId", "user.organizationId")
```

**Support:** Frontend ✅ | Compile ✅

#### `belongsToTenant(actorField, subjectField)`

Explicit tenant ownership check between actor and subject fields.

```typescript
belongsToTenant("user.organizationId", "post.organizationId")
```

**Support:** Frontend ✅ | Compile ✅

### Policy Composition

#### `extend(basePolicy, config)`

Extend a base policy with additional actions.

```typescript
const basePolicy = policy<Actor, Subject>({
  actions: {
    read: ({ actor }) => actor.user.role !== "banned"
  }
});

const postPolicy = extend(basePolicy, {
  subject: "Post",
  actions: {
    write: ({ actor }) => actor.user.role === "admin"
  }
});
```

**Support:** Frontend ✅ | Compile ✅

#### `andPolicies(policies)` / `orPolicies(policies)`

Combine multiple policies with AND/OR logic.

```typescript
const combinedPolicy = andPolicies([
  tenantPolicy,
  rolePolicy
]);

const flexiblePolicy = orPolicies([
  adminPolicy,
  ownerPolicy
]);
```

**Support:** Frontend ✅ | Compile ✅

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

### String Operators Example

```typescript
import { policy, startsWith, endsWith, contains } from "@typed-policy/core";

const documentPolicy = policy({
  subject: "Document",
  actions: {
    // Filter PDF documents
    listPDFs: endsWith("document.filename", ".pdf"),
    
    // Search by title prefix
    listDrafts: startsWith("document.title", "[DRAFT]"),
    
    // Search content
    searchContent: contains("document.content", "search-term")
  }
});
```

### Date Range & Multi-Tenancy Example

```typescript
import { policy, between, tenantScoped, and } from "@typed-policy/core";

const eventPolicy = policy({
  subject: "Event",
  actions: {
    // List events in current month for user's tenant
    listCurrent: and(
      tenantScoped("event.organizationId"),
      between("event.startDate", firstDayOfMonth, lastDayOfMonth)
    ),
    
    // Upcoming events only
    listUpcoming: gt("event.startDate", new Date())
  }
});
```

### Policy Composition Example

```typescript
import { policy, extend, andPolicies, or } from "@typed-policy/core";

// Base policy for all resources
const basePolicy = policy({
  actions: {
    read: ({ actor }) => actor.user.role !== "banned"
  }
});

// Tenant isolation policy
const tenantPolicy = policy({
  actions: {
    read: tenantScoped("resource.organizationId")
  }
});

// Owner-based policy
const ownerPolicy = policy({
  actions: {
    write: eq("resource.ownerId", "user.id")
  }
});

// Combine policies for a complete authorization model
const combinedReadPolicy = andPolicies([basePolicy, tenantPolicy]);
const combinedWritePolicy = or(
  eq("user.role", "admin"),
  ownerPolicy.actions.write
);
```

### Cross-Table Operations (Compile-Only)

```typescript
import { policy, and, gte } from "@typed-policy/core";
import { exists, count } from "@typed-policy/drizzle";

const postPolicy = policy({
  subject: "Post",
  actions: {
    // Show posts that have discussions
    listActive: ({ actor }) => and(
      eq("post.organizationId", actor.user.organizationId),
      gte(count("comments", { postId: "post.id" }), 1)
    ),
    
    // Show posts user is assigned to
    listAssigned: ({ actor }) => or(
      eq("user.role", "admin"),
      exists("post_assignments", {
        userId: "user.id",
        postId: "post.id"
      })
    )
  }
});

// Compile to SQL with cross-table support
const where = compileToDrizzle(postPolicy.actions.listActive, {
  actor: { user: currentUser },
  tables: { post: postsTable }
});
```

## Migration Guide

### Migrating from v0.1 to v0.2

v0.2 introduces a new API with separate actor and subject types. See the [Migration Guide](MIGRATION_v0.1_to_v0.2.md) for detailed instructions.

**Key changes:**
- Policy context is now split into `actor` and `subject`
- Actions can use function expressions `({ actor, subject }) => boolean`
- Actions can use boolean literals `true`, `false`
- New generic signature: `policy<Actor, Subject>()`

### Migrating from v0.2 to v0.3

v0.3 adds essential comparison operators. This is a non-breaking release.

**New operators:**
- `neq` - Not equal comparison
- `gt`, `lt`, `gte`, `lte` - Comparison operators
- `not` - Logical negation
- `inArray` - Array membership check
- `isNull`, `isNotNull` - Null checks

**No breaking changes** - you can upgrade safely.

### Migrating from v0.3 to v0.4

v0.4 is a comprehensive release with new operators and cross-table support.

#### Breaking Changes

**1. `in` Operator Renamed to `inArray`**

The `in` operator was renamed to `inArray` to avoid conflicts with TypeScript's `in` keyword.

```typescript
// ❌ v0.3
import { in } from "@typed-policy/core";
read: in("user.role", ["admin", "user"])

// ✅ v0.4
import { inArray } from "@typed-policy/core";
read: inArray("user.role", ["admin", "user"])
```

#### New Features

**1. String Operators**

```typescript
import { startsWith, endsWith, contains, matches } from "@typed-policy/core";

const policy = {
  listPDFs: endsWith("file.name", ".pdf"),
  listDrafts: startsWith("post.title", "[DRAFT]"),
  searchContent: contains("post.body", "keyword"),
  validateEmail: matches("user.email", /@company\.com$/)
};
```

**2. Range Operator**

```typescript
import { between } from "@typed-policy/core";

const policy = {
  listThisMonth: between("post.createdAt", startDate, endDate)
};
```

**3. Cross-Table Operations (Compile-Only)**

```typescript
import { exists, count, hasMany } from "@typed-policy/drizzle";

const policy = {
  // Check if related records exist
  hasComments: exists("comments", { postId: "post.id" }),
  
  // Count related records
  popularPosts: gte(count("likes", { postId: "post.id" }), 10),
  
  // Check for multiple relationships
  hasPermissions: hasMany("permissions", { userId: "user.id" })
};
```

**Important:** Cross-table operators (`exists`, `count`, `hasMany`) only work with SQL compilation (`compileToDrizzle`). They cannot be used with frontend evaluation (`evaluate`).

**4. Multi-Tenancy Helpers**

```typescript
import { tenantScoped, belongsToTenant } from "@typed-policy/core";

const policy = {
  // Automatic tenant isolation
  read: and(
    tenantScoped("post.organizationId"),
    eq("post.published", true)
  ),
  
  // Explicit tenant check
  update: belongsToTenant("user.organizationId", "post.organizationId")
};
```

**5. Policy Composition**

```typescript
import { extend, andPolicies, orPolicies } from "@typed-policy/core";

// Extend base policies
const extended = extend(basePolicy, { subject: "Post", actions: {...} });

// Combine multiple policies
const combined = andPolicies([tenantPolicy, rolePolicy]);
```

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

### v0.3.0 ✅ RELEASED - Small Release

**Focus:** Essential Operators Only

**Features:**

| Operator | Description | Example |
|----------|-------------|---------|
| ✅ `neq` | Not equal | `neq("post.status", "deleted")` |
| ✅ `not` | Negation | `not(eq("post.archived", true))` |
| ✅ `inArray` | Array membership | `inArray("user.role", ["admin", "moderator"])` |
| ✅ `gt` | Greater than | `gt("user.age", 18)` |
| ✅ `lt` | Less than | `lt("post.createdAt", cutoffDate)` |
| ✅ `gte` | Greater than or equal | `gte("post.score", 0)` |
| ✅ `lte` | Less than or equal | `lte("user.loginAttempts", 3)` |
| ✅ `isNull` | Check if null | `isNull("post.deletedAt")` |
| ✅ `isNotNull` | Check if not null | `isNotNull("post.publishedAt")` |

**Example Usage:**
```typescript
import { policy, eq, neq, gt, inArray, and } from "@typed-policy/core";

const postPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Not deleted posts
    read: neq("post.status", "deleted"),
    
    // Age restriction with role whitelist
    viewMature: and(
      gt("user.age", 18),
      inArray("user.role", ["admin", "moderator", "verified"])
    ),
    
    // Recent posts only
    listRecent: gt("post.createdAt", "2024-01-01"),
    
    // Check for soft-delete
    listActive: isNull("post.deletedAt")
  }
});
```

**Packages:**
- `@typed-policy/core@0.3.x`
- `@typed-policy/eval@0.3.x`
- `@typed-policy/drizzle@0.3.x`

---

### v0.4.0 ✅ RELEASED - COMPREHENSIVE RELEASE

**Focus:** Complete Operator Suite + Cross-Table Operations

**Features:**

#### Tier 1 - String Operators

| Operator | Description | Example |
|----------|-------------|---------|
| ✅ `startsWith` | String prefix | `startsWith("post.title", "[DRAFT]")` |
| ✅ `endsWith` | String suffix | `endsWith("file.name", ".pdf")` |
| ✅ `contains` | Array/string contains | `contains("post.tags", "featured")` |

```typescript
// Filter by file type
listDocuments: endsWith("file.name", ".pdf"),

// Check if post has specific tag
hasFeaturedTag: contains("post.tags", "featured"),

// Search drafts
listDrafts: startsWith("post.title", "[DRAFT]")
```

#### Tier 2 - Advanced Operators

| Operator | Description | Example |
|----------|-------------|---------|
| ✅ `between` | Range check | `between("post.createdAt", startDate, endDate)` |
| ✅ `matches` | Regex pattern | `matches("user.email", /^[^@]+@company\.com$/)` |

```typescript
// Date range filter
listThisMonth: between("post.createdAt", "2024-01-01", "2024-01-31"),

// Company email validation
isCompanyUser: matches("user.email", /@company\.com$/)
```

#### Cross-Table Operations (Compile-Only)

| Operator | Description | Example | Support |
|----------|-------------|---------|---------|
| ✅ `exists(table, conditions)` | Check if related record exists | `exists("assignments", { userId: "user.id", taskId: "task.id" })` | Compile-only |
| ✅ `count(table, conditions)` | Count related records | `count("comments", { postId: "post.id" })` | Compile-only |
| ✅ `hasMany(table, conditions)` | Check for multiple relationships | `hasMany("permissions", { userId: "user.id", resource: "post" })` | Compile-only |

```typescript
// Check if user is assigned to task
listAssigned: ({ actor }) => {
  if (actor.user.role === "admin") return true;
  return exists("task_assignments", {
    userId: actor.user.id,
    taskId: "task.id"
  });
},

// Only show posts with comments
hasDiscussion: gte(
  count("comments", { postId: "post.id" }),
  1
),

// Check for multiple permissions
canModerate: hasMany("user_permissions", {
  userId: "user.id",
  action: "moderate"
})
```

#### Multi-Tenancy Helpers

| Helper | Description | Example |
|--------|-------------|---------|
| ✅ `tenantScoped(field)` | Automatic tenant isolation | `tenantScoped("post.organizationId")` |
| ✅ `belongsToTenant()` | Organization scoping | `belongsToTenant("user.organizationId", "post.organizationId")` |

```typescript
const tenantPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Automatic tenant isolation
    read: and(
      tenantScoped("post.organizationId"),
      eq("post.published", true)
    ),
    
    // Cross-field tenant check
    update: belongsToTenant("user.organizationId", "post.organizationId")
  }
});
```

#### Policy Composition

| Helper | Description | Example |
|--------|-------------|---------|
| ✅ `extend()` | Extend base policies | `extend(basePolicy, { ... })` |
| ✅ `andPolicies()` | Combine with AND | `andPolicies([policy1, policy2])` |
| ✅ `orPolicies()` | Combine with OR | `orPolicies([policy1, policy2])` |

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
    write: ({ actor }) => actor.user.role === "admin",
    delete: ({ actor }) => actor.user.role === "admin"
  }
});

// Combine multiple policies
const combinedPolicy = andPolicies([
  tenantPolicy,
  rolePolicy,
  statusPolicy
]);
```

**Packages:**
- `@typed-policy/core@0.4.x`
- `@typed-policy/eval@0.4.x`
- `@typed-policy/drizzle@0.4.x`

**Breaking Changes:**
- `in` operator renamed to `inArray` (to avoid conflict with TypeScript `in` keyword)

---

### v0.5.0 (Planned) 📚

**Status:** Early planning

**Focus:** Documentation & Developer Experience

**Planned Features:**

#### Documentation Site
- 📚 **VitePress Documentation Site** - Hosted on GitHub Pages
  - Comprehensive guides and tutorials
  - Interactive code examples
  - API reference with search
  - Dark/light mode support
  - Mobile-responsive design
  - URL: `https://toglelabs.github.io/typed-policy`

#### Enhanced Examples
- 📚 **Live React Demo** - Interactive policy playground
- 📚 **More Framework Examples** - Next.js, Nuxt, SvelteKit
- 📚 **Real-world Patterns** - Common authorization patterns cookbook

#### Developer Tools
- 📚 **VS Code Extension** - Syntax highlighting and snippets
- 📚 **CLI Tool** - Policy validation and testing from command line
- 📚 **Policy Playground** - Online tool to test policies without setup

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

---

## Known Limitations

### Current v0.4.x Limitations

#### 1. Cross-Table Operations Are Compile-Only

**Status:** ✅ **PARTIALLY SOLVED in v0.4**

Cross-table operations (`exists`, `count`, `hasMany`) are now available but **only work with SQL compilation**, not frontend evaluation.

**Available for SQL compilation:**
```typescript
import { exists, count, hasMany } from "@typed-policy/drizzle";

const policy = {
  // ✅ Works with compileToDrizzle()
  read: exists("comments", { postId: "post.id" })
};
```

**Not available for frontend evaluation:**
```typescript
import { evaluate } from "@typed-policy/eval";

// ❌ Cannot use cross-table operators with evaluate()
const result = evaluate(policy.actions.read, { actor, subject });
// Error: Cross-table operators not supported in frontend evaluation
```

**Workaround for frontend:** Pre-fetch related data or handle at the API layer.

#### 2. No Subqueries or Joins in SQL Compilation (Partial)

**Status:** ✅ **PARTIALLY SOLVED in v0.4**

Basic cross-table checks via `exists` and `count` are now supported. However, complex joins and arbitrary subqueries are not yet available.

**Works in v0.4:**
```sql
-- ✅ Generated by exists()
SELECT * FROM posts p
WHERE EXISTS (
  SELECT 1 FROM comments c WHERE c.post_id = p.id
)
```

**Not yet available:**
```sql
-- ❌ Cannot generate arbitrary subqueries
SELECT * FROM tasks t
WHERE t.id IN (
  SELECT task_id FROM task_assignments 
  WHERE user_id = $1 AND status = 'active'
)
```

**Solution:** Enhanced SQL generation planned for v1.0 with more complex subquery support.

#### 3. Functions Must Be Pure

**Problem:** Policy functions cannot access external data sources.

**Limitations:**
- ❌ Cannot query database
- ❌ Cannot call APIs
- ❌ Cannot read files
- ✅ Can only use provided `actor` and `subject` context

**Example:**
```typescript
// ❌ NOT ALLOWED - impure function
read: async ({ actor }) => {
  const perms = await db.getPermissions(actor.id);  // ❌ Async database call
  return perms.includes("read");
}
```

**Workaround:** Pre-fetch all needed data before policy evaluation.

**Solution:** Async hooks planned for v1.0 (opt-in with caveats).

### Workarounds Summary

| Limitation | Status | Workaround | Planned Solution |
|------------|--------|-----------|------------------|
| Cross-table relationships | ✅ Partially solved | Use `exists`/`count` for SQL; pre-fetch for frontend | Full support in v1.0 |
| No complex subqueries | ⚠️ Ongoing | Denormalize data or filter in app | Enhanced SQL (v1.0) |
| Pure functions only | ⚠️ Ongoing | Pre-fetch all data | Async hooks (v1.0 opt-in) |
| Array/collection ops | ✅ Solved | Use `inArray`, `contains` operators | - |

---

## License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2024 [Togle Labs](https://github.com/toglelabs)

---

Made with ❤️ by [Ihsan VP](mailto:m.ihsan.vp@gmail.com) and contributors.
