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
      const actor = { user: { id: "1", role: "admin" as const } };
      const subject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, actor, subject)).toBe(true);
    });

    it("should return false when values are not equal", () => {
      const expr = eq<Subject, "post.published", Actor>("post.published", true);
      const actor = { user: { id: "1", role: "admin" as const } };
      const subject = { post: { id: "1", ownerId: "1", published: false } };
      expect(evaluate(expr, actor, subject)).toBe(false);
    });

    it("should compare two subject paths", () => {
      const expr = eq<Subject, "post.ownerId", Actor>("post.ownerId", "post.id");
      const actor = { user: { id: "1", role: "user" as const } };
      const subject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, actor, subject)).toBe(true);
    });

    it("should handle nested path comparison returning false", () => {
      const expr = eq<Subject, "post.ownerId", Actor>("post.ownerId", "post.id");
      const actor = { user: { id: "1", role: "user" as const } };
      const subject = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(expr, actor, subject)).toBe(false);
    });
  });

  describe("and", () => {
    it("should return true when all rules are true", () => {
      const expr = and<Subject, Actor>(eq("post.published", true), eq("post.ownerId", "1"));
      const actor = { user: { id: "1", role: "admin" as const } };
      const subject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, actor, subject)).toBe(true);
    });

    it("should return false when any rule is false", () => {
      const expr = and<Subject, Actor>(eq("post.published", true), eq("post.ownerId", "1"));
      const actor = { user: { id: "1", role: "user" as const } };
      const subject = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(expr, actor, subject)).toBe(false);
    });

    it("should return true for empty and", () => {
      const expr = and<Subject, Actor>();
      const actor = { user: { id: "1", role: "user" as const } };
      const subject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, actor, subject)).toBe(true);
    });
  });

  describe("or", () => {
    it("should return true when any rule is true", () => {
      const expr = or<Subject, Actor>(eq("post.published", false), eq("post.ownerId", "1"));
      const actor = { user: { id: "1", role: "user" as const } };
      const subject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, actor, subject)).toBe(true);
    });

    it("should return false when all rules are false", () => {
      const expr = or<Subject, Actor>(eq("post.published", false), eq("post.ownerId", "2"));
      const actor = { user: { id: "1", role: "user" as const } };
      const subject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, actor, subject)).toBe(false);
    });

    it("should return false for empty or", () => {
      const expr = or<Subject, Actor>();
      const actor = { user: { id: "1", role: "user" as const } };
      const subject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, actor, subject)).toBe(false);
    });
  });

  describe("boolean literals", () => {
    it("should evaluate true literal", () => {
      const actor = { user: { id: "1", role: "user" as const } };
      const subject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(true, actor, subject)).toBe(true);
    });

    it("should evaluate false literal", () => {
      const actor = { user: { id: "1", role: "user" as const } };
      const subject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(false, actor, subject)).toBe(false);
    });
  });

  describe("function expressions", () => {
    it("should evaluate function returning boolean", () => {
      const fn = ({ actor }: { actor: Actor }) => actor.user.role === "admin";
      const adminActor = { user: { id: "1", role: "admin" as const } };
      const subject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(fn, adminActor, subject)).toBe(true);

      const userActor = { user: { id: "1", role: "user" as const } };
      expect(evaluate(fn, userActor, subject)).toBe(false);
    });

    it("should evaluate function returning expression", () => {
      const fn = ({ actor }: { actor: Actor }) => {
        if (actor.user.role === "admin") return true;
        return eq<Subject, "post.ownerId", Actor>("post.ownerId", actor.user.id);
      };

      const adminActor = { user: { id: "1", role: "admin" as const } };
      const subject = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(fn, adminActor, subject)).toBe(true);

      const ownerActor = { user: { id: "1", role: "user" as const } };
      const ownerSubject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(fn, ownerActor, ownerSubject)).toBe(true);

      const otherActor = { user: { id: "1", role: "user" as const } };
      const otherSubject = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(fn, otherActor, otherSubject)).toBe(false);
    });

    it("should evaluate nested functions", () => {
      const innerFn = ({ actor }: { actor: Actor }) => actor.user.role === "admin";

      const outerFn = ({ actor }: { actor: Actor }) => {
        if (innerFn({ actor })) return true;
        return and<Subject, Actor>(eq("post.ownerId", actor.user.id), eq("post.published", true));
      };

      const adminActor = { user: { id: "1", role: "admin" as const } };
      const adminSubject = { post: { id: "1", ownerId: "2", published: false } };
      expect(evaluate(outerFn, adminActor, adminSubject)).toBe(true);

      const ownerPublishedActor = { user: { id: "1", role: "user" as const } };
      const ownerPublishedSubject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(outerFn, ownerPublishedActor, ownerPublishedSubject)).toBe(true);

      const ownerUnpublishedActor = { user: { id: "1", role: "user" as const } };
      const ownerUnpublishedSubject = { post: { id: "1", ownerId: "1", published: false } };
      expect(evaluate(outerFn, ownerUnpublishedActor, ownerUnpublishedSubject)).toBe(false);

      const otherActor = { user: { id: "1", role: "user" as const } };
      const otherSubject = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(outerFn, otherActor, otherSubject)).toBe(false);
    });
  });

  describe("complex policies", () => {
    it("should evaluate complex nested policy with declarative expressions", () => {
      const expr = or<Subject, Actor>(
        eq("post.published", true),
        and(eq("post.ownerId", "1"), eq("post.published", true)),
      );

      const actor = { user: { id: "2", role: "user" as const } };
      const publishedSubject = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(expr, actor, publishedSubject)).toBe(true);

      const ownerActor = { user: { id: "1", role: "user" as const } };
      const ownerPublishedSubject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, ownerActor, ownerPublishedSubject)).toBe(true);

      const unpublishedSubject = { post: { id: "1", ownerId: "2", published: false } };
      expect(evaluate(expr, actor, unpublishedSubject)).toBe(false);
    });

    it("should evaluate policy with mixed declarative and function expressions", () => {
      const fn = ({ actor }: { actor: Actor }) => {
        if (actor.user.role === "admin") return true;
        return and<Subject, Actor>(eq("post.ownerId", actor.user.id), eq("post.published", true));
      };

      const adminActor = { user: { id: "1", role: "admin" as const } };
      const adminSubject = { post: { id: "1", ownerId: "2", published: false } };
      expect(evaluate(fn, adminActor, adminSubject)).toBe(true);

      const ownerActor = { user: { id: "1", role: "user" as const } };
      const ownerSubject = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(fn, ownerActor, ownerSubject)).toBe(true);

      const otherActor = { user: { id: "1", role: "user" as const } };
      const otherSubject = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(fn, otherActor, otherSubject)).toBe(false);
    });
  });
});
