# Migration Guide: v0.1 to v0.2

This guide helps you migrate from Typed Policy v0.1 to v0.2. v0.2 introduces significant API improvements while maintaining the core philosophy of type-safe, universal policies.

## Overview

v0.2 represents a major evolution in the Typed Policy API. The most significant change is the separation of the policy context into distinct **actor** (the user making the request) and **subject** (the resource being accessed) types. This change:

- Makes authorization intent clearer
- Enables function-based policy expressions
- Supports boolean literals for static permissions
- Improves type inference and error messages

## Breaking Changes

### 1. Policy Generic Signature

**Before (v0.1):**

```typescript
import { policy } from "@typed-policy/core";

// Single context type combining everything
type Context = {
  user: { id: string; role: "admin" | "user" };
  post: { id: string; ownerId: string; published: boolean };
};

const postPolicy = policy<Context>({
  subject: "Post",
  actions: {
    read: or(
      eq("user.role", "admin"),
      eq("post.published", true),
      eq("post.ownerId", "user.id")
    )
  }
});
```

**After (v0.2):**

```typescript
import { policy } from "@typed-policy/core";

// Separate actor and subject types
type Actor = {
  user: { id: string; role: "admin" | "user" };
};

type Subject = {
  post: { id: string; ownerId: string; published: boolean };
};

const postPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    read: ({ actor, subject }) =>
      actor.user.role === "admin" ||
      subject.post.published ||
      actor.user.id === subject.post.ownerId
  }
});
```

### 2. Evaluation Context Structure

**Before (v0.1):**

```typescript
import { evaluate } from "@typed-policy/eval";

const result = evaluate(postPolicy.actions.read, {
  user: { id: "1", role: "user" },
  post: { id: "1", ownerId: "1", published: true }
});
```

**After (v0.2):**

```typescript
import { evaluate } from "@typed-policy/eval";

const result = evaluate(postPolicy.actions.read, {
  actor: {
    user: { id: "1", role: "user" }
  },
  subject: {
    post: { id: "1", ownerId: "1", published: true }
  }
});
```

### 3. SQL Compilation Options

**Before (v0.1):**

```typescript
import { compileToDrizzle } from "@typed-policy/drizzle";

const where = compileToDrizzle(postPolicy.actions.read, {
  user: { id: "1", role: "user" },
  tables: { post: posts.ownerId }
});
```

**After (v0.2):**

```typescript
import { compileToDrizzle } from "@typed-policy/drizzle";

const where = compileToDrizzle(postPolicy.actions.read, {
  actor: { user: { id: "1", role: "user" } },
  tables: { post: posts.ownerId }
});
```

### 4. Path References in DSL

Path references in `eq()` continue to work as before, but now refer to properties within the combined actor/subject context:

```typescript
// Still valid - "user" comes from actor, "post" from subject
eq("post.ownerId", "user.id")
```

## New Features

### 1. Function Expressions

v0.2 allows you to write policies as functions for complex logic:

```typescript
const postPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    read: ({ actor, subject }) => {
      // Complex conditional logic
      if (actor.user.role === "admin") return true;
      if (subject.post.status === "archived") return false;
      if (subject.post.ownerId === actor.user.id) return true;
      return subject.post.published;
    }
  }
});
```

Functions receive a typed context with `actor` and `subject` properties.

### 2. Boolean Literals

Simple static permissions can now use boolean literals:

```typescript
const postPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Always allow
    create: true,

    // Never allow (feature flag off)
    delete: false,

    // Conditional
    update: ({ actor, subject }) => actor.user.id === subject.post.ownerId
  }
});
```

### 3. Mixed Action Types

You can mix and match different action types in the same policy:

```typescript
const postPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Function expression
    read: ({ actor, subject }) => subject.post.published || actor.user.role === "admin",

    // Boolean literal
    create: true,

    // DSL expression (still supported!)
    delete: eq("user.role", "admin")
  }
});
```

## Migration Steps

### Step 1: Separate Your Context Types

Split your existing context into actor and subject:

```typescript
// Before
type Context = {
  user: { id: string; role: string };
  post: { id: string; ownerId: string };
};

// After
type Actor = {
  user: { id: string; role: string };
};

type Subject = {
  post: { id: string; ownerId: string };
};
```

### Step 2: Update Policy Definitions

Change `policy<Context>` to `policy<Actor, Subject>`:

```typescript
// Before
const myPolicy = policy<Context>({ ... });

// After
const myPolicy = policy<Actor, Subject>({ ... });
```

### Step 3: Update Evaluation Calls

Wrap your context in `actor` and `subject` properties:

```typescript
// Before
evaluate(policy.actions.read, {
  user: { id: "1", role: "admin" },
  post: { id: "1", ownerId: "1" }
});

// After
evaluate(policy.actions.read, {
  actor: { user: { id: "1", role: "admin" } },
  subject: { post: { id: "1", ownerId: "1" } }
});
```

### Step 4: Update SQL Compilation

Similarly update `compileToDrizzle` calls:

```typescript
// Before
compileToDrizzle(policy.actions.read, {
  user: { id: "1", role: "admin" },
  tables: { post: postsTable }
});

// After
compileToDrizzle(policy.actions.read, {
  actor: { user: { id: "1", role: "admin" } },
  tables: { post: postsTable }
});
```

### Step 5: Consider Function Expressions (Optional)

Where appropriate, convert DSL expressions to function expressions:

```typescript
// Before
read: or(
  eq("user.role", "admin"),
  eq("post.published", true)
)

// After (optional, DSL still works!)
read: ({ actor, subject }) =>
  actor.user.role === "admin" || subject.post.published
```

## Migration Checklist

- [ ] Identify all `policy<Context>` usages
- [ ] Split contexts into `Actor` and `Subject` types
- [ ] Update to `policy<Actor, Subject>`
- [ ] Find all `evaluate()` calls
- [ ] Wrap context in `{ actor, subject }` structure
- [ ] Find all `compileToDrizzle()` calls
- [ ] Update options to use `actor` property
- [ ] Run type checker: `pnpm typecheck`
- [ ] Run tests: `pnpm test`
- [ ] Update documentation

## Benefits of Migrating

1. **Clearer authorization model**: Separating actor from subject makes your intent explicit
2. **Better TypeScript errors**: Type inference is improved with separate types
3. **More flexible policies**: Function expressions handle complex logic better than DSL alone
4. **Future-proof**: v0.2 is the foundation for upcoming features

## Compatibility Notes

- DSL operators (`eq`, `and`, `or`) continue to work exactly as before
- Path strings in DSL (e.g., `"user.id"`) work the same way
- You can gradually migrate - mix v0.1-style DSL with v0.2 function expressions
- No runtime breaking changes - only API surface changes

## Getting Help

If you encounter issues during migration:

1. Check the [examples](examples/) for working v0.2 code
2. Review the [API Reference](README.md#api-reference) for detailed documentation
3. Open a [discussion](https://github.com/toglelabs/typed-policy/discussions) for questions
4. Report [bugs](https://github.com/toglelabs/typed-policy/issues) if something doesn't work

## See Also

- [CHANGELOG.md](CHANGELOG.md) - Full list of changes in v0.2
- [README.md](README.md) - Updated documentation and examples
