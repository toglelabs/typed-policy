import { and, eq, or } from "@typed-policy/core";
import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate.js";

// Separate Actor and Subject types for v0.2 API
type Actor = {
  user: {
    id: string;
    role: "admin" | "user";
  };
};

type Subject = {
  post: {
    id: string;
    ownerId: string;
    published: boolean;
  };
};

describe("evaluate", () => {
  describe("eq", () => {
    it("should return true when values are equal", () => {
      const expr = eq<Subject, "post.published", Actor>("post.published", true);
      const ctx = {
        actor: { user: { id: "1", role: "admin" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(expr, ctx)).toBe(true);
    });

    it("should return false when values are not equal", () => {
      const expr = eq<Subject, "post.published", Actor>("post.published", true);
      const ctx = {
        actor: { user: { id: "1", role: "admin" as const } },
        subject: { post: { id: "1", ownerId: "1", published: false } },
      };
      expect(evaluate(expr, ctx)).toBe(false);
    });

    it("should compare two subject paths", () => {
      const expr = eq<Subject, "post.ownerId", Actor>("post.ownerId", "post.id");
      const ctx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(expr, ctx)).toBe(true);
    });

    it("should handle nested path comparison returning false", () => {
      const expr = eq<Subject, "post.ownerId", Actor>("post.ownerId", "post.id");
      const ctx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "2", published: true } },
      };
      expect(evaluate(expr, ctx)).toBe(false);
    });
  });

  describe("and", () => {
    it("should return true when all rules are true", () => {
      const expr = and<Subject, Actor>(eq("post.published", true), eq("post.ownerId", "1"));
      const ctx = {
        actor: { user: { id: "1", role: "admin" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(expr, ctx)).toBe(true);
    });

    it("should return false when any rule is false", () => {
      const expr = and<Subject, Actor>(eq("post.published", true), eq("post.ownerId", "1"));
      const ctx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "2", published: true } },
      };
      expect(evaluate(expr, ctx)).toBe(false);
    });

    it("should return true for empty and", () => {
      const expr = and<Subject, Actor>();
      const ctx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(expr, ctx)).toBe(true);
    });
  });

  describe("or", () => {
    it("should return true when any rule is true", () => {
      const expr = or<Subject, Actor>(eq("post.published", false), eq("post.ownerId", "1"));
      const ctx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(expr, ctx)).toBe(true);
    });

    it("should return false when all rules are false", () => {
      const expr = or<Subject, Actor>(eq("post.published", false), eq("post.ownerId", "2"));
      const ctx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(expr, ctx)).toBe(false);
    });

    it("should return false for empty or", () => {
      const expr = or<Subject, Actor>();
      const ctx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(expr, ctx)).toBe(false);
    });
  });

  describe("boolean literals", () => {
    it("should evaluate true literal", () => {
      const ctx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(true, ctx)).toBe(true);
    });

    it("should evaluate false literal", () => {
      const ctx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(false, ctx)).toBe(false);
    });
  });

  describe("function expressions", () => {
    it("should evaluate function returning boolean", () => {
      const fn = ({ actor }: { actor: Actor }) => actor.user.role === "admin";
      const adminCtx = {
        actor: { user: { id: "1", role: "admin" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(fn, adminCtx)).toBe(true);

      const userCtx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(fn, userCtx)).toBe(false);
    });

    it("should evaluate function returning expression", () => {
      const fn = ({ actor, subject }: { actor: Actor; subject: Subject }) => {
        if (actor.user.role === "admin") return true;
        return subject.post.ownerId === actor.user.id;
      };

      const adminCtx = {
        actor: { user: { id: "1", role: "admin" as const } },
        subject: { post: { id: "1", ownerId: "2", published: true } },
      };
      expect(evaluate(fn, adminCtx)).toBe(true);

      const ownerCtx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(fn, ownerCtx)).toBe(true);

      const otherCtx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "2", published: true } },
      };
      expect(evaluate(fn, otherCtx)).toBe(false);
    });

    it("should evaluate nested functions", () => {
      const innerFn = ({ actor }: { actor: Actor }) => actor.user.role === "admin";

      const outerFn = ({ actor, subject }: { actor: Actor; subject: Subject }) => {
        if (innerFn({ actor })) return true;
        return subject.post.ownerId === actor.user.id && subject.post.published;
      };

      const adminCtx = {
        actor: { user: { id: "1", role: "admin" as const } },
        subject: { post: { id: "1", ownerId: "2", published: false } },
      };
      expect(evaluate(outerFn, adminCtx)).toBe(true);

      const ownerPublishedCtx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(outerFn, ownerPublishedCtx)).toBe(true);

      const ownerUnpublishedCtx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: false } },
      };
      expect(evaluate(outerFn, ownerUnpublishedCtx)).toBe(false);

      const otherCtx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "2", published: true } },
      };
      expect(evaluate(outerFn, otherCtx)).toBe(false);
    });
  });

  describe("complex policies", () => {
    it("should evaluate complex nested policy with declarative expressions", () => {
      const expr = or<Subject, Actor>(
        eq("post.published", true),
        and(eq("post.ownerId", "1"), eq("post.published", true)),
      );

      const publishedCtx = {
        actor: { user: { id: "2", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "2", published: true } },
      };
      expect(evaluate(expr, publishedCtx)).toBe(true);

      const ownerPublishedCtx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(expr, ownerPublishedCtx)).toBe(true);

      const unpublishedCtx = {
        actor: { user: { id: "2", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "2", published: false } },
      };
      expect(evaluate(expr, unpublishedCtx)).toBe(false);
    });

    it("should evaluate policy with mixed declarative and function expressions", () => {
      const fn = ({ actor, subject }: { actor: Actor; subject: Subject }) => {
        return (
          actor.user.role === "admin" ||
          (subject.post.ownerId === actor.user.id && subject.post.published)
        );
      };

      const adminCtx = {
        actor: { user: { id: "1", role: "admin" as const } },
        subject: { post: { id: "1", ownerId: "2", published: false } },
      };
      expect(evaluate(fn, adminCtx)).toBe(true);

      const ownerCtx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "1", published: true } },
      };
      expect(evaluate(fn, ownerCtx)).toBe(true);

      const otherCtx = {
        actor: { user: { id: "1", role: "user" as const } },
        subject: { post: { id: "1", ownerId: "2", published: true } },
      };
      expect(evaluate(fn, otherCtx)).toBe(false);
    });
  });
});
