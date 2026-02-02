import {
  and,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  neq,
  not,
  or,
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
};

describe("evaluate", () => {
  describe("eq", () => {
    it("should return true when values are equal", () => {
      const expr = eq<Resources, "post.published", Actor>("post.published", true);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when values are not equal", () => {
      const expr = eq<Resources, "post.published", Actor>("post.published", true);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should compare two resources paths", () => {
      const expr = eq<Resources, "post.ownerId", Actor>("post.ownerId", "post.id");
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should handle nested path comparison returning false", () => {
      const expr = eq<Resources, "post.ownerId", Actor>("post.ownerId", "post.id");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "2",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("neq", () => {
    it("should return true when values are not equal", () => {
      const expr = neq<Resources, "post.status", Actor>("post.status", "deleted");
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when values are equal", () => {
      const expr = neq<Resources, "post.status", Actor>("post.status", "deleted");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: false,
          status: "deleted" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: "2024-01-02",
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should compare two resources paths with neq", () => {
      const expr = neq<Resources, "post.ownerId", Actor>("post.ownerId", "post.id");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "2",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });
  });

  describe("gt", () => {
    it("should return true when left is greater than right", () => {
      const expr = gt<Resources, "post.score", Actor>("post.score", 0);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-06-01",
          score: 10,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when left is not greater than right", () => {
      const expr = gt<Resources, "post.score", Actor>("post.score", 0);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should handle string date comparisons", () => {
      const expr = gt<Resources, "post.createdAt", Actor>("post.createdAt", "2024-01-01");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-06-15",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should handle path-to-path comparisons", () => {
      const expr = gt<Resources, "post.score", Actor>("post.score", "post.id"); // "10" > "1" as strings
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "5",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 10,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when either value is null", () => {
      const expr = gt<Resources, "post.score", Actor>("post.score", "post.deletedAt" as never);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("lt", () => {
    it("should return true when left is less than right (resources)", () => {
      const expr = lt<Resources, "post.score", Actor>("post.score", 100);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when left is not less than right", () => {
      const expr = lt<Resources, "post.score", Actor>("post.score", 50);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should handle string date comparisons", () => {
      const expr = lt<Resources, "post.createdAt", Actor>("post.createdAt", "2024-12-31");
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-06-15",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });
  });

  describe("gte", () => {
    it("should return true when left is greater than right", () => {
      const expr = gte<Resources, "post.score", Actor>("post.score", 5);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return true when left equals right", () => {
      const expr = gte<Resources, "post.score", Actor>("post.score", 10);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when left is less than right", () => {
      const expr = gte<Resources, "post.score", Actor>("post.score", 15);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("lte", () => {
    it("should return true when left is less than right", () => {
      const expr = lte<Resources, "post.score", Actor>("post.score", 100);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return true when left equals right", () => {
      const expr = lte<Resources, "post.score", Actor>("post.score", 50);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when left is greater than right", () => {
      const expr = lte<Resources, "post.score", Actor>("post.score", 20);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("inArray", () => {
    it("should return true when value is in array", () => {
      const expr = inArray<Resources, "post.status", Actor>("post.status", ["published", "draft"]);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when value is not in array", () => {
      const expr = inArray<Resources, "post.status", Actor>("post.status", ["published", "draft"]);
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "1",
          published: false,
          status: "deleted" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should handle empty array", () => {
      const expr = inArray<Resources, "post.status", Actor>("post.status", []);
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("isNull", () => {
    it("should return true when value is null", () => {
      const expr = isNull<Resources, "post.deletedAt", Actor>("post.deletedAt");
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when value is not null", () => {
      const expr = isNull<Resources, "post.publishedAt", Actor>("post.publishedAt");
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("isNotNull", () => {
    it("should return true when value is not null", () => {
      const expr = isNotNull<Resources, "post.publishedAt", Actor>("post.publishedAt");
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when value is null", () => {
      const expr = isNotNull<Resources, "post.deletedAt", Actor>("post.deletedAt");
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("not", () => {
    it("should negate eq expression", () => {
      const expr = not(eq<Resources, "post.published", Actor>("post.published", true));
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should negate false eq expression to true", () => {
      const expr = not(eq<Resources, "post.published", Actor>("post.published", true));
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should negate and expression", () => {
      const expr = not(
        and(
          eq<Resources, "post.published", Actor>("post.published", true),
          eq<Resources, "post.status", Actor>("post.status", "published"),
        ),
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should negate or expression", () => {
      const expr = not(
        or(
          eq<Resources, "post.published", Actor>("post.published", false),
          eq<Resources, "post.status", Actor>("post.status", "deleted"),
        ),
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should negate isNull expression", () => {
      const expr = not(isNull<Resources, "post.publishedAt", Actor>("post.publishedAt"));
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should work with nested not", () => {
      const expr = not(not(eq<Resources, "post.published", Actor>("post.published", true)));
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });
  });

  describe("and", () => {
    it("should return true when all rules are true", () => {
      const expr = and<Resources, Actor>(eq("post.published", true), eq("post.ownerId", "1"));
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when any rule is false", () => {
      const expr = and<Resources, Actor>(eq("post.published", true), eq("post.ownerId", "1"));
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "2",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should return true for empty and", () => {
      const expr = and<Resources, Actor>();
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });
  });

  describe("or", () => {
    it("should return true when any rule is true", () => {
      const expr = or<Resources, Actor>(eq("post.published", false), eq("post.ownerId", "1"));
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when all rules are false", () => {
      const expr = or<Resources, Actor>(eq("post.published", false), eq("post.ownerId", "2"));
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should return false for empty or", () => {
      const expr = or<Resources, Actor>();
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
      };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("boolean literals", () => {
    it("should evaluate true literal", () => {
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
      };
      expect(evaluate(true, { actor, resources })).toBe(true);
    });

    it("should evaluate false literal", () => {
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
      };
      expect(evaluate(false, { actor, resources })).toBe(false);
    });
  });

  describe("function expressions", () => {
    it("should evaluate function returning boolean", () => {
      const fn = ({ actor }: { actor: Actor }) => actor.user.role === "admin";
      const adminActor = { user: { id: "1", role: "admin" as const, age: 25 } };
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
      };
      expect(evaluate(fn, { actor: adminActor, resources })).toBe(true);

      const userActor = { user: { id: "1", role: "user" as const, age: 25 } };
      expect(evaluate(fn, { actor: userActor, resources })).toBe(false);
    });

    it("should evaluate function returning expression", () => {
      const fn = ({ actor }: { actor: Actor }) => {
        if (actor.user.role === "admin") return true;
        return eq<Resources, "post.ownerId", Actor>("post.ownerId", actor.user.id);
      };

      const adminActor = { user: { id: "1", role: "admin" as const, age: 25 } };
      const resources = {
        post: {
          id: "1",
          ownerId: "2",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(fn, { actor: adminActor, resources })).toBe(true);

      const ownerActor = { user: { id: "1", role: "user" as const, age: 25 } };
      const ownerResources = {
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
      };
      expect(evaluate(fn, { actor: ownerActor, resources: ownerResources })).toBe(true);

      const otherActor = { user: { id: "1", role: "user" as const, age: 25 } };
      const otherResources = {
        post: {
          id: "1",
          ownerId: "2",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(fn, { actor: otherActor, resources: otherResources })).toBe(false);
    });

    it("should evaluate nested functions", () => {
      // Functions ONLY receive { actor }, never { resources }
      const innerFn = ({ actor }: { actor: Actor }) => actor.user.role === "admin";

      const outerFn = ({ actor }: { actor: Actor }) => {
        if (innerFn({ actor })) return true;
        return and<Resources, Actor>(eq("post.ownerId", actor.user.id), eq("post.published", true));
      };

      const adminActor = { user: { id: "1", role: "admin" as const, age: 25 } };
      const adminResources = {
        post: {
          id: "1",
          ownerId: "2",
          published: false,
          status: "draft" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(outerFn, { actor: adminActor, resources: adminResources })).toBe(true);

      const ownerPublishedActor = { user: { id: "1", role: "user" as const, age: 25 } };
      const ownerPublishedResources = {
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
      };
      expect(
        evaluate(outerFn, { actor: ownerPublishedActor, resources: ownerPublishedResources }),
      ).toBe(true);

      const ownerUnpublishedActor = { user: { id: "1", role: "user" as const, age: 25 } };
      const ownerUnpublishedResources = {
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
      };
      expect(
        evaluate(outerFn, { actor: ownerUnpublishedActor, resources: ownerUnpublishedResources }),
      ).toBe(false);

      const otherActor = { user: { id: "1", role: "user" as const, age: 25 } };
      const otherResources = {
        post: {
          id: "1",
          ownerId: "2",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(outerFn, { actor: otherActor, resources: otherResources })).toBe(false);
    });
  });

  describe("complex policies", () => {
    it("should evaluate complex nested policy with declarative expressions", () => {
      const expr = or<Resources, Actor>(
        eq("post.published", true),
        and(eq("post.ownerId", "1"), eq("post.published", true)),
      );

      const actor = { user: { id: "2", role: "user" as const, age: 25 } };
      const publishedResources = {
        post: {
          id: "1",
          ownerId: "2",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources: publishedResources })).toBe(true);

      const ownerActor = { user: { id: "1", role: "user" as const, age: 25 } };
      const ownerPublishedResources = {
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
      };
      expect(evaluate(expr, { actor: ownerActor, resources: ownerPublishedResources })).toBe(true);

      const unpublishedResources = {
        post: {
          id: "1",
          ownerId: "2",
          published: false,
          status: "draft" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources: unpublishedResources })).toBe(false);
    });

    it("should evaluate policy with mixed declarative and function expressions", () => {
      const fn = ({ actor }: { actor: Actor }) => {
        if (actor.user.role === "admin") return true;
        return and<Resources, Actor>(eq("post.ownerId", actor.user.id), eq("post.published", true));
      };

      const adminActor = { user: { id: "1", role: "admin" as const, age: 25 } };
      const adminResources = {
        post: {
          id: "1",
          ownerId: "2",
          published: false,
          status: "draft" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(fn, { actor: adminActor, resources: adminResources })).toBe(true);

      const ownerActor = { user: { id: "1", role: "user" as const, age: 25 } };
      const ownerResources = {
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
      };
      expect(evaluate(fn, { actor: ownerActor, resources: ownerResources })).toBe(true);

      const otherActor = { user: { id: "1", role: "user" as const, age: 25 } };
      const otherResources = {
        post: {
          id: "1",
          ownerId: "2",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(fn, { actor: otherActor, resources: otherResources })).toBe(false);
    });

    it("should evaluate complex policy with v0.3 operators", () => {
      // Real-world example: Show posts that are:
      // - Not deleted (neq status)
      // - And either: published, OR (owned by user AND not archived)
      const expr = and<Resources, Actor>(
        neq("post.status", "deleted"),
        or(
          eq("post.published", true),
          and(eq("post.ownerId", "user.id"), neq("post.status", "archived")),
        ),
      );

      // Case 1: Published post - should pass
      const actor = { user: { id: "1", role: "user" as const, age: 25 } };
      const publishedPost = {
        post: {
          id: "1",
          ownerId: "2",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources: publishedPost })).toBe(true);

      // Case 2: Owned by user, not archived, not published - should pass
      const ownedPost = {
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
      };
      expect(evaluate(expr, { actor, resources: ownedPost })).toBe(true);

      // Case 3: Deleted post - should fail
      const deletedPost = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "deleted" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: "2024-01-02",
          publishedAt: "2024-01-01",
        },
      };
      expect(evaluate(expr, { actor, resources: deletedPost })).toBe(false);

      // Case 4: Archived post owned by user - should fail
      const archivedPost = {
        post: {
          id: "1",
          ownerId: "1",
          published: false,
          status: "archived" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources: archivedPost })).toBe(false);
    });

    it("should evaluate policy with not and isNull operators", () => {
      // Show active posts: not deleted AND publishedAt is not null
      const expr = and<Resources, Actor>(
        isNotNull("post.publishedAt"),
        not(eq("post.status", "deleted")),
      );

      const actor = { user: { id: "1", role: "user" as const, age: 25 } };

      // Active published post
      const activePost = {
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
      };
      expect(evaluate(expr, { actor, resources: activePost })).toBe(true);

      // Draft post (no publishedAt)
      const draftPost = {
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
      };
      expect(evaluate(expr, { actor, resources: draftPost })).toBe(false);

      // Deleted post
      const deletedPost = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "deleted" as const,
          createdAt: "2024-01-01",
          score: 0,
          deletedAt: "2024-01-02",
          publishedAt: "2024-01-01",
        },
      };
      expect(evaluate(expr, { actor, resources: deletedPost })).toBe(false);
    });

    it("should evaluate policy with inArray and comparison operators on resources", () => {
      // Post score check: score > 0 AND status in whitelist
      const expr = and<Resources, Actor>(
        gt("post.score", 0),
        inArray("post.status", ["published", "archived"]),
      );

      const actor = { user: { id: "1", role: "user" as const, age: 25 } };

      // Good post with positive score and published status
      const goodPost = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-01-01",
          score: 10,
          deletedAt: null,
          publishedAt: "2024-01-01",
        },
      };
      expect(evaluate(expr, { actor, resources: goodPost })).toBe(true);

      // Post with zero score - should fail
      const zeroScorePost = {
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
      };
      expect(evaluate(expr, { actor, resources: zeroScorePost })).toBe(false);

      // Draft post - should fail (status not in whitelist)
      const draftPost = {
        post: {
          id: "1",
          ownerId: "1",
          published: false,
          status: "draft" as const,
          createdAt: "2024-01-01",
          score: 10,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources: draftPost })).toBe(false);
    });

    it("should evaluate policy with date range using gte/lte", () => {
      // Posts from 2024 (inclusive)
      const expr = and<Resources, Actor>(
        gte("post.createdAt", "2024-01-01"),
        lte("post.createdAt", "2024-12-31"),
      );

      const actor = { user: { id: "1", role: "user" as const, age: 25 } };

      // Post from June 2024 - should pass
      const junePost = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2024-06-15",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources: junePost })).toBe(true);

      // Post from 2023 - should fail (too early)
      const oldPost = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2023-06-15",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources: oldPost })).toBe(false);

      // Post from 2025 - should fail (too late)
      const futurePost = {
        post: {
          id: "1",
          ownerId: "1",
          published: true,
          status: "published" as const,
          createdAt: "2025-06-15",
          score: 0,
          deletedAt: null,
          publishedAt: null,
        },
      };
      expect(evaluate(expr, { actor, resources: futurePost })).toBe(false);

      // Post exactly on Jan 1, 2024 - should pass
      const jan1Post = {
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
      };
      expect(evaluate(expr, { actor, resources: jan1Post })).toBe(true);
    });
  });
});
