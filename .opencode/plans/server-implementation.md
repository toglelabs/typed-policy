# @typed-policy/server Implementation Plan

**Status**: Draft  
**Target Version**: 0.5.0  
**Estimated Duration**: ~5 weeks  
**Last Updated**: 2026-02-02

---

## Executive Summary

The `@typed-policy/server` package provides a client/server architecture for Typed Policy, enabling frontend applications to evaluate policies against a remote server with full type safety, caching, and minimal bundle impact.

**Key Innovation**: Type-safe policy evaluation over HTTP with intelligent caching and tree-shakeable client.

---

## 1. Architecture Overview

### High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Client (Browser/App)                                │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐       │
│  │   Policy Check   │─────▶│  createPolicyClient │───▶│   In-Memory Cache │      │
│  │   (isAllowed)    │      │   (HTTP Transport)   │      │   (TTL-based)     │      │
│  └──────────────────┘      └──────────────────┘      └──────────────────┘       │
│           │                          │                                               │
│           │                          ▼ (Cache Miss)                                 │
│           │               ┌──────────────────────────────────┐                    │
│           │               │      POST /api/policy/eval       │                    │
│           │               │   {policyId, action, context}    │                    │
│           │               └──────────────────────────────────┘                    │
└───────────┼───────────────────────────────────────────────────────────────────────┘
            │
            ▼ HTTP
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Server (Node.js/Bun/Deno)                          │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐       │
│  │   HTTP Handler   │─────▶│ createPolicyServer │───▶│  Policy Registry │       │
│  │   (Hono/Express) │      │   (Request Router)   │      │  (Policy Store)  │       │
│  └──────────────────┘      └──────────────────┘      └──────────────────┘       │
│           │                          │                                               │
│           ▼                          ▼                                               │
│  ┌──────────────────┐      ┌──────────────────┐                                   │
│  │ Database Adapter │◀─────│   Policy Compiler  │                                   │
│  │ (Drizzle/Generic)│      │   (to SQL/Eval)    │                                   │
│  └──────────────────┘      └──────────────────┘                                   │
│           │                                                                        │
│           ▼                                                                        │
│  ┌──────────────────┐                                                            │
│  │  SQL Execution   │                                                            │
│  │  (count(*) query)│                                                            │
│  └──────────────────┘                                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Sequence Diagram: Policy Evaluation Request

```
Client                          Server                         Database
  │                               │                               │
  │  1. isAllowed(policy, ctx)    │                               │
  │──────────────────────────────▶│                               │
  │                               │                               │
  │  2. Check Cache               │                               │
  │  [Cache Miss]                 │                               │
  │                               │                               │
  │  3. POST /api/policy/eval     │                               │
  │  {policyId, action, context}  │                               │
  │──────────────────────────────▶│                               │
  │                               │                               │
  │                               │  4. Lookup Policy             │
  │                               │  from Registry                │
  │                               │                               │
  │                               │  5. Compile to SQL            │
  │                               │  (via Database Adapter)       │
  │                               │                               │
  │                               │  6. Execute Count Query       │
  │                               │──────────────────────────────▶│
  │                               │                               │
  │                               │  7. Return Count              │
  │                               │◀──────────────────────────────│
  │                               │                               │
  │  8. Return Result             │                               │
  │  {allowed: count > 0}         │                               │
  │◀──────────────────────────────│                               │
  │                               │                               │
  │  9. Store in Cache            │                               │
  │                               │                               │
```

---

## 2. Package Structure

```
packages/server/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts                    # Public API exports
│   ├── types.ts                    # Shared type definitions
│   │
│   ├── server/                     # Server-side components
│   │   ├── index.ts                # Server exports
│   │   ├── createPolicyServer.ts   # Main server factory
│   │   ├── registry.ts             # Policy registry management
│   │   ├── handlers.ts             # HTTP request handlers
│   │   └── routes.ts               # Route definitions
│   │
│   ├── client/                     # Client-side components
│   │   ├── index.ts                # Client exports
│   │   ├── createPolicyClient.ts   # Main client factory
│   │   ├── cache.ts                # In-memory cache implementation
│   │   ├── transport.ts            # HTTP transport layer
│   │   └── types.ts                # Client-specific types
│   │
│   ├── adapters/                   # Database adapters
│   │   ├── index.ts                # Adapter exports
│   │   ├── types.ts                # Adapter interface definitions
│   │   ├── drizzle.ts              # Drizzle ORM adapter
│   │   └── generic.ts              # Generic SQL adapter
│   │
│   ├── frameworks/                 # Framework integrations
│   │   ├── index.ts                # Framework exports
│   │   ├── hono.ts                 # Hono integration
│   │   └── express.ts              # Express integration (Phase 4+)
│   │
│   └── protocol/                   # HTTP protocol definitions
│       ├── index.ts                # Protocol exports
│       ├── types.ts                # Request/response types
│       └── validation.ts           # Request validation
│
├── tests/
│   ├── server.test.ts              # Server unit tests
│   ├── client.test.ts              # Client unit tests
│   ├── adapters.test.ts            # Adapter tests
│   ├── integration.test.ts         # End-to-end tests
│   └── fixtures/
│       ├── policies.ts             # Test policy definitions
│       └── mock-adapter.ts         # Mock database adapter
│
└── dist/                           # Build output (generated)
    ├── index.js
    ├── index.d.ts
    ├── server/
    ├── client/
    ├── adapters/
    ├── frameworks/
    └── protocol/
```

---

## 3. Core Design Decisions

### 3.1 Database Adapters

**Decision**: Support both Drizzle ORM and generic SQL interfaces

**Rationale**:
- Drizzle users get type-safe, ORM-native experience
- Generic adapter enables non-Drizzle databases (Prisma, Knex, raw SQL)
- Common interface allows swapping adapters without policy changes

**Interface Design**:

```typescript
// adapters/types.ts
export interface DatabaseAdapter<TTables = unknown> {
  /** Execute a count query with the given condition */
  count(options: {
    table: string;
    where: SQLCondition;
  }): Promise<number>;

  /** Check if at least one record matches */
  exists(options: {
    table: string;
    where: SQLCondition;
  }): Promise<boolean>;

  /** Optional: Execute raw SQL for advanced use cases */
  query?(sql: string, params: unknown[]): Promise<unknown>;
}

export interface SQLCondition {
  sql: string;
  params: unknown[];
}

// Drizzle-specific adapter
export interface DrizzleAdapter<TTables> extends DatabaseAdapter<TTables> {
  drizzle: AnyDrizzleDatabase;
  tables: TTables;
}

// Generic adapter for raw SQL
export interface GenericAdapter extends DatabaseAdapter {
  execute(sql: string, params: unknown[]): Promise<{ rows: unknown[] }>;
}
```

### 3.2 In-Memory Cache

**Decision**: TTL-based, per-client-instance cache

**Rationale**:
- Client-side only (no server cache needed - server queries are already optimized)
- Per-instance means no shared state issues
- TTL prevents stale permissions from lingering
- Cache key includes policy ID, action, actor context hash

**Implementation**:

```typescript
// client/cache.ts
export interface CacheOptions {
  /** TTL in milliseconds (default: 30000 = 30s) */
  ttl: number;
  /** Maximum cache entries (default: 1000) */
  maxSize: number;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class PolicyCache {
  private cache = new Map<string, CacheEntry<boolean>>();
  private ttl: number;
  private maxSize: number;

  constructor(options?: Partial<CacheOptions>) {
    this.ttl = options?.ttl ?? 30000;
    this.maxSize = options?.maxSize ?? 1000;
  }

  get(key: string): boolean | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  set(key: string, value: boolean): void {
    if (this.cache.size >= this.maxSize) {
      // LRU eviction: remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  /** Invalidate entries matching a pattern */
  invalidate(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 3.3 Tree-Shakeable Client

**Decision**: Dynamic imports for optional features, minimal core

**Rationale**:
- Frontend bundle size is critical
- Not all clients need caching (short-lived operations)
- Framework integrations should be opt-in

**Import Patterns**:

```typescript
// Core client (always needed)
import { createPolicyClient } from "@typed-policy/server/client";

// With caching (adds ~2KB)
import { createPolicyClient } from "@typed-policy/server/client";
import { withCache } from "@typed-policy/server/client/cache";

// With Hono RPC (adds Hono client deps)
import { createHonoPolicyClient } from "@typed-policy/server/frameworks/hono";
```

**Implementation Strategy**:

```typescript
// client/index.ts - Core only
export interface PolicyClient {
  isAllowed(policy: string, action: string, context: PolicyContext): Promise<boolean>;
}

export function createPolicyClient(options: ClientOptions): PolicyClient {
  return {
    async isAllowed(policy, action, context) {
      const response = await fetch(options.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy, action, context }),
      });
      
      if (!response.ok) {
        throw new PolicyServerError(await response.text());
      }
      
      const result = await response.json();
      return result.allowed;
    },
  };
}

// client/cache.ts - Optional caching layer
export function withCache(
  client: PolicyClient,
  options?: CacheOptions
): PolicyClient {
  const cache = new PolicyCache(options);
  
  return {
    async isAllowed(policy, action, context) {
      const key = generateCacheKey(policy, action, context);
      
      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }
      
      const result = await client.isAllowed(policy, action, context);
      cache.set(key, result);
      return result;
    },
  };
}
```

### 3.4 HTTP Transport Only

**Decision**: Single POST endpoint, no WebSocket/Server-Sent Events

**Rationale**:
- HTTP POST is universally supported
- Simple to implement and debug
- Stateless design aligns with REST principles
- Can add WebSockets later if polling becomes an issue

**Protocol**:

```typescript
// protocol/types.ts

/** Request payload */
export interface PolicyEvalRequest {
  /** Policy identifier (registered on server) */
  policy: string;
  /** Action to evaluate */
  action: string;
  /** Evaluation context */
  context: {
    /** Actor performing the action */
    actor: Record<string, unknown>;
    /** Subject resource (optional for list operations) */
    subject?: Record<string, unknown>;
  };
  /** Optional: Client cache timestamp for conditional requests */
  ifModifiedSince?: number;
}

/** Response payload */
export interface PolicyEvalResponse {
  /** Evaluation result */
  allowed: boolean;
  /** Server timestamp for cache validation */
  timestamp: number;
  /** Optional: Compiled SQL for debugging */
  debug?: {
    sql?: string;
    params?: unknown[];
  };
}

/** Error response */
export interface PolicyEvalError {
  error: string;
  code: PolicyErrorCode;
  message: string;
}

export type PolicyErrorCode =
  | "POLICY_NOT_FOUND"
  | "ACTION_NOT_FOUND"
  | "INVALID_CONTEXT"
  | "ADAPTER_ERROR"
  | "COMPILATION_ERROR"
  | "RATE_LIMITED"
  | "UNAUTHORIZED";
```

---

## 4. API Specifications

### 4.1 Server API

```typescript
// server/index.ts

import type { Policy } from "@typed-policy/core";
import type { DatabaseAdapter } from "../adapters/types.js";

export interface PolicyServerOptions<TPolicies, TAdapter> {
  /** Database adapter for SQL compilation */
  adapter: TAdapter;
  /** Registered policies */
  policies: TPolicies;
  /** Optional: Authentication handler */
  authenticate?: (request: Request) => Promise<unknown> | unknown;
  /** Optional: Rate limiting config */
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  /** Optional: Enable debug mode (includes SQL in responses) */
  debug?: boolean;
  /** Optional: CORS configuration */
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
}

export interface PolicyServer {
  /** Handle HTTP request */
  handle(request: Request): Promise<Response>;
  /** Register a new policy at runtime */
  register<T, A>(name: string, policy: Policy<T, A>): void;
  /** Get registered policy names */
  listPolicies(): string[];
}

/**
 * Create a policy server instance
 * 
 * @example
 * ```typescript
 * import { createPolicyServer } from "@typed-policy/server";
 * import { drizzleAdapter } from "@typed-policy/server/adapters/drizzle";
 * import { db } from "./db.js";
 * import { postPolicy, userPolicy } from "./policies.js";
 * 
 * const server = createPolicyServer({
 *   adapter: drizzleAdapter(db, { posts, users }),
 *   policies: {
 *     posts: postPolicy,
 *     users: userPolicy,
 *   },
 *   authenticate: async (req) => {
 *     const token = req.headers.get("authorization");
 *     return await verifyToken(token);
 *   },
 * });
 * 
 * // Hono integration
 * app.post("/api/policy/eval", (c) => server.handle(c.req.raw));
 * ```
 */
export function createPolicyServer<
  TPolicies extends Record<string, Policy<unknown, unknown>>,
  TAdapter extends DatabaseAdapter
>(options: PolicyServerOptions<TPolicies, TAdapter>): PolicyServer;
```

### 4.2 Client API

```typescript
// client/index.ts

import type { Expr } from "@typed-policy/core";

export interface PolicyClientOptions {
  /** Server endpoint URL */
  endpoint: string;
  /** Optional: Custom fetch implementation */
  fetch?: typeof fetch;
  /** Optional: Request timeout in ms (default: 5000) */
  timeout?: number;
  /** Optional: Headers to include with every request */
  headers?: Record<string, string>;
  /** Optional: Retry configuration */
  retry?: {
    attempts: number;
    delay: number;
  };
}

export interface PolicyContext {
  /** Actor performing the action */
  actor: Record<string, unknown>;
  /** Subject resource (optional) */
  subject?: Record<string, unknown>;
}

export interface PolicyClient {
  /**
   * Check if an action is allowed
   * 
   * @param policy - Policy name registered on server
   * @param action - Action name (e.g., "read", "create")
   * @param context - Evaluation context
   * @returns Promise<boolean>
   * 
   * @example
   * ```typescript
   * const canRead = await client.isAllowed("posts", "read", {
   *   actor: { user: { id: "1", role: "admin" } },
   *   subject: { post: { id: "123", ownerId: "1", published: true } }
   * });
   * ```
   */
  isAllowed(
    policy: string,
    action: string,
    context: PolicyContext
  ): Promise<boolean>;

  /**
   * Batch evaluate multiple checks
   * Useful for UI permission grids
   * 
   * @param checks - Array of permission checks
   * @returns Promise<Record<string, boolean>>
   * 
   * @example
   * ```typescript
   * const permissions = await client.checkMany([
   *   { policy: "posts", action: "read", context: ctx },
   *   { policy: "posts", action: "create", context: ctx },
   *   { policy: "users", action: "update", context: ctx },
   * ]);
   * 
   * // Returns: { "posts.read": true, "posts.create": false, "users.update": true }
   * ```
   */
  checkMany(
    checks: Array<{
      policy: string;
      action: string;
      context: PolicyContext;
    }>
  ): Promise<Record<string, boolean>>;
}

/**
 * Create a policy client
 * 
 * @example
 * ```typescript
 * import { createPolicyClient } from "@typed-policy/server/client";
 * 
 * const client = createPolicyClient({
 *   endpoint: "/api/policy/eval",
 *   headers: {
 *     "Authorization": `Bearer ${token}`
 *   }
 * });
 * 
 * const canEdit = await client.isAllowed("posts", "update", {
 *   actor: currentUser,
 *   subject: post
 * });
 * ```
 */
export function createPolicyClient(options: PolicyClientOptions): PolicyClient;
```

### 4.3 Database Adapter Interface

```typescript
// adapters/types.ts

import type { Expr } from "@typed-policy/core";

/**
 * Base interface for all database adapters
 * 
 * Adapters are responsible for:
 * 1. Converting policy expressions to database-specific SQL
 * 2. Executing count/exists queries
 * 3. Handling database connections
 */
export interface DatabaseAdapter {
  /** Adapter identifier for debugging */
  readonly name: string;

  /**
   * Compile an expression to SQL conditions
   * 
   * @param expr - Policy expression
   * @param options - Compilation context
   * @returns SQL condition with parameters
   */
  compile<T, A>(
    expr: Expr<T, A>,
    options: CompileOptions<T, A>
  ): SQLCondition;

  /**
   * Execute a count query
   * 
   * @param table - Table name
   * @param where - SQL condition
   * @returns Number of matching rows
   */
  count(table: string, where: SQLCondition): Promise<number>;

  /**
   * Check if any rows match
   * 
   * @param table - Table name  
   * @param where - SQL condition
   * @returns True if at least one match
   */
  exists(table: string, where: SQLCondition): Promise<boolean>;
}

export interface SQLCondition {
  /** SQL WHERE clause (without "WHERE" keyword) */
  sql: string;
  /** Parameter values for prepared statement */
  params: unknown[];
}

export interface CompileOptions<T, A> {
  /** Actor context */
  actor: A;
  /** Table mappings (column references) */
  tables: TableMapping<T>;
  /** Optional: Related tables for subqueries */
  relatedTables?: RelatedTableMapping;
}

export type TableMapping<T> = {
  [K in keyof T]: {
    [P in keyof T[K]]: ColumnReference;
  };
};

export interface ColumnReference {
  /** Column identifier for SQL */
  toSQL(): string;
  /** Column name */
  name: string;
}

export type RelatedTableMapping = {
  [tableName: string]: Record<string, ColumnReference>;
};

/** 
 * Drizzle ORM adapter factory
 * 
 * @example
 * ```typescript
 * import { drizzleAdapter } from "@typed-policy/server/adapters/drizzle";
 * import { db } from "./db.js";
 * import { posts, users } from "./schema.js";
 * 
 * const adapter = drizzleAdapter(db, {
 *   posts: { id: posts.id, ownerId: posts.ownerId },
 *   users: { id: users.id, organizationId: users.organizationId }
 * });
 * ```
 */
export function drizzleAdapter<TTables>(
  db: AnyDrizzleDatabase,
  tables: TTables
): DatabaseAdapter;

/**
 * Generic SQL adapter factory
 * 
 * @example
 * ```typescript
 * import { genericAdapter } from "@typed-policy/server/adapters/generic";
 * import { pool } from "./db.js";
 * 
 * const adapter = genericAdapter({
 *   execute: async (sql, params) => {
 *     const result = await pool.query(sql, params);
 *     return { rows: result.rows };
 *   },
 *   tableMappings: {
 *     posts: { id: "id", ownerId: "owner_id" },
 *     users: { id: "id", organizationId: "organization_id" }
 *   }
 * });
 * ```
 */
export function genericAdapter(options: GenericAdapterOptions): DatabaseAdapter;

export interface GenericAdapterOptions {
  /** Execute raw SQL query */
  execute(sql: string, params: unknown[]): Promise<{ rows: unknown[]; count?: number }>;
  /** Table to column name mappings */
  tableMappings: Record<string, Record<string, string>>;
  /** Quote identifier function (default: double quotes) */
  quoteIdentifier?(name: string): string;
}
```

### 4.4 HTTP Protocol

```typescript
// protocol/types.ts

/** 
 * HTTP Protocol for Policy Evaluation
 * 
 * Endpoint: POST /api/policy/eval
 * Content-Type: application/json
 */

/** Request body schema */
export interface PolicyEvalRequest {
  /** Policy name (must be registered on server) */
  policy: string;
  
  /** Action to evaluate */
  action: string;
  
  /** Evaluation context */
  context: {
    /** Actor performing the action (current user) */
    actor: Record<string, unknown>;
    /** 
     * Subject resource (optional)
     * 
     * For list operations, this is typically omitted.
     * For individual resource checks, include the resource.
     */
    subject?: Record<string, unknown>;
  };
  
  /** 
   * Optional: Client cache timestamp
   * 
   * If provided and server result hasn't changed, 
   * may return 304 Not Modified (if server supports it)
   */
  ifModifiedSince?: number;
}

/** Success response body */
export interface PolicyEvalResponse {
  /** Evaluation result */
  allowed: boolean;
  
  /** Server timestamp for cache coordination */
  timestamp: number;
  
  /** 
   * Optional: Debug information
   * Only included if server has debug mode enabled
   */
  debug?: {
    /** Compiled SQL query */
    sql?: string;
    /** Query parameters */
    params?: unknown[];
    /** Execution time in milliseconds */
    executionTime?: number;
  };
}

/** Error response body */
export interface PolicyEvalError {
  /** Error code for programmatic handling */
  code: PolicyErrorCode;
  
  /** Human-readable error message */
  message: string;
  
  /** 
   * Optional: Additional error details
   * (e.g., validation errors, stack trace in dev mode)
   */
  details?: Record<string, unknown>;
}

export type PolicyErrorCode =
  | "POLICY_NOT_FOUND"      // Policy name not registered
  | "ACTION_NOT_FOUND"      // Action not defined in policy
  | "INVALID_CONTEXT"       // Missing or invalid context fields
  | "COMPILATION_ERROR"     // Failed to compile policy to SQL
  | "ADAPTER_ERROR"         // Database adapter error
  | "RATE_LIMITED"          // Too many requests
  | "UNAUTHORIZED"          // Authentication required
  | "INTERNAL_ERROR";       // Unexpected server error

/** HTTP Status Code Mapping */
export const ErrorStatusCodes: Record<PolicyErrorCode, number> = {
  POLICY_NOT_FOUND: 404,
  ACTION_NOT_FOUND: 404,
  INVALID_CONTEXT: 400,
  COMPILATION_ERROR: 500,
  ADAPTER_ERROR: 500,
  RATE_LIMITED: 429,
  UNAUTHORIZED: 401,
  INTERNAL_ERROR: 500,
};

/** Request validation */
export function validateRequest(
  body: unknown
): { success: true; data: PolicyEvalRequest } | { 
  success: false; 
  error: { code: PolicyErrorCode; message: string } 
} {
  if (!body || typeof body !== "object") {
    return {
      success: false,
      error: { code: "INVALID_CONTEXT", message: "Request body must be an object" }
    };
  }
  
  const { policy, action, context } = body as Record<string, unknown>;
  
  if (!policy || typeof policy !== "string") {
    return {
      success: false,
      error: { code: "INVALID_CONTEXT", message: "Missing or invalid 'policy' field" }
    };
  }
  
  if (!action || typeof action !== "string") {
    return {
      success: false,
      error: { code: "INVALID_CONTEXT", message: "Missing or invalid 'action' field" }
    };
  }
  
  if (!context || typeof context !== "object") {
    return {
      success: false,
      error: { code: "INVALID_CONTEXT", message: "Missing or invalid 'context' field" }
    };
  }
  
  if (!(context as Record<string, unknown>).actor) {
    return {
      success: false,
      error: { code: "INVALID_CONTEXT", message: "Missing 'context.actor' field" }
    };
  }
  
  return { success: true, data: body as PolicyEvalRequest };
}
```

### 4.5 Hono Framework Integration

```typescript
// frameworks/hono.ts

import type { Hono, Context } from "hono";
import type { PolicyServer } from "../server/index.js";

export interface HonoPolicyOptions {
  /** Policy server instance */
  server: PolicyServer;
  /** Route path (default: "/api/policy/eval") */
  path?: string;
  /** Optional: Middleware to run before policy check */
  middleware?: ((c: Context, next: () => Promise<void>) => Promise<void> | void)[];
}

/**
 * Mount policy server routes on Hono app
 * 
 * @example
 * ```typescript
 * import { Hono } from "hono";
 * import { createPolicyServer } from "@typed-policy/server";
 * import { drizzleAdapter } from "@typed-policy/server/adapters/drizzle";
 * import { honoPolicyRoutes } from "@typed-policy/server/frameworks/hono";
 * 
 * const app = new Hono();
 * const server = createPolicyServer({
 *   adapter: drizzleAdapter(db, tables),
 *   policies: { posts: postPolicy }
 * });
 * 
 * // Mount with default path
 * honoPolicyRoutes(app, { server });
 * 
 * // Or with custom path
 * honoPolicyRoutes(app, { server, path: "/policies/evaluate" });
 * 
 * // With authentication middleware
 * honoPolicyRoutes(app, {
 *   server,
 *   middleware: [authMiddleware],
 *   path: "/api/policy/eval"
 * });
 * ```
 */
export function honoPolicyRoutes(
  app: Hono,
  options: HonoPolicyOptions
): void;

/**
 * Create a typed Hono RPC client for policy evaluation
 * 
 * This provides full type safety when using Hono's RPC client
 * 
 * @example
 * ```typescript
 * import { hc } from "hono/client";
 * import { createPolicyServer } from "@typed-policy/server";
 * import { policyRoutes } from "@typed-policy/server/frameworks/hono";
 * 
 * // Server setup
 * const app = new Hono();
 * const server = createPolicyServer({ adapter, policies });
 * app.route("/api/policy", policyRoutes(server));
 * 
 * // Client setup with typed RPC
 * type AppType = typeof app;
 * const client = hc<AppType>("http://localhost:3000");
 * 
 * const result = await client.api.policy.eval.$post({
 *   json: {
 *     policy: "posts",
 *     action: "read",
 *     context: { actor: user }
 *   }
 * });
 * ```
 */
export function policyRoutes(server: PolicyServer): Hono;
```

---

## 5. Implementation Phases

### Phase 1: Server Core (Week 1)

**Goal**: Establish server foundation with HTTP handling and policy registry

**Tasks**:

1. **Project Setup** (Day 1)
   - [ ] Create `packages/server/` directory structure
   - [ ] Set up `package.json` with dependencies
   - [ ] Configure TypeScript and build tools
   - [ ] Add to pnpm workspace

2. **Core Types** (Day 1-2)
   - [ ] Define `PolicyServer` interface
   - [ ] Define `PolicyServerOptions` type
   - [ ] Define protocol types (`PolicyEvalRequest`, `PolicyEvalResponse`)
   - [ ] Create error types and codes

3. **Policy Registry** (Day 2-3)
   - [ ] Implement `PolicyRegistry` class
   - [ ] Support policy registration
   - [ ] Support policy lookup by name
   - [ ] Add runtime policy validation

4. **HTTP Handler** (Day 3-4)
   - [ ] Create `createPolicyServer()` factory
   - [ ] Implement request parsing
   - [ ] Implement response serialization
   - [ ] Add error handling middleware

5. **Request Validation** (Day 4-5)
   - [ ] Implement request schema validation
   - [ ] Add context validation
   - [ ] Create helpful error messages

**Deliverables**:
- `packages/server/` with basic structure
- `createPolicyServer()` function
- HTTP request/response handling
- Policy registry
- Unit tests for server core

**Example Usage**:
```typescript
import { createPolicyServer } from "@typed-policy/server";

const server = createPolicyServer({
  adapter: mockAdapter,
  policies: {
    posts: postPolicy,
  },
});

const response = await server.handle(new Request("/api/policy/eval", {
  method: "POST",
  body: JSON.stringify({
    policy: "posts",
    action: "read",
    context: { actor: { user: { id: "1" } } }
  })
}));
```

---

### Phase 2: Database Adapters (Week 2)

**Goal**: Implement database adapter system with Drizzle and generic support

**Tasks**:

1. **Adapter Interface** (Day 1)
   - [ ] Define `DatabaseAdapter` interface
   - [ ] Define `SQLCondition` type
   - [ ] Create adapter factory types

2. **Drizzle Adapter** (Day 2-3)
   - [ ] Create `drizzleAdapter()` factory
   - [ ] Implement `compile()` method
   - [ ] Implement `count()` method
   - [ ] Implement `exists()` method
   - [ ] Handle column references

3. **Generic Adapter** (Day 3-4)
   - [ ] Create `genericAdapter()` factory
   - [ ] Implement SQL generation
   - [ ] Support parameterized queries
   - [ ] Add identifier quoting

4. **SQL Compilation** (Day 4-5)
   - [ ] Port expression compilation from `@typed-policy/drizzle`
   - [ ] Adapt for adapter interface
   - [ ] Handle all expression types
   - [ ] Add subquery support (exists, count, hasMany)

**Deliverables**:
- `DatabaseAdapter` interface
- `drizzleAdapter` implementation
- `genericAdapter` implementation
- SQL compilation engine
- Adapter unit tests

**Example Usage**:
```typescript
import { drizzleAdapter } from "@typed-policy/server/adapters/drizzle";
import { genericAdapter } from "@typed-policy/server/adapters/generic";

// Drizzle
const drizzle = drizzleAdapter(db, {
  posts: { id: posts.id, ownerId: posts.ownerId }
});

// Generic SQL
const generic = genericAdapter({
  execute: (sql, params) => pool.query(sql, params),
  tableMappings: {
    posts: { id: "id", ownerId: "owner_id" }
  }
});
```

---

### Phase 3: Client Core (Week 3)

**Goal**: Build tree-shakeable client with caching layer

**Tasks**:

1. **Core Client** (Day 1-2)
   - [ ] Create `createPolicyClient()` factory
   - [ ] Implement HTTP transport
   - [ ] Add request serialization
   - [ ] Handle error responses

2. **Cache Implementation** (Day 2-3)
   - [ ] Create `PolicyCache` class
   - [ ] Implement TTL eviction
   - [ ] Implement LRU eviction
   - [ ] Add cache key generation

3. **Caching Layer** (Day 3-4)
   - [ ] Create `withCache()` decorator
   - [ ] Implement cache lookup
   - [ ] Implement cache storage
   - [ ] Add cache invalidation API

4. **Advanced Features** (Day 4-5)
   - [ ] Implement `checkMany()` batch method
   - [ ] Add retry logic
   - [ ] Add timeout handling
   - [ ] Support custom fetch

**Deliverables**:
- `createPolicyClient()` function
- `PolicyCache` implementation
- `withCache()` decorator
- Batch evaluation support
- Client unit tests

**Example Usage**:
```typescript
import { createPolicyClient } from "@typed-policy/server/client";
import { withCache } from "@typed-policy/server/client/cache";

// Basic client
const client = createPolicyClient({
  endpoint: "/api/policy/eval"
});

// With caching
const cachedClient = withCache(client, {
  ttl: 30000,
  maxSize: 1000
});

// Usage
const canRead = await cachedClient.isAllowed("posts", "read", {
  actor: currentUser,
  subject: post
});
```

---

### Phase 4: Framework Integration (Week 4)

**Goal**: Integrate with Hono framework and provide typed RPC support

**Tasks**:

1. **Hono Routes** (Day 1-2)
   - [ ] Create `honoPolicyRoutes()` function
   - [ ] Mount server on Hono app
   - [ ] Support middleware chain
   - [ ] Add route customization

2. **Hono RPC Types** (Day 2-3)
   - [ ] Define typed routes for Hono
   - [ ] Export request/response schemas
   - [ ] Support Hono's `hc` client

3. **Authentication Integration** (Day 3-4)
   - [ ] Add auth middleware support
   - [ ] Pass actor from auth context
   - [ ] Handle auth errors

4. **Express Integration** (Optional) (Day 4-5)
   - [ ] Create Express middleware
   - [ ] Support Express request/response
   - [ ] Add route mounting

**Deliverables**:
- Hono framework integration
- Typed RPC support
- Authentication middleware examples
- Framework integration tests

**Example Usage**:
```typescript
import { Hono } from "hono";
import { honoPolicyRoutes } from "@typed-policy/server/frameworks/hono";

const app = new Hono();

honoPolicyRoutes(app, {
  server,
  path: "/api/policy/eval",
  middleware: [authMiddleware]
});
```

---

### Phase 5: Testing & Documentation (Week 5)

**Goal**: Comprehensive testing, documentation, and examples

**Tasks**:

1. **Unit Tests** (Day 1-2)
   - [ ] Server core tests (100% coverage)
   - [ ] Adapter tests (Drizzle + Generic)
   - [ ] Client tests (with/without cache)
   - [ ] Protocol validation tests

2. **Integration Tests** (Day 2-3)
   - [ ] End-to-end client/server tests
   - [ ] Hono integration tests
   - [ ] Database adapter integration tests
   - [ ] Cache behavior tests

3. **Documentation** (Day 3-4)
   - [ ] Write comprehensive README
   - [ ] Create API documentation
   - [ ] Write integration guides
   - [ ] Document security considerations

4. **Examples** (Day 4-5)
   - [ ] Create `examples/server-hono/` example
   - [ ] Add React + Server client example
   - [ ] Document common patterns
   - [ ] Performance benchmarks

**Deliverables**:
- >90% test coverage
- Complete documentation
- Working examples
- Performance benchmarks

---

## 6. Type Safety Flow

### Type Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Server (Source of Truth)                          │
│                                                                          │
│  1. Define Policies                                                      │
│     ┌──────────────────┐                                                │
│     │ const postPolicy │───▶ Policy<Post, Actor>                        │
│     └──────────────────┘                                                │
│                                                                          │
│  2. Create Server                                                        │
│     ┌──────────────────────────────────────┐                           │
│     │ createPolicyServer({ policies: {...} })│                          │
│     └──────────────────────────────────────┘                           │
│                    │                                                     │
│                    ▼                                                     │
│     Extracted: { posts: Policy<Post, Actor> }                           │
│                                                                          │
└────────────────────┼────────────────────────────────────────────────────┘
                     │
                     │  Type Inference
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Client (Type Consumer)                            │
│                                                                          │
│  3. Infer Types from Server                                              │
│                                                                          │
│  // Shared types file (generated or manually maintained)                │
│  export type PolicyDefinitions = typeof server.policies;                │
│  export type PolicyNames = keyof PolicyDefinitions;                     │
│                                                                          │
│  4. Type-Safe Client                                                     │
│                                                                          │
│  const client = createTypedClient<PolicyDefinitions>({                  │
│    endpoint: "/api/policy/eval"                                         │
│  });                                                                      │
│                                                                          │
│  5. Type-Safe Usage                                                      │
│                                                                          │
│  // ✅ Valid - 'posts' exists and 'read' is valid action                │
│  client.isAllowed("posts", "read", {                                     │
│    actor: { user: { id: string } },                                     │
│    subject: { post: { id: string } }                                    │
│  });                                                                      │
│                                                                          │
│  // ❌ Error - 'articles' doesn't exist                                  │
│  client.isAllowed("articles", "read", ctx);                              │
│                                                                          │
│  // ❌ Error - 'delete' not in postPolicy actions                        │
│  client.isAllowed("posts", "delete", ctx);                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation Strategy

```typescript
// Types flow from server to client through shared definitions

// ===== server/policies.ts =====
import { definePolicy } from "@typed-policy/core";

export const postPolicy = definePolicy({
  subject: {} as { post: { id: string; ownerId: string; published: boolean } },
  actor: {} as { user: { id: string; role: "admin" | "user" } },
  actions: {
    read: (ctx) => /* ... */,
    update: (ctx) => /* ... */,
    delete: (ctx) => /* ... */,
  }
});

export const userPolicy = definePolicy({
  subject: {} as { user: { id: string; organizationId: string } },
  actor: {} as { user: { id: string; role: string } },
  actions: {
    read: (ctx) => /* ... */,
    update: (ctx) => /* ... */,
  }
});

export const policies = {
  posts: postPolicy,
  users: userPolicy,
};

export type PolicyDefinitions = typeof policies;

// ===== shared/types.ts (shared between server and client) =====
import type { PolicyDefinitions } from "../server/policies.js";

export type { PolicyDefinitions };

export type PolicyName = keyof PolicyDefinitions;

export type PolicyActions<T extends PolicyName> = 
  keyof PolicyDefinitions[T]["actions"];

export type PolicySubject<T extends PolicyName> =
  PolicyDefinitions[T] extends { subject: infer S } ? S : never;

export type PolicyActor<T extends PolicyName> =
  PolicyDefinitions[T] extends { actor: infer A } ? A : never;

// ===== client/policy-client.ts =====
import type { PolicyDefinitions, PolicyName, PolicyActions } from "../shared/types.js";

export interface TypedPolicyClient<TPolicies extends Record<string, unknown>> {
  isAllowed<
    P extends keyof TPolicies,
    A extends keyof TPolicies[P]["actions"]
  >(
    policy: P,
    action: A,
    context: {
      actor: TPolicies[P]["actor"];
      subject?: TPolicies[P]["subject"];
    }
  ): Promise<boolean>;
}

export function createTypedClient<TPolicies extends Record<string, unknown>>(
  options: ClientOptions
): TypedPolicyClient<TPolicies> {
  const baseClient = createPolicyClient(options);
  
  return {
    isAllowed: async (policy, action, context) => {
      // Type-safe at compile time, runtime just passes through
      return baseClient.isAllowed(
        policy as string,
        action as string,
        context
      );
    },
  };
}

// ===== client/usage.ts =====
import { createTypedClient } from "./policy-client.js";
import type { PolicyDefinitions } from "../shared/types.js";

const client = createTypedClient<PolicyDefinitions>({
  endpoint: "/api/policy/eval"
});

// Full type safety!
const canRead = await client.isAllowed("posts", "read", {
  actor: { user: { id: "1", role: "admin" } },
  subject: { post: { id: "123", ownerId: "1", published: true } }
});
```

---

## 7. Cache Strategy

### Cache Key Generation

```typescript
// client/cache-keys.ts

/**
 * Generate a deterministic cache key for a policy evaluation
 * 
 * Key format: policy:action:actorHash[:subjectHash]
 * 
 * @example
 * "posts:read:a1b2c3d4" -> Check if actor can read posts
 * "posts:update:a1b2c3d4:e5f6g7h8" -> Check if actor can update specific post
 */
export function generateCacheKey(
  policy: string,
  action: string,
  context: PolicyContext
): string {
  const actorHash = hashObject(context.actor);
  
  if (context.subject) {
    const subjectHash = hashObject(context.subject);
    return `${policy}:${action}:${actorHash}:${subjectHash}`;
  }
  
  return `${policy}:${action}:${actorHash}`;
}

/**
 * Simple deterministic object hash
 * 
 * Note: This is for cache keys, not cryptography.
 * Uses JSON.stringify with sorted keys for consistency.
 */
function hashObject(obj: Record<string, unknown>): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  
  // Simple FNV-1a hash for short keys
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  
  // Convert to base36 for shorter strings
  return (hash >>> 0).toString(36);
}
```

### Cache Invalidation

```typescript
// client/cache.ts

export interface PolicyCache {
  // ... get/set methods ...
  
  /**
   * Invalidate cache entries by pattern
   * 
   * @example
   * // Invalidate all post policy checks
   * cache.invalidate(/^posts:/);
   * 
   * // Invalidate specific action
   * cache.invalidate(/^posts:update:/);
   * 
   * // Invalidate for specific actor
   * cache.invalidate(/:a1b2c3d4/);
   */
  invalidate(pattern: RegExp): void;
  
  /**
   * Invalidate all entries for a policy
   */
  invalidatePolicy(policy: string): void;
  
  /**
   * Invalidate all entries for a policy action
   */
  invalidateAction(policy: string, action: string): void;
  
  /**
   * Clear entire cache
   */
  clear(): void;
}

export class PolicyCacheImpl implements PolicyCache {
  private cache = new Map<string, CacheEntry<boolean>>();
  
  // ... other methods ...
  
  invalidate(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  invalidatePolicy(policy: string): void {
    this.invalidate(new RegExp(`^${policy}:`));
  }
  
  invalidateAction(policy: string, action: string): void {
    this.invalidate(new RegExp(`^${policy}:${action}:`));
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```

### TTL Strategy

```typescript
// client/cache.ts

export interface CacheOptions {
  /**
   * Time-to-live in milliseconds
   * 
   * Default: 30000 (30 seconds)
   * 
   * Recommendations:
   * - High-security: 5000 (5s) or 0 (disabled)
   * - Balanced: 30000 (30s)
   * - Performance: 60000 (60s) or higher
   */
  ttl: number;
  
  /**
   * Maximum cache entries
   * 
   * Default: 1000
   * 
   * When exceeded, LRU eviction kicks in.
   */
  maxSize: number;
  
  /**
   * Stale-while-revalidate mode
   * 
   * If true, returns cached value while refreshing in background.
   * Good for UI responsiveness.
   * 
   * Default: false
   */
  staleWhileRevalidate?: boolean;
}

export class PolicyCacheImpl implements PolicyCache {
  private cache = new Map<string, CacheEntry<boolean>>();
  private accessOrder: string[] = [];
  private options: CacheOptions;
  
  constructor(options: CacheOptions) {
    this.options = {
      ttl: 30000,
      maxSize: 1000,
      staleWhileRevalidate: false,
      ...options,
    };
  }
  
  get(key: string): boolean | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    const now = Date.now();
    
    // Update access order for LRU
    this.updateAccessOrder(key);
    
    // Check TTL
    if (now > entry.expiresAt) {
      if (this.options.staleWhileRevalidate) {
        // Return stale value, but don't delete (background refresh)
        return entry.value;
      }
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }
  
  set(key: string, value: boolean): void {
    // Check max size and evict if needed
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    const now = Date.now();
    this.cache.set(key, {
      value,
      expiresAt: now + this.options.ttl,
      createdAt: now,
    });
    
    this.updateAccessOrder(key);
  }
  
  private updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }
  
  private evictLRU(): void {
    // Remove least recently used (first in array)
    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
}
```

---

## 8. Security Considerations

### Authentication & Authorization

```typescript
// Security middleware example

/**
 * Authentication handler
 * 
 * The server never trusts the client-provided actor context.
 * It must verify and reconstruct the actor from the auth token.
 */
export interface AuthenticateFn {
  (request: Request): Promise<{
    /** Verified actor context */
    actor: Record<string, unknown>;
    /** Optional: Additional metadata */
    metadata?: Record<string, unknown>;
  }>;
}

// Server configuration with authentication
const server = createPolicyServer({
  adapter,
  policies,
  
  // Always authenticate requests
  authenticate: async (request) => {
    const token = extractBearerToken(request);
    const user = await verifyJWT(token);
    
    return {
      actor: {
        user: {
          id: user.id,
          role: user.role,
          organizationId: user.organizationId,
        }
      }
    };
  }
});

/**
 * IMPORTANT: Client-provided actor context is IGNORED when
 * authenticate is configured. The server overrides with verified data.
 */
```

### Rate Limiting

```typescript
// Rate limiting implementation

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  maxRequests: number;
  /** Optional: Per-user instead of per-IP */
  keyGenerator?: (request: Request) => string;
}

class RateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(private config: RateLimitConfig) {}
  
  isAllowed(request: Request): boolean {
    const key = this.config.keyGenerator?.(request) ?? 
                request.headers.get("x-forwarded-for") ?? 
                "unknown";
    
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Get existing requests for this key
    const timestamps = this.requests.get(key) ?? [];
    
    // Remove old entries outside window
    const validTimestamps = timestamps.filter(t => t > windowStart);
    
    // Check limit
    if (validTimestamps.length >= this.config.maxRequests) {
      return false;
    }
    
    // Add current request
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    
    return true;
  }
}

// Server configuration
const server = createPolicyServer({
  adapter,
  policies,
  rateLimit: {
    windowMs: 60000,    // 1 minute
    maxRequests: 100,   // 100 requests per minute
    keyGenerator: (req) => {
      // Rate limit by user ID if authenticated
      const userId = extractUserId(req);
      return userId ?? req.headers.get("x-forwarded-for") ?? "anonymous";
    }
  }
});
```

### Input Validation

```typescript
// Request validation with security checks

export function validateRequest(body: unknown): ValidationResult {
  // Check for prototype pollution
  if (containsPrototypePollution(body)) {
    return {
      success: false,
      error: {
        code: "INVALID_CONTEXT",
        message: "Invalid request: prototype pollution detected"
      }
    };
  }
  
  // Check for excessive nesting (DoS protection)
  if (getNestingDepth(body) > 10) {
    return {
      success: false,
      error: {
        code: "INVALID_CONTEXT",
        message: "Invalid request: excessive nesting depth"
      }
    };
  }
  
  // Check payload size (implement at server level)
  // Usually done before this function is called
  
  // Validate structure
  if (!isValidPolicyRequest(body)) {
    return {
      success: false,
      error: {
        code: "INVALID_CONTEXT",
        message: "Invalid request structure"
      }
    };
  }
  
  return { success: true, data: body };
}

function containsPrototypePollution(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  
  const forbiddenKeys = ["__proto__", "constructor", "prototype"];
  
  for (const key of Object.keys(obj)) {
    if (forbiddenKeys.includes(key)) return true;
    if (containsPrototypePollution((obj as Record<string, unknown>)[key])) {
      return true;
    }
  }
  
  return false;
}
```

### SQL Injection Prevention

```typescript
// Database adapter security

/**
 * All database adapters MUST use parameterized queries.
 * Never concatenate user input into SQL strings.
 */

export interface SQLCondition {
  /** SQL with placeholders (e.g., "id = $1 AND owner_id = $2") */
  sql: string;
  /** Parameters (NEVER interpolated into SQL) */
  params: unknown[];
}

// Drizzle adapter (safe by default)
const drizzle = drizzleAdapter(db, tables);
// Drizzle's SQL builder uses parameterized queries internally

// Generic adapter (must be careful)
const generic = genericAdapter({
  execute: async (sql, params) => {
    // ✓ SAFE: Using parameterized query
    return await pool.query(sql, params);
    
    // ✗ DANGEROUS: Never do this!
    // return await pool.query(`SELECT * WHERE id = ${params[0]}`);
  },
  tableMappings: {
    posts: { id: "id", ownerId: "owner_id" }
  },
  // Optional: Custom identifier quoting
  quoteIdentifier: (name) => `"${name.replace(/"/g, '""')}"`
});
```

### CORS & CSP

```typescript
// CORS configuration

export interface CORSConfig {
  /** Allowed origins */
  origin: string | string[] | ((origin: string) => boolean);
  /** Allow credentials */
  credentials?: boolean;
  /** Allowed methods */
  methods?: string[];
  /** Allowed headers */
  allowedHeaders?: string[];
  /** Max age for preflight cache */
  maxAge?: number;
}

// Server configuration
const server = createPolicyServer({
  adapter,
  policies,
  cors: {
    origin: [
      "https://app.example.com",
      "https://admin.example.com"
    ],
    credentials: true,
    methods: ["POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400 // 24 hours
  }
});
```

---

## 9. Success Criteria

### Functional Requirements

| # | Requirement | Priority | Validation |
|---|-------------|----------|------------|
| 1 | Server can register and serve multiple policies | P0 | Unit tests |
| 2 | Client can evaluate policies via HTTP | P0 | Integration tests |
| 3 | Drizzle adapter compiles and executes SQL | P0 | Adapter tests |
| 4 | Generic adapter works with raw SQL | P0 | Adapter tests |
| 5 | Client cache stores and retrieves results | P1 | Client tests |
| 6 | Cache TTL expires entries correctly | P1 | Client tests |
| 7 | Hono integration mounts routes correctly | P1 | Framework tests |
| 8 | Type inference works end-to-end | P1 | Type checking |
| 9 | Authentication middleware integration | P2 | Integration tests |
| 10 | Rate limiting prevents abuse | P2 | Security tests |

### Performance Criteria

| Metric | Target | Worst Case |
|--------|--------|------------|
| Server response time (p95) | < 50ms | < 200ms |
| Client cache hit latency | < 1ms | < 5ms |
| Client cache miss latency | < 100ms | < 500ms |
| Bundle size (core client) | < 5KB gzipped | < 10KB gzipped |
| Bundle size (with cache) | < 7KB gzipped | < 12KB gzipped |
| Memory usage (cache) | < 10MB | < 50MB |

### Quality Criteria

- [ ] > 90% test coverage
- [ ] 0 security vulnerabilities (npm audit)
- [ ] All TypeScript strict mode checks pass
- [ ] Biome linting passes
- [ ] Documentation complete with examples
- [ ] CHANGELOG.md updated
- [ ] Migration guide if breaking changes

---

## 10. Code Examples

### Complete Server Setup

```typescript
// server.ts
import { createPolicyServer } from "@typed-policy/server";
import { drizzleAdapter } from "@typed-policy/server/adapters/drizzle";
import { Hono } from "hono";
import { honoPolicyRoutes } from "@typed-policy/server/frameworks/hono";
import { verifyToken } from "./auth.js";
import { db } from "./db.js";
import { posts, users } from "./schema.js";

// Define policies
const postPolicy = {
  actions: {
    read: (ctx: { actor: { user: { role: string } } }) => {
      if (ctx.actor.user.role === "admin") return true;
      return { kind: "eq" as const, left: "post.published", right: true };
    },
    update: (ctx: { actor: { user: { id: string } } }) => ({
      kind: "eq" as const,
      left: "post.ownerId",
      right: ctx.actor.user.id
    }),
  }
};

// Create server
const server = createPolicyServer({
  adapter: drizzleAdapter(db, {
    posts: {
      id: posts.id,
      ownerId: posts.ownerId,
      published: posts.published
    }
  }),
  policies: {
    posts: postPolicy,
  },
  authenticate: async (request) => {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");
    
    const user = await verifyToken(token);
    return { actor: { user } };
  },
  rateLimit: {
    windowMs: 60000,
    maxRequests: 100
  }
});

// Setup Hono app
const app = new Hono();

honoPolicyRoutes(app, {
  server,
  path: "/api/policy/eval"
});

export default app;
```

### Complete Client Setup

```typescript
// client.ts
import { createPolicyClient } from "@typed-policy/server/client";
import { withCache } from "@typed-policy/server/client/cache";

// Get auth token from your auth system
const getAuthToken = () => localStorage.getItem("token");

// Create base client
const baseClient = createPolicyClient({
  endpoint: "https://api.example.com/api/policy/eval",
  headers: () => ({
    "Authorization": `Bearer ${getAuthToken()}`
  }),
  timeout: 5000,
  retry: {
    attempts: 3,
    delay: 1000
  }
});

// Add caching layer
const client = withCache(baseClient, {
  ttl: 30000,      // 30 seconds
  maxSize: 1000,   // Max 1000 cached results
  staleWhileRevalidate: true
});

// Usage in React component
function PostCard({ post }: { post: Post }) {
  const [canEdit, setCanEdit] = useState(false);
  const user = useCurrentUser();
  
  useEffect(() => {
    client.isAllowed("posts", "update", {
      actor: { user },
      subject: { post }
    }).then(setCanEdit);
  }, [post.id, user.id]);
  
  return (
    <div>
      <h3>{post.title}</h3>
      {canEdit && <button>Edit</button>}
    </div>
  );
}

// Batch permission check
async function loadPermissions() {
  const user = getCurrentUser();
  
  const permissions = await client.checkMany([
    { policy: "posts", action: "create", context: { actor: { user } } },
    { policy: "posts", action: "read", context: { actor: { user } } },
    { policy: "users", action: "update", context: { actor: { user } } },
  ]);
  
  // Returns: { "posts.create": true, "posts.read": true, "users.update": false }
  return permissions;
}
```

### Typed Client with Hono RPC

```typescript
// shared/types.ts
import { postPolicy, userPolicy } from "../server/policies.js";

export const policies = {
  posts: postPolicy,
  users: userPolicy,
};

export type PolicyDefinitions = typeof policies;

// server.ts
import { Hono } from "hono";
import { createPolicyServer } from "@typed-policy/server";
import { policyRoutes } from "@typed-policy/server/frameworks/hono";
import { policies } from "./shared/types.js";

const app = new Hono();
const server = createPolicyServer({ adapter, policies });

// Mount typed routes
app.route("/api/policy", policyRoutes(server));

export type AppType = typeof app;

// client.ts
import { hc } from "hono/client";
import type { AppType } from "./server.js";

const client = hc<AppType>("https://api.example.com");

// Fully typed request!
const result = await client.api.policy.eval.$post({
  json: {
    policy: "posts",
    action: "read",
    context: {
      actor: { user: { id: "1", role: "admin" } }
    }
  }
});

const { allowed } = await result.json();
```

### Generic Adapter Example

```typescript
// generic-adapter-example.ts
import { genericAdapter } from "@typed-policy/server/adapters/generic";
import { createPolicyServer } from "@typed-policy/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create generic adapter for PostgreSQL
const adapter = genericAdapter({
  execute: async (sql, params) => {
    const result = await pool.query(sql, params);
    return {
      rows: result.rows,
      count: result.rowCount ?? undefined
    };
  },
  
  tableMappings: {
    posts: {
      id: "id",
      ownerId: "owner_id",
      published: "published",
      organizationId: "organization_id"
    },
    users: {
      id: "id",
      organizationId: "organization_id",
      role: "role"
    }
  },
  
  // PostgreSQL uses double quotes for identifiers
  quoteIdentifier: (name) => `"${name.replace(/"/g, '""')}"`
});

// Create server with generic adapter
const server = createPolicyServer({
  adapter,
  policies: {
    posts: postPolicy,
    users: userPolicy,
  }
});
```

### Cache Invalidation Patterns

```typescript
// cache-invalidation.ts
import { withCache, PolicyCache } from "@typed-policy/server/client/cache";

const cache = new PolicyCache({
  ttl: 60000,
  maxSize: 1000
});

const client = withCache(baseClient, { cache });

// Pattern 1: Invalidate on data mutation
async function updatePost(postId: string, data: PostUpdate) {
  // Perform update
  await api.updatePost(postId, data);
  
  // Invalidate specific post checks
  cache.invalidate(new RegExp(`:posts:update:[^:]+:${hashSubjectId(postId)}`));
  cache.invalidate(new RegExp(`:posts:delete:[^:]+:${hashSubjectId(postId)}`));
}

// Pattern 2: Invalidate on logout
function logout() {
  // Clear all cached permissions for security
  cache.clear();
  
  // Or invalidate by current user
  const userId = getCurrentUserId();
  cache.invalidate(new RegExp(`:${hashActorId({ user: { id: userId } })}`));
}

// Pattern 3: Periodic refresh
setInterval(() => {
  // Clear cache every 5 minutes to prevent stale data
  cache.clear();
}, 5 * 60 * 1000);

// Pattern 4: Conditional invalidation
function onWebSocketMessage(message: WebSocketMessage) {
  if (message.type === "PERMISSION_CHANGED") {
    cache.invalidatePolicy(message.policy);
  }
}
```

### React Hook Integration

```typescript
// usePolicy.ts
import { useState, useEffect, useCallback } from "react";
import { createPolicyClient } from "@typed-policy/server/client";
import { withCache } from "@typed-policy/server/client/cache";

const client = withCache(
  createPolicyClient({ endpoint: "/api/policy/eval" }),
  { ttl: 30000 }
);

export function usePolicy(
  policy: string,
  action: string,
  context: PolicyContext,
  options?: {
    enabled?: boolean;
    onSuccess?: (allowed: boolean) => void;
    onError?: (error: Error) => void;
  }
) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.isAllowed(policy, action, context);
      setAllowed(result);
      options?.onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      options?.onError?.(err as Error);
    } finally {
      setLoading(false);
    }
  }, [policy, action, context]);

  useEffect(() => {
    if (options?.enabled !== false) {
      check();
    }
  }, [policy, action, JSON.stringify(context)]);

  return { allowed, loading, error, refetch: check };
}

// Usage
function PostEditor({ post }: { post: Post }) {
  const user = useCurrentUser();
  const { allowed: canEdit, loading } = usePolicy(
    "posts",
    "update",
    { actor: { user }, subject: { post } }
  );

  if (loading) return <Spinner />;
  if (!canEdit) return <AccessDenied />;
  
  return <EditForm post={post} />;
}
```

---

## Appendix A: Dependencies

### Production Dependencies

```json
{
  "@typed-policy/core": "workspace:*",
  "@typed-policy/drizzle": "workspace:*"
}
```

### Optional Peer Dependencies

```json
{
  "hono": "^4.0.0",
  "drizzle-orm": "^0.30.0",
  "express": "^4.0.0"
}
```

### Dev Dependencies

```json
{
  "typescript": "^5.7.0",
  "tsup": "^8.3.0",
  "vitest": "^2.0.0",
  "@vitest/coverage-v8": "^2.0.0",
  "@biomejs/biome": "^1.9.4",
  "@types/node": "^22.0.0"
}
```

---

## Appendix B: File Templates

### package.json Template

```json
{
  "name": "@typed-policy/server",
  "version": "0.5.0",
  "description": "Client/server architecture for typed policies",
  "author": "Ihsan VP <m.ihsan.vp@gmail.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/toglelabs/typed-policy.git",
    "directory": "packages/server"
  },
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./client": {
      "import": "./dist/client/index.js",
      "types": "./dist/client/index.d.ts"
    },
    "./adapters/*": {
      "import": "./dist/adapters/*.js",
      "types": "./dist/adapters/*.d.ts"
    },
    "./frameworks/*": {
      "import": "./dist/frameworks/*.js",
      "types": "./dist/frameworks/*.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist",
    "lint": "biome check src",
    "format": "biome format --write src",
    "test": "vitest"
  },
  "dependencies": {
    "@typed-policy/core": "workspace:*",
    "@typed-policy/drizzle": "workspace:*"
  },
  "peerDependencies": {
    "hono": "^4.0.0",
    "drizzle-orm": "^0.30.0"
  },
  "peerDependenciesMeta": {
    "hono": { "optional": true },
    "drizzle-orm": { "optional": true }
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsup": "^8.3.0",
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "@biomejs/biome": "^1.9.4",
    "@types/node": "^22.0.0",
    "hono": "^4.0.0",
    "drizzle-orm": "^0.30.0"
  }
}
```

### tsup.config.ts Template

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/client/index.ts",
    "src/adapters/drizzle.ts",
    "src/adapters/generic.ts",
    "src/frameworks/hono.ts",
    "src/protocol/index.ts",
  ],
  format: ["esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ["@typed-policy/core", "@typed-policy/drizzle", "hono", "drizzle-orm"],
});
```

---

## Appendix C: Testing Strategy

### Unit Test Template

```typescript
// tests/server.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createPolicyServer } from "../src/server/index.js";
import { mockAdapter } from "./fixtures/mock-adapter.js";
import { postPolicy } from "./fixtures/policies.js";

describe("createPolicyServer", () => {
  let server: ReturnType<typeof createPolicyServer>;
  
  beforeEach(() => {
    server = createPolicyServer({
      adapter: mockAdapter,
      policies: { posts: postPolicy }
    });
  });
  
  it("should handle valid evaluation request", async () => {
    const request = new Request("/api/policy/eval", {
      method: "POST",
      body: JSON.stringify({
        policy: "posts",
        action: "read",
        context: {
          actor: { user: { id: "1", role: "admin" } }
        }
      })
    });
    
    const response = await server.handle(request);
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.allowed).toBe(true);
  });
  
  it("should return 404 for unknown policy", async () => {
    const request = new Request("/api/policy/eval", {
      method: "POST",
      body: JSON.stringify({
        policy: "unknown",
        action: "read",
        context: { actor: { user: { id: "1" } } }
      })
    });
    
    const response = await server.handle(request);
    expect(response.status).toBe(404);
  });
});
```

### Integration Test Template

```typescript
// tests/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createPolicyServer } from "../src/server/index.js";
import { createPolicyClient } from "../src/client/index.js";
import { drizzleAdapter } from "../src/adapters/drizzle.js";
import { db, posts } from "./fixtures/database.js";
import { postPolicy } from "./fixtures/policies.js";

describe("Integration: Client ↔ Server ↔ Database", () => {
  let server: ReturnType<typeof createPolicyServer>;
  let client: ReturnType<typeof createPolicyClient>;
  
  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
    
    server = createPolicyServer({
      adapter: drizzleAdapter(db, { posts }),
      policies: { posts: postPolicy }
    });
    
    // Start test server
    const port = await startTestServer(server);
    
    client = createPolicyClient({
      endpoint: `http://localhost:${port}/api/policy/eval`
    });
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
    await stopTestServer();
  });
  
  it("should evaluate policy end-to-end", async () => {
    const result = await client.isAllowed("posts", "read", {
      actor: { user: { id: "1", role: "admin" } },
      subject: { post: { id: "1", ownerId: "1", published: true } }
    });
    
    expect(result).toBe(true);
  });
});
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-02-02 | Ihsan VP | Initial draft |
