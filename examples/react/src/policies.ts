import { eq, or, policy } from "@typed-policy/core";

// Separate types for Actor and Subject
export type Actor = {
  user: {
    id: string;
    role: "admin" | "user";
  };
};

export type Subject = {
  post: {
    id: string;
    ownerId: string;
    published: boolean;
  };
};

// Example 1: Function expressions (pure functions)
const canRead = ({ actor, subject }: { actor: Actor; subject: Subject }) => {
  if (actor.user.role === "admin") return true;
  return subject.post.published || subject.post.ownerId === actor.user.id;
};

const canWrite = ({ actor, subject }: { actor: Actor; subject: Subject }) => {
  if (actor.user.role === "admin") return true;
  if (subject.post.ownerId !== actor.user.id) return false;
  return !subject.post.published;
};

export const postPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Function expressions (pure functions)
    read: canRead,
    write: canWrite,
    delete: ({ actor, subject }) => {
      if (actor.user.role === "admin") return true;
      return subject.post.ownerId === actor.user.id;
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
