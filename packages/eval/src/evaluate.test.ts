import {
  type ScopedSubjectPath,
  type SubjectPath,
  and,
  between,
  contains,
  createActorProxy,
  createSubjectProxy,
  endsWith,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  matches,
  neq,
  not,
  or,
  startsWith,
} from "@typed-policy/core";
import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate.js";

// Separate Actor and Resources types for v0.2 API
type Actor = {
  user: {
    id: string;
    role: "admin" | "user";
    age: number;
  };
};

type Resources = {
  post: {
    id: string;
    ownerId: string;
    published: boolean;
    status: "draft" | "published" | "archived" | "deleted";
    createdAt: string;
    score: number;
    deletedAt: string | null;
    publishedAt: string | null;
  };
  comment: {
    id: string;
    postId: string;
    content: string;
  }[];
};

describe("evaluate", () => {
  // Helper to get subject paths with proper typing
  const subject = createSubjectProxy<Resources>();
  const getPath = <T>(path: T): T & (SubjectPath | ScopedSubjectPath) =>
    path as T & (SubjectPath | ScopedSubjectPath);

  describe("eq", () => {
    it("should return true when values are equal", () => {
      const expr = eq(getPath(subject.post.published), true);
      const actor = { user: { id: "1", role: "admin" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when values are not equal", () => {
      const expr = eq(getPath(subject.post.published), false);
      const actor = { user: { id: "1", role: "admin" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should compare two subject paths", () => {
      const expr = eq(getPath(subject.post.ownerId), getPath(subject.post.id));
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should compare subject path with actor value", () => {
      const actor = createActorProxy<Actor>({
        user: { id: "1", role: "user" as const, age: 25 },
      });
      const expr = eq(getPath(subject.post.ownerId), actor.user.id);
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });
  });

  describe("neq", () => {
    it("should return true when values are not equal", () => {
      const expr = neq(getPath(subject.post.status), "deleted");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when values are equal", () => {
      const expr = neq(getPath(subject.post.status), "published");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("gt/lt/gte/lte", () => {
    it("should compare numbers with gt", () => {
      const expr = gt(getPath(subject.post.score), 0);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 10,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should compare numbers with lt", () => {
      const expr = lt(getPath(subject.post.score), 100);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 10,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should compare numbers with gte", () => {
      const expr = gte(getPath(subject.post.score), 10);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 10,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should compare numbers with lte", () => {
      const expr = lte(getPath(subject.post.score), 10);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 10,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when comparing with null", () => {
      const expr = gt(getPath(subject.post.score), 0);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: null as unknown as number,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("inArray", () => {
    it("should return true when value is in array", () => {
      const expr = inArray(getPath(subject.post.status), ["published", "draft"]);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when value is not in array", () => {
      const expr = inArray(getPath(subject.post.status), ["draft", "archived"]);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("isNull/isNotNull", () => {
    it("should return true for isNull when value is null", () => {
      const expr = isNull(getPath(subject.post.deletedAt));
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false for isNull when value is not null", () => {
      const expr = isNull(getPath(subject.post.publishedAt));
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: "2024-01-01",
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should return true for isNotNull when value is not null", () => {
      const expr = isNotNull(getPath(subject.post.publishedAt));
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: "2024-01-01",
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false for isNotNull when value is null", () => {
      const expr = isNotNull(getPath(subject.post.deletedAt));
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("startsWith/endsWith/contains", () => {
    it("should check startsWith", () => {
      const expr = startsWith(getPath(subject.post.id), "post-");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "post-123",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should check endsWith", () => {
      const expr = endsWith(getPath(subject.post.id), "-123");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "post-123",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should check contains", () => {
      const expr = contains(getPath(subject.post.id), "st-12");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "post-123",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false for non-string values", () => {
      const expr = startsWith(getPath(subject.post.published), "true");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("between", () => {
    it("should return true when value is between min and max", () => {
      const expr = between(getPath(subject.post.score), 0, 100);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 50,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when value is outside range", () => {
      const expr = between(getPath(subject.post.score), 0, 100);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 150,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should return false when comparing with null", () => {
      const expr = between(getPath(subject.post.score), 0, 100);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: null as unknown as number,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("matches", () => {
    it("should match regex pattern", () => {
      const expr = matches(getPath(subject.post.id), /^post-\d+$/);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "post-123",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false for non-matching pattern", () => {
      const expr = matches(getPath(subject.post.id), /^user-\d+$/);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "post-123",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should return false for non-string values", () => {
      const expr = matches(getPath(subject.post.published), "true");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("logical operators", () => {
    it("should handle not", () => {
      const expr = not(eq(getPath(subject.post.published), false));
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should handle and", () => {
      const expr = and(
        eq(getPath(subject.post.published), true),
        eq(getPath(subject.post.status), "published"),
      );
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should handle and with one false", () => {
      const expr = and(
        eq(getPath(subject.post.published), true),
        eq(getPath(subject.post.status), "draft"),
      );
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should handle or", () => {
      const expr = or(
        eq(getPath(subject.post.status), "published"),
        eq(getPath(subject.post.status), "draft"),
      );
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should handle or with all false", () => {
      const expr = or(
        eq(getPath(subject.post.status), "draft"),
        eq(getPath(subject.post.status), "archived"),
      );
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("boolean literals", () => {
    it("should handle true literal", () => {
      const expr = true;
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should handle false literal", () => {
      const expr = false;
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("function expressions", () => {
    it("should evaluate function returning boolean", () => {
      const expr = ({ actor }: { actor: Actor }) => actor.user.role === "admin";
      const actor = { user: { id: "1", role: "admin" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should evaluate function returning expression", () => {
      const expr = ({ actor }: { actor: Actor }) =>
        actor.user.role === "admin" ? true : eq(getPath(subject.post.published), true);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should short-circuit for admin role", () => {
      const expr = ({ actor }: { actor: Actor }) =>
        actor.user.role === "admin" ? true : eq(getPath(subject.post.published), false);
      const actor = { user: { id: "1", role: "admin" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: false,
          status: "draft" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });
  });

  describe("missing resources", () => {
    it("should return false when resource is missing", () => {
      const expr = eq(getPath(subject.post.published), true);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: undefined as unknown as Resources["post"],
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should return false when column is missing", () => {
      const expr = eq(getPath(subject.post.published), true);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: undefined as unknown as boolean,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
        comment: [],
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });
});
