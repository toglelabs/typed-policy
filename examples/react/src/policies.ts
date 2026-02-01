import { eq, or, policy } from "@typed-policy/core";

// Separate types for Actor and Resources
export type Actor = {
  user: {
    id: string;
    role: "admin" | "user";
  };
};

export type Resources = {
  post: {
    id: string;
    ownerId: string;
    published: boolean;
  };
};

// Example 1: Function expressions (pure functions) - ONLY receive { actor }
// Subject data is accessed through DSL operators (eq, and, or)
const canRead = ({ actor }: { actor: Actor }) => {
  // Functions can use actor data to return expressions or booleans
  if (actor.user.role === "admin") return true;
  // Return a declarative expression that references subject paths
  return or<Resources, Actor>(eq("post.published", true), eq("post.ownerId", actor.user.id));
};

const canWrite = ({ actor }: { actor: Actor }) => {
  if (actor.user.role === "admin") return true;
  // Return expression referencing both subject path and actor value
  return eq<Resources, "post.ownerId", Actor>("post.ownerId", actor.user.id);
};

export const postPolicy = policy<Actor, Resources>({
  subject: "Post",
  actions: {
    // Function expressions - pure functions that receive { actor } only
    read: canRead,
    write: canWrite,
    delete: ({ actor }) => {
      if (actor.user.role === "admin") return true;
      return eq("post.ownerId", actor.user.id);
    },
    // Declarative expressions (using DSL operators)
    adminOnly: or(eq("post.published", true), eq("post.ownerId", "user.id")),
    // Boolean literals
    alwaysAllow: true,
    neverAllow: false,
    // Mixed: Function that returns declarative expression
    ownerOnly: ({ actor }) => eq("post.ownerId", actor.user.id),
  },
});
