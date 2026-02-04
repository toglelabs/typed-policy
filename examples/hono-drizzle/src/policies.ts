import {
  and,
  createActorProxy,
  createSubjectProxy,
  eq,
  or,
  policy,
  type ScopedSubjectPath,
  type SubjectPath,
} from "@typed-policy/core";

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

export type Resources = Subject;

// Create subject proxy for type-safe path access
const subject = createSubjectProxy<Subject>();

// Helper to type paths correctly
const getPath = <T>(path: T): T & (SubjectPath | ScopedSubjectPath) =>
  path as T & (SubjectPath | ScopedSubjectPath);

export const postPolicy = policy<Actor, Subject>({
  subject: "Post",
  actions: {
    // Function expressions (compile-time evaluation for SQL)
    list: ({ actor }) => {
      if (actor.user.role === "admin") {
        // Admin sees all posts (true literal compiles to 1=1)
        return true;
      }
      // Regular users see only published posts
      return eq(getPath(subject.post.published), true);
    },

    read: ({ actor }) => {
      if (actor.user.role === "admin") {
        return true;
      }
      // Return declarative expression for SQL compilation
      const actorProxy = createActorProxy(actor);
      return or(
        eq(getPath(subject.post.published), true),
        eq(getPath(subject.post.ownerId), actorProxy.user.id),
      );
    },

    create: true, // Boolean literal - anyone can create

    update: ({ actor }) => {
      if (actor.user.role === "admin") {
        return true;
      }
      return and(
        eq(getPath(subject.post.ownerId), createActorProxy(actor).user.id),
        eq(getPath(subject.post.published), false),
      );
    },

    delete: ({ actor }) => {
      if (actor.user.role === "admin") {
        return true;
      }
      return eq(getPath(subject.post.ownerId), createActorProxy(actor).user.id);
    },

    // Example of false literal (deny all)
    archive: false,

    // Example: pure function returning boolean
    adminOnly: ({ actor }) => actor.user.role === "admin",
  },
});
