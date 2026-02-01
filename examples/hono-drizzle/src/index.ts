import { compileToDrizzle } from "@typed-policy/drizzle";
import { evaluate } from "@typed-policy/eval";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { db, posts } from "./db.js";
import { type Actor, type Subject, postPolicy } from "./policies.js";

type Variables = {
  user: Actor["user"];
};

const app = new Hono<{ Variables: Variables }>();

const mockAuthMiddleware = async (c: Context<{ Variables: Variables }>, next: Next) => {
  const authHeader = c.req.header("Authorization");
  let user: Actor["user"];

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
  const actor: Actor = { user };

  // v0.2 API: compileToDrizzle(action, actor, tables)
  const listCondition = compileToDrizzle<Subject, Actor>(postPolicy.actions.list, actor, {
    post: posts.id, // Subject table mapping
  });

  const allPosts = await db.select().from(posts).where(listCondition);

  return c.json({
    posts: allPosts,
    actor: user,
  });
});

app.get("/posts/:id", async (c) => {
  const user = c.get("user");
  const postId = c.req.param("id");
  const actor: Actor = { user };

  const post = await db.select().from(posts).where(eq(posts.id, postId)).get();

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const subject: Subject = {
    post: {
      id: post.id,
      ownerId: post.ownerId,
      published: post.published,
    },
  };

  // v0.2 API: evaluate(action, actor, subject)
  const canRead = evaluate(postPolicy.actions.read, actor, subject);

  if (!canRead) {
    return c.json({ error: "Forbidden" }, 403);
  }

  return c.json({ post, actor: user });
});

app.post("/posts", async (c) => {
  const user = c.get("user");
  const actor: Actor = { user };
  const subject: Subject = {
    post: { id: "", ownerId: "", published: false },
  };

  // v0.2 API: evaluate(action, actor, subject)
  const canCreate = evaluate(postPolicy.actions.create, actor, subject);

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
  const actor: Actor = { user };

  const post = await db.select().from(posts).where(eq(posts.id, postId)).get();

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const subject: Subject = {
    post: {
      id: post.id,
      ownerId: post.ownerId,
      published: post.published,
    },
  };

  // v0.2 API: evaluate(action, actor, subject)
  const canDelete = evaluate(postPolicy.actions.delete, actor, subject);

  if (!canDelete) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await db.delete(posts).where(eq(posts.id, postId));

  return c.json({ message: "Post deleted" });
});

// Example of archive endpoint that uses false literal
app.post("/posts/:id/archive", async (c) => {
  const user = c.get("user");
  const actor: Actor = { user };
  const subject: Subject = {
    post: { id: "", ownerId: "", published: false },
  };

  // This will always deny because archive action is `false` literal
  const canArchive = evaluate(postPolicy.actions.archive, actor, subject);

  if (!canArchive) {
    return c.json({ error: "Archive action is disabled" }, 403);
  }

  return c.json({ message: "Post archived" });
});

app.get("/health", (c) => c.json({ status: "ok", version: "v0.2" }));

export default app;
