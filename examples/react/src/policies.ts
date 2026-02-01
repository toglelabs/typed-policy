import { and, eq, or, policy } from "@typed-policy/core";
import type { PolicyContext } from "@typed-policy/core";

export const postPolicy = policy<PolicyContext>({
  subject: "Post",
  actions: {
    read: or(eq("user.role", "admin"), eq("post.published", true), eq("post.ownerId", "user.id")),
    write: or(
      eq("user.role", "admin"),
      and(eq("post.ownerId", "user.id"), eq("post.published", false)),
    ),
    delete: or(eq("user.role", "admin"), eq("post.ownerId", "user.id")),
  },
});
