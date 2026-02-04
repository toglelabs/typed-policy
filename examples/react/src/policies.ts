import {
  createActorProxy,
  createSubjectProxy,
  eq,
  or,
  policy,
  type ScopedSubjectPath,
  type SubjectPath,
} from "@typed-policy/core";

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

// Create subject proxy for type-safe path access
const subject = createSubjectProxy<Resources>();

// Helper to type paths correctly
const getPath = <T>(path: T): T & (SubjectPath | ScopedSubjectPath) =>
  path as T & (SubjectPath | ScopedSubjectPath);

// Example 1: Function expressions (pure functions) - ONLY receive { actor }
// Subject data is accessed through DSL operators (eq, and, or)
const canRead = ({ actor }: { actor: Actor }) => {
  // Functions can use actor data to return expressions or booleans
  if (actor.user.role === "admin") return true;
  // Return a declarative expression that references subject paths
  const actorProxy = createActorProxy(actor);
  return or(
    eq(getPath(subject.post.published), true),
    eq(getPath(subject.post.ownerId), actorProxy.user.id),
  );
};

const canWrite = ({ actor }: { actor: Actor }) => {
  if (actor.user.role === "admin") return true;
  // Return expression referencing both subject path and actor value
  const actorProxy = createActorProxy(actor);
  return eq(getPath(subject.post.ownerId), actorProxy.user.id);
};

export const postPolicy = policy<Actor, Resources>({
  subject: "Post",
  actions: {
    // Function expressions - pure functions that receive { actor } only
    read: canRead,
    write: canWrite,
    delete: ({ actor }) => {
      if (actor.user.role === "admin") return true;
      const actorProxy = createActorProxy(actor);
      return eq(getPath(subject.post.ownerId), actorProxy.user.id);
    },
    // Declarative expressions (using DSL operators)
    adminOnly: or(
      eq(getPath(subject.post.published), true),
      eq(getPath(subject.post.ownerId), getPath(subject.post.ownerId)),
    ),
    // Boolean literals
    alwaysAllow: true,
    neverAllow: false,
    // Mixed: Function that returns declarative expression
    ownerOnly: ({ actor }) => {
      const actorProxy = createActorProxy(actor);
      return eq(getPath(subject.post.ownerId), actorProxy.user.id);
    },
  },
});
