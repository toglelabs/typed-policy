# Migration Guide: v0.2 to v0.3

## Overview

v0.3.0 is a **small, focused release** that adds essential comparison operators. This is a **non-breaking** upgrade with no API changes to existing functionality.

**Breaking Changes:** None

**New Features:** 9 new operators

---

## New Operators

### Comparison Operators

#### `neq(left, right)` - Not Equal
Returns `true` when two values are not equal.

```typescript
import { neq } from "@typed-policy/core";

// v0.2: Had to use not(eq(...))
const oldWay = not(eq("post.status", "deleted"));

// v0.3: Cleaner with neq
const newWay = neq("post.status", "deleted");
```

**Example:**
```typescript
const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Show non-deleted posts
    read: neq("post.status", "deleted"),
    
    // Not the owner
    isCollaborator: neq("post.ownerId", "user.id")
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

#### `gt(left, right)` - Greater Than
Returns `true` when left > right.

```typescript
import { gt } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Recent posts only
    listRecent: gt("post.createdAt", "2024-01-01"),
    
    // Age restriction
    viewMatureContent: gt("user.age", 18),
    
    // High score posts
    listPopular: gt("post.score", 100)
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

#### `lt(left, right)` - Less Than
Returns `true` when left < right.

```typescript
import { lt } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Task",
  actions: {
    // Old tasks
    listStale: lt("task.updatedAt", "2024-01-01"),
    
    // Low priority
    isLowPriority: lt("task.priority", 3)
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

#### `gte(left, right)` - Greater Than or Equal
Returns `true` when left >= right.

```typescript
import { gte } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "User",
  actions: {
    // Adult or senior
    isAdult: gte("user.age", 18),
    
    // Non-negative score
    hasValidScore: gte("post.score", 0)
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

#### `lte(left, right)` - Less Than or Equal
Returns `true` when left <= right.

```typescript
import { lte } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "User",
  actions: {
    // Login attempt limits
    canAttemptLogin: lte("user.loginAttempts", 3),
    
    // Not expired
    isValid: lte("subscription.expiresAt", "2024-12-31")
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

### Logical Operator

#### `not(expr)` - Negation
Returns the opposite of an expression.

```typescript
import { not, and, eq } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Not archived
    read: not(eq("post.status", "archived")),
    
    // Not deleted AND not archived
    listActive: and(
      not(eq("post.status", "deleted")),
      not(eq("post.status", "archived"))
    ),
    
    // Complex negation
    canEdit: not(or(
      eq("post.locked", true),
      eq("post.status", "published")
    ))
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

### Collection Operator

#### `inArray(path, values[])` - Array Membership
Returns `true` if the path value is in the provided array.

```typescript
import { inArray } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Multiple allowed statuses
    canView: inArray("post.status", ["published", "draft", "review"]),
    
    // Role whitelist
    hasAccess: inArray("user.role", ["admin", "moderator", "editor"]),
    
    // Category filter
    isTechPost: inArray("post.category", ["tech", "programming", "ai"])
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

### Null Check Operators

#### `isNull(path)` - Check if Null
Returns `true` if the value is `null`.

```typescript
import { isNull, and } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Not deleted (no deletedAt timestamp)
    isActive: isNull("post.deletedAt"),
    
    // Unpublished drafts
    isDraft: and(
      isNull("post.publishedAt"),
      eq("post.status", "draft")
    )
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

#### `isNotNull(path)` - Check if Not Null
Returns `true` if the value is not `null`.

```typescript
import { isNotNull, and } from "@typed-policy/core";

const policy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Published posts only
    isPublished: isNotNull("post.publishedAt"),
    
    // Active published posts
    listActive: and(
      isNotNull("post.publishedAt"),
      isNull("post.deletedAt")
    ),
    
    // Has been edited
    hasEdits: isNotNull("post.lastEditedAt")
  }
});
```

**Support:** ✅ Frontend evaluation, ✅ SQL compilation

---

## Practical Examples

### Example 1: Age-Gated Content

```typescript
import { policy, gt, inArray, and } from "@typed-policy/core";

type Actor = {
  user: {
    id: string;
    age: number;
    role: "admin" | "moderator" | "user" | "guest";
  };
};

type Subject = {
  content: {
    id: string;
    rating: "G" | "PG" | "PG-13" | "R" | "NC-17";
  };
};

const contentPolicy = policy<Actor, Subject>({
  subject: "Content",
  actions: {
    // R-rated content: 18+ with approved role
    viewRestricted: and(
      gt("user.age", 17),
      inArray("user.role", ["admin", "moderator", "user"])
    ),
    
    // PG-13: 13+ or admin
    viewPG13: ({ actor }) => {
      if (actor.user.role === "admin") return true;
      return gt("user.age", 12);
    }
  }
});
```

---

### Example 2: Document Management

```typescript
import {
  policy,
  eq,
  neq,
  gt,
  inArray,
  isNull,
  isNotNull,
  and,
  or
} from "@typed-policy/core";

type Actor = {
  user: {
    id: string;
    role: "admin" | "editor" | "viewer";
  };
};

type Subject = {
  document: {
    id: string;
    ownerId: string;
    status: "draft" | "review" | "published" | "archived";
    createdAt: string;
    deletedAt: string | null;
    publishedAt: string | null;
  };
};

const documentPolicy = policy<Actor, Subject>({
  subject: "Document",
  actions: {
    // Read: not deleted AND (published OR owned)
    read: and(
      isNull("document.deletedAt"),
      or(
        isNotNull("document.publishedAt"),
        eq("document.ownerId", "user.id")
      )
    ),
    
    // List: active documents from this year
    list: and(
      isNull("document.deletedAt"),
      neq("document.status", "archived"),
      gt("document.createdAt", "2024-01-01")
    ),
    
    // Edit: owner or admin, not archived
    edit: and(
      or(
        eq("document.ownerId", "user.id"),
        eq("user.role", "admin")
      ),
      neq("document.status", "archived")
    ),
    
    // Status workflow
    canPublish: inArray("document.status", ["draft", "review"]),
    canArchive: inArray("document.status", ["published", "review"]),
    
    // Admin override
    adminDelete: eq("user.role", "admin")
  }
});
```

---

### Example 3: E-Commerce Order Policies

```typescript
import {
  policy,
  eq,
  neq,
  gt,
  gte,
  lt,
  inArray,
  isNull,
  and,
  or,
  not
} from "@typed-policy/core";

type Actor = {
  user: {
    id: string;
    role: "customer" | "seller" | "admin";
    accountAge: number; // days
  };
};

type Subject = {
  order: {
    id: string;
    customerId: string;
    sellerId: string;
    status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "refunded";
    total: number;
    cancelledAt: string | null;
    createdAt: string;
  };
};

const orderPolicy = policy<Actor, Subject>({
  subject: "Order",
  actions: {
    // View order: customer, seller, or admin
    view: or(
      eq("order.customerId", "user.id"),
      eq("order.sellerId", "user.id"),
      eq("user.role", "admin")
    ),
    
    // Cancel order: customer within 24h, or seller/admin
    cancel: or(
      and(
        eq("order.customerId", "user.id"),
        eq("order.status", "pending"),
        gt("user.accountAge", 1) // Account older than 1 day
      ),
      eq("order.sellerId", "user.id"),
      eq("user.role", "admin")
    ),
    
    // Refund: only for delivered orders, admin only
    refund: and(
      eq("order.status", "delivered"),
      eq("user.role", "admin"),
      isNull("order.cancelledAt")
    ),
    
    // List orders by status
    listPending: eq("order.status", "pending"),
    listActive: inArray("order.status", ["pending", "confirmed", "shipped"]),
    listComplete: inArray("order.status", ["delivered", "refunded"]),
    
    // High value orders (admin only)
    viewHighValue: and(
      gte("order.total", 1000),
      eq("user.role", "admin")
    ),
    
    // Not cancelled filter
    listValid: not(eq("order.status", "cancelled"))
  }
});
```

---

## Comparison: v0.2 vs v0.3

### Before (v0.2)

```typescript
import { policy, eq, and, or } from "@typed-policy/core";

const limitedPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Had to use verbose workarounds
    read: ({ actor, subject }) => {
      // Not equal - manual check
      if (subject.post.status === "deleted") return false;
      return true;
    },
    
    // Multiple values - verbose or()
    canAccess: or(
      eq("user.role", "admin"),
      or(
        eq("user.role", "moderator"),
        eq("user.role", "editor")
      )
    ),
    
    // Null check - manual
    isActive: ({ subject }) => subject.post.deletedAt === null
  }
});
```

### After (v0.3)

```typescript
import {
  policy,
  eq,
  neq,
  inArray,
  isNull,
  and
} from "@typed-policy/core";

const cleanPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Not equal - clean!
    read: neq("post.status", "deleted"),
    
    // Multiple values - simple!
    canAccess: inArray("user.role", ["admin", "moderator", "editor"]),
    
    // Null check - declarative!
    isActive: isNull("post.deletedAt"),
    
    // Combined operations
    listPublished: and(
      neq("post.status", "deleted"),
      isNull("post.deletedAt")
    )
  }
});
```

---

## Migration Checklist

- [ ] Upgrade packages: `pnpm update @typed-policy/core @typed-policy/eval @typed-policy/drizzle`
- [ ] Replace manual not-equal checks with `neq()`
- [ ] Replace nested `or()` for multiple values with `inArray()`
- [ ] Replace manual null checks with `isNull()` / `isNotNull()`
- [ ] Use `gt()`, `lt()`, `gte()`, `lte()` for comparisons
- [ ] Use `not()` for negation
- [ ] Review policies for opportunities to simplify
- [ ] Run tests to ensure everything works
- [ ] Update any policy documentation

---

## Performance Notes

All v0.3 operators compile to efficient SQL:

| Operator | SQL Equivalent |
|----------|----------------|
| `neq` | `column != value` |
| `gt` | `column > value` |
| `lt` | `column < value` |
| `gte` | `column >= value` |
| `lte` | `column <= value` |
| `inArray` | `column IN (values)` |
| `isNull` | `column IS NULL` |
| `isNotNull` | `column IS NOT NULL` |
| `not` | `NOT (condition)` |

---

## Need Help?

- 📖 [Full Documentation](../README.md)
- 🚀 [v0.4 Migration Guide](./MIGRATION_v0.3_to_v0.4.md) - Next steps!
- 💬 [Discussions](https://github.com/toglelabs/typed-policy/discussions)
- 🐛 [Issues](https://github.com/toglelabs/typed-policy/issues)
