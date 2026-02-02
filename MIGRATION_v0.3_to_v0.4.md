# Migration Guide: v0.3 to v0.4

## Overview

v0.4.0 is a **comprehensive release** that adds 13 new features including string operators, advanced operators, cross-table operations, multi-tenancy helpers, and policy composition utilities.

**Breaking Changes:** None (all changes are backward compatible)

**New Features:** 13 new operators and helpers

---

## Breaking Changes

### ⚠️ `in` Operator Renamed to `inArray`

The `in` operator from v0.3 has been renamed to `inArray` for clarity and to avoid confusion with JavaScript's `in` operator.

**v0.3:**
```typescript
import { in } from "@typed-policy/core";  // ❌ Old name

const policy = in("user.role", ["admin", "moderator"]);
```

**v0.4:**
```typescript
import { inArray } from "@typed-policy/core";  // ✅ New name

const policy = inArray("user.role", ["admin", "moderator"]);
```

---

## New Operators

### String & Collection Operators

#### `startsWith(path, prefix)`
Check if a string field starts with a specific prefix.

```typescript
import { startsWith } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Allow reading draft posts
    readDrafts: startsWith("post.title", "[DRAFT]"),
    
    // Filter by file type
    listPDFs: startsWith("file.mimeType", "application/pdf")
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

#### `endsWith(path, suffix)`
Check if a string field ends with a specific suffix.

```typescript
import { endsWith } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Document",
  actions: {
    // Filter by file extension
    listPDFs: endsWith("document.filename", ".pdf"),
    listImages: endsWith("document.filename", ".jpg")
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

#### `contains(path, value)`
Check if a string contains a substring OR an array contains a value.

```typescript
import { contains } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // String contains (case-sensitive)
    searchTitle: contains("post.title", "important"),
    
    // Array contains
    hasFeaturedTag: contains("post.tags", "featured"),
    hasAdminRole: contains("user.roles", "admin")
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

### Advanced Operators

#### `between(path, min, max)`
Check if a value is within a range (inclusive).

```typescript
import { between } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Date range filter
    listThisMonth: between("post.createdAt", "2024-01-01", "2024-01-31"),
    
    // Numeric range
    listPopular: between("post.viewCount", 100, 1000),
    
    // Age validation
    isAdult: between("user.age", 18, 120)
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

#### `matches(path, pattern, flags?)`
Check if a string matches a regular expression pattern.

```typescript
import { matches } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "User",
  actions: {
    // Company email validation
    isCompanyUser: matches("user.email", /@company\.com$/),
    
    // Slug validation
    hasValidSlug: matches("post.slug", /^[a-z0-9-]+$/),
    
    // With regex flags (case-insensitive)
    isYahooEmail: matches("user.email", /@yahoo\.com$/i)
  }
});
```

**Note:** In SQL compilation, complex regex patterns are approximated. For precise regex matching, use frontend evaluation.

**Support:** ✅ Frontend evaluation, ✅ SQL compilation (approximated)

---

## Cross-Table Operations (Compile-Only)

These operators **cannot be evaluated on the frontend** - they only work with SQL compilation via `@typed-policy/drizzle`.

### `exists(table, conditions)`
Check if related records exist in another table.

```typescript
import { exists } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Task",
  actions: {
    // Show tasks the user is assigned to
    listAssigned: ({ actor }) => {
      if (actor.user.role === "admin") return true;
      return exists("task_assignments", {
        userId: actor.user.id,
        taskId: "task.id"  // References subject path
      });
    }
  }
});
```

**SQL Generated:**
```sql
SELECT * FROM tasks t
WHERE EXISTS (
  SELECT 1 FROM task_assignments ta
  WHERE ta.task_id = t.id
  AND ta.user_id = $1
)
```

**Support:** ❌ Frontend evaluation (throws error), ✅ SQL compilation

---

### `count(table, conditions)`
Count related records in another table.

```typescript
import { count, gte } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Only show posts with discussion (1+ comments)
    hasDiscussion: gte(
      count("comments", { postId: "post.id" }),
      1
    ),
    
    // Popular posts (10+ comments)
    listPopular: gte(
      count("comments", { postId: "post.id" }),
      10
    )
  }
});
```

**Support:** ❌ Frontend evaluation (throws error), ✅ SQL compilation

---

### `hasMany(table, conditions, minCount?)`
Check if there are multiple related records (default: 2+).

```typescript
import { hasMany } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "User",
  actions: {
    // User has multiple roles (default minCount: 2)
    hasMultipleRoles: hasMany("user_roles", { userId: "user.id" }),
    
    // User has 3+ permissions for moderation
    canModerate: hasMany("user_permissions", 
      { userId: "user.id", resource: "post" },
      3  // Minimum count
    )
  }
});
```

**Support:** ❌ Frontend evaluation (throws error), ✅ SQL compilation

---

### Using Cross-Table Operations with Drizzle

```typescript
import { compile } from "@typed-policy/drizzle";
import { policy, exists } from "@typed-policy/core";

const myPolicy = policy<Actor, Subject>({
  subject: "Task",
  actions: {
    read: exists("task_assignments", { 
      userId: "user.id", 
      taskId: "task.id" 
    })
  }
});

// Compile with related tables
const where = compile(myPolicy.actions.read, {
  actor: { user: { id: "123" } },
  tables: {
    task: tasksTable  // Subject table
  },
  relatedTables: {   // NEW: Cross-table references
    task_assignments: taskAssignmentsTable
  }
});
```

---

## Multi-Tenancy Helpers

### `tenantScoped(path)`
Automatic tenant isolation. Matches the subject field with the corresponding actor field.

**Convention:** Assumes actor has field at `user.{fieldName}` matching `subject.{fieldName}`.

```typescript
import { tenantScoped, and } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Only show posts from user's organization
    read: and(
      tenantScoped("post.organizationId"),  // Matches user.organizationId
      eq("post.status", "published")
    )
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

### `belongsToTenant(actorPath, subjectPath)`
Explicit cross-field tenant check.

```typescript
import { belongsToTenant } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // User can only access posts from their team
    read: belongsToTenant("user.teamId", "post.teamId"),
    
    // Multi-tenant isolation with explicit paths
    update: and(
      belongsToTenant("user.organizationId", "post.organizationId"),
      eq("post.ownerId", "user.id")
    )
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

## Policy Composition

### `extend(basePolicy, extension)`
Extend a base policy with additional actions. Overlapping actions are combined with AND.

```typescript
import { policy, extend, and, eq } from "@typed-policy/core";

// Base policy for all resources
const basePolicy = policy<Actor, Subject>({
  subject: "Resource",
  actions: {
    read: ({ actor }) => actor.user.role !== "banned",
    list: ({ actor }) => actor.user.isActive === true
  }
});

// Extend for specific resource type
const postPolicy = extend(basePolicy, {
  subject: "Post",
  actions: {
    // New action
    write: ({ actor }) => actor.user.role === "admin",
    
    // Overrides base with AND logic:
    // read becomes: (role !== "banned") AND (status !== "deleted")
    read: eq("post.status", "published")  // Combined with base!
  }
});
```

**Resulting `postPolicy.read`:** `and(baseRead, eq("post.status", "published"))`

---

### `andPolicies(policies[])`
Combine multiple policies with AND logic. All policies must allow an action.

```typescript
import { andPolicies, policy, eq } from "@typed-policy/core";

const tenantPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    read: belongsToTenant("user.orgId", "post.orgId")
  }
});

const rolePolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    read: ({ actor }) => actor.user.role !== "guest"
  }
});

const statusPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    read: eq("post.status", "published")
  }
});

// Combined: user must pass ALL policies
const combinedPolicy = andPolicies([
  tenantPolicy,
  rolePolicy,
  statusPolicy
]);

// Resulting read action:
// and(
//   belongsToTenant("user.orgId", "post.orgId"),
//   ({ actor }) => actor.user.role !== "guest",
//   eq("post.status", "published")
// )
```

---

### `orPolicies(policies[])`
Combine multiple policies with OR logic. Any policy can allow an action.

```typescript
import { orPolicies, policy, eq } from "@typed-policy/core";

const adminPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    delete: ({ actor }) => actor.user.role === "admin"
  }
});

const ownerPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    delete: eq("post.ownerId", "user.id")
  }
});

const moderatorPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    delete: eq("user.role", "moderator")
  }
});

// Combined: user can delete if admin OR owner OR moderator
const deletePolicy = orPolicies([
  adminPolicy,
  ownerPolicy,
  moderatorPolicy
]);

// Resulting delete action:
// or(
//   ({ actor }) => actor.user.role === "admin",
//   eq("post.ownerId", "user.id"),
//   eq("user.role", "moderator")
// )
```

---

## Complete Example: SaaS Application

```typescript
import {
  policy,
  extend,
  andPolicies,
  and,
  or,
  eq,
  neq,
  gt,
  between,
  startsWith,
  endsWith,
  contains,
  inArray,
  matches,
  isNull,
  tenantScoped,
  belongsToTenant,
  exists
} from "@typed-policy/core";

// Base policy with tenant isolation
type Actor = {
  user: {
    id: string;
    role: "admin" | "manager" | "user";
    organizationId: string;
    email: string;
  };
};

type Subject = {
  document: {
    id: string;
    organizationId: string;
    ownerId: string;
    status: "draft" | "review" | "published" | "archived";
    filename: string;
    createdAt: string;
    tags: string[];
  };
};

// Base policy for all resources
const basePolicy = policy<Actor, Subject>({
  subject: "Document",
  actions: {
    // All actions require belonging to the same tenant
    read: tenantScoped("document.organizationId"),
    write: tenantScoped("document.organizationId"),
    delete: tenantScoped("document.organizationId")
  }
});

// Document-specific policy
const documentPolicy = extend(basePolicy, {
  subject: "Document",
  actions: {
    // Read: published documents OR owned drafts
    read: or(
      eq("document.status", "published"),
      and(
        eq("document.status", "draft"),
        eq("document.ownerId", "user.id")
      )
    ),
    
    // List with filters
    list: and(
      // Tenant scoped (from base)
      // Published or owned
      or(
        eq("document.status", "published"),
        eq("document.ownerId", "user.id")
      ),
      // Not archived
      neq("document.status", "archived")
    ),
    
    // Search by filename
    searchPDFs: endsWith("document.filename", ".pdf"),
    searchByTag: contains("document.tags", "important"),
    searchByDate: between("document.createdAt", "2024-01-01", "2024-12-31"),
    
    // Write: managers and owners
    write: or(
      eq("user.role", "manager"),
      eq("document.ownerId", "user.id")
    ),
    
    // Delete: admins only
    delete: eq("user.role", "admin"),
    
    // Company email required for some actions
    validateEmail: matches("user.email", /@mycompany\.com$/)
  }
});

// Admin override policy
const adminPolicy = policy<Actor, Subject>({
  subject: "Document",
  actions: {
    read: eq("user.role", "admin"),
    write: eq("user.role", "admin"),
    delete: eq("user.role", "admin")
  }
});

// Final policy: admin OR regular user policy
const finalPolicy = orPolicies([adminPolicy, documentPolicy]);
```

---

## Migration Checklist

- [ ] Update imports: change `in` to `inArray`
- [ ] Review usage of `inArray` for clarity
- [ ] Consider using new string operators (`startsWith`, `endsWith`, `contains`)
- [ ] Consider using `between` for date/numeric ranges
- [ ] Consider using `matches` for validation
- [ ] Add multi-tenancy with `tenantScoped` or `belongsToTenant`
- [ ] Use cross-table operations (`exists`, `count`, `hasMany`) for SQL queries
- [ ] Refactor policies using `extend` and `andPolicies`/`orPolicies`
- [ ] Update Drizzle compile calls to include `relatedTables` for cross-table operations

---

## Need Help?

- 📖 [Full Documentation](../README.md)
- 💬 [Discussions](https://github.com/toglelabs/typed-policy/discussions)
- 🐛 [Issues](https://github.com/toglelabs/typed-policy/issues)
