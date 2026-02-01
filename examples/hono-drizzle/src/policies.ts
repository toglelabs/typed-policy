import { and, eq, or, policy } from "@typed-policy/core";

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
      return eq("post.published", true);
    },
    
    read: ({ actor }) => {
      if (actor.user.role === "admin") {
        return true;
      }
      // Return declarative expression for SQL compilation
      return or(
        eq("post.published", true),
        eq("post.ownerId", actor.user.id)
      );
    },
    
    create: true, // Boolean literal - anyone can create
    
    update: ({ actor }) => {
      if (actor.user.role === "admin") {
        return true;
      }
      return and(
        eq("post.ownerId", actor.user.id),
        eq("post.published", false)
      );
    },
    
    delete: ({ actor }) => {
      if (actor.user.role === "admin") {
        return true;
      }
      return eq("post.ownerId", actor.user.id);
    },
    
    // Example of false literal (deny all)
    archive: false,
    
    // Example: pure function returning boolean
    adminOnly: ({ actor }) => actor.user.role === "admin",
  },
});
