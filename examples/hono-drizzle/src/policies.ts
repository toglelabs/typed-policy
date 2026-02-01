import { and, eq, or, policy } from "@typed-policy/core";

export type AppPolicyContext = {
  user: {
    id: string;
    role: "admin" | "user";
  };
  post: {
    id: string;
    ownerId: string;
    published: boolean;
  };
};

export const postPolicy = policy<AppPolicyContext>({
  subject: "Post",
  actions: {
    list: or(eq("user.role", "admin"), eq("post.published", true)),
    read: or(eq("user.role", "admin"), eq("post.published", true), eq("post.ownerId", "user.id")),
    create: eq("user.role", "user"),
    update: or(
      eq("user.role", "admin"),
      and(eq("post.ownerId", "user.id"), eq("post.published", false)),
    ),
    delete: or(eq("user.role", "admin"), eq("post.ownerId", "user.id")),
  },
});
