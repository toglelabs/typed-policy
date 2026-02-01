import { compileToDrizzle } from "@typed-policy/drizzle";
import { evaluate } from "@typed-policy/eval";
import { eq } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { db, posts } from "./db.js";
import { type AppPolicyContext, postPolicy } from "./policies.js";

type User = {
  id: string;
  role: "admin" | "user";
};

type Variables = {
  user: User;
};

const app = new Hono<{ Variables: Variables }>();

const mockAuthMiddleware = async (c: Context<{ Variables: Variables }>, next: Next) => {
  const authHeader = c.req.header("Authorization");
  let user: User;

  if (authHeader === "Bearer admin-token") {
    user = { id: "admin-1", role: "admin" };
  } else if (authHeader === "Bearer user-token") {
    user = { id: "user-1", role: "user" };
  } else if (authHeader === "Bearer user2-token") {
    user = { id: "user-2", role: "user" };
  } else {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", user);
  return next();
};

app.use("/*", mockAuthMiddleware);

app.get("/posts", async (c) => {
  const user = c.get("user");

  const listCondition = compileToDrizzle<AppPolicyContext>(postPolicy.actions.list, {
    user,
    tables: {
      post: posts.ownerId as AnyColumn,
    },
  });

  const allPosts = await db.select().from(posts).where(listCondition);

  return c.json({
    posts: allPosts,
    user: { id: user.id, role: user.role },
  });
});

app.get("/posts/:id", async (c) => {
  const user = c.get("user");
  const postId = c.req.param("id");

  const post = await db.select().from(posts).where(eq(posts.id, postId)).get();

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const context: AppPolicyContext = {
    user,
    post: {
      id: post.id,
      ownerId: post.ownerId,
      published: post.published,
    },
  };

  const canRead = evaluate(postPolicy.actions.read, context as Record<string, unknown>);

  if (!canRead) {
    return c.json({ error: "Forbidden" }, 403);
  }

  return c.json({ post, user: { id: user.id, role: user.role } });
});

app.post("/posts", async (c) => {
  const user = c.get("user");

  const context: AppPolicyContext = {
    user,
    post: { id: "", ownerId: "", published: false },
  };

  const canCreate = evaluate(postPolicy.actions.create, context as Record<string, unknown>);

  if (!canCreate) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const id = crypto.randomUUID();

  const newPost = await db
    .insert(posts)
    .values({
      id,
      ownerId: user.id,
      title: body.title,
      content: body.content,
      published: body.published ?? false,
    })
    .returning()
    .get();

  return c.json({ post: newPost }, 201);
});

app.delete("/posts/:id", async (c) => {
  const user = c.get("user");
  const postId = c.req.param("id");

  const post = await db.select().from(posts).where(eq(posts.id, postId)).get();

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const context: AppPolicyContext = {
    user,
    post: {
      id: post.id,
      ownerId: post.ownerId,
      published: post.published,
    },
  };

  const canDelete = evaluate(postPolicy.actions.delete, context as Record<string, unknown>);

  if (!canDelete) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await db.delete(posts).where(eq(posts.id, postId));

  return c.json({ message: "Post deleted" });
});

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
