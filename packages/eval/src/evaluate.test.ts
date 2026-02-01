import { and, eq, or } from "@typed-policy/core";
import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate.js";

// Separate Actor and Resources types for v0.2 API
type Actor = {
  user: {
    id: string;
    role: "admin" | "user";
  };
};

type Resources = {
  post: {
    id: string;
    ownerId: string;
    published: boolean;
  };
};

describe("evaluate", () => {
  describe("eq", () => {
    it("should return true when values are equal", () => {
      const expr = eq<Resources, "post.published", Actor>("post.published", true);
      const actor = { user: { id: "1", role: "admin" as const } };
      const resources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when values are not equal", () => {
      const expr = eq<Resources, "post.published", Actor>("post.published", true);
      const actor = { user: { id: "1", role: "admin" as const } };
      const resources = { post: { id: "1", ownerId: "1", published: false } };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should compare two resources paths", () => {
      const expr = eq<Resources, "post.ownerId", Actor>("post.ownerId", "post.id");
      const actor = { user: { id: "1", role: "user" as const } };
      const resources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should handle nested path comparison returning false", () => {
      const expr = eq<Resources, "post.ownerId", Actor>("post.ownerId", "post.id");
      const actor = { user: { id: "1", role: "user" as const } };
      const resources = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("and", () => {
    it("should return true when all rules are true", () => {
      const expr = and<Resources, Actor>(eq("post.published", true), eq("post.ownerId", "1"));
      const actor = { user: { id: "1", role: "admin" as const } };
      const resources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when any rule is false", () => {
      const expr = and<Resources, Actor>(eq("post.published", true), eq("post.ownerId", "1"));
      const actor = { user: { id: "1", role: "user" as const } };
      const resources = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should return true for empty and", () => {
      const expr = and<Resources, Actor>();
      const actor = { user: { id: "1", role: "user" as const } };
      const resources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });
  });

  describe("or", () => {
    it("should return true when any rule is true", () => {
      const expr = or<Resources, Actor>(eq("post.published", false), eq("post.ownerId", "1"));
      const actor = { user: { id: "1", role: "user" as const } };
      const resources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, { actor, resources })).toBe(true);
    });

    it("should return false when all rules are false", () => {
      const expr = or<Resources, Actor>(eq("post.published", false), eq("post.ownerId", "2"));
      const actor = { user: { id: "1", role: "user" as const } };
      const resources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });

    it("should return false for empty or", () => {
      const expr = or<Resources, Actor>();
      const actor = { user: { id: "1", role: "user" as const } };
      const resources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, { actor, resources })).toBe(false);
    });
  });

  describe("boolean literals", () => {
    it("should evaluate true literal", () => {
      const actor = { user: { id: "1", role: "user" as const } };
      const resources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(true, { actor, resources })).toBe(true);
    });

    it("should evaluate false literal", () => {
      const actor = { user: { id: "1", role: "user" as const } };
      const resources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(false, { actor, resources })).toBe(false);
    });
  });

  describe("function expressions", () => {
    it("should evaluate function returning boolean", () => {
      const fn = ({ actor }: { actor: Actor }) => actor.user.role === "admin";
      const adminActor = { user: { id: "1", role: "admin" as const } };
      const resources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(fn, { actor: adminActor, resources })).toBe(true);

      const userActor = { user: { id: "1", role: "user" as const } };
      expect(evaluate(fn, { actor: userActor, resources })).toBe(false);
    });

    it("should evaluate function returning expression", () => {
      const fn = ({ actor }: { actor: Actor }) => {
        if (actor.user.role === "admin") return true;
        return eq<Resources, "post.ownerId", Actor>("post.ownerId", actor.user.id);
      };

      const adminActor = { user: { id: "1", role: "admin" as const } };
      const resources = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(fn, { actor: adminActor, resources })).toBe(true);

      const ownerActor = { user: { id: "1", role: "user" as const } };
      const ownerResources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(fn, { actor: ownerActor, resources: ownerResources })).toBe(true);

      const otherActor = { user: { id: "1", role: "user" as const } };
      const otherResources = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(fn, { actor: otherActor, resources: otherResources })).toBe(false);
    });

    it("should evaluate nested functions", () => {
      // Functions ONLY receive { actor }, never { resources }
      const innerFn = ({ actor }: { actor: Actor }) => actor.user.role === "admin";

      const outerFn = ({ actor }: { actor: Actor }) => {
        if (innerFn({ actor })) return true;
        return and<Resources, Actor>(eq("post.ownerId", actor.user.id), eq("post.published", true));
      };

      const adminActor = { user: { id: "1", role: "admin" as const } };
      const adminResources = { post: { id: "1", ownerId: "2", published: false } };
      expect(evaluate(outerFn, { actor: adminActor, resources: adminResources })).toBe(true);

      const ownerPublishedActor = { user: { id: "1", role: "user" as const } };
      const ownerPublishedResources = { post: { id: "1", ownerId: "1", published: true } };
      expect(
        evaluate(outerFn, { actor: ownerPublishedActor, resources: ownerPublishedResources }),
      ).toBe(true);

      const ownerUnpublishedActor = { user: { id: "1", role: "user" as const } };
      const ownerUnpublishedResources = { post: { id: "1", ownerId: "1", published: false } };
      expect(
        evaluate(outerFn, { actor: ownerUnpublishedActor, resources: ownerUnpublishedResources }),
      ).toBe(false);

      const otherActor = { user: { id: "1", role: "user" as const } };
      const otherResources = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(outerFn, { actor: otherActor, resources: otherResources })).toBe(false);
    });
  });

  describe("complex policies", () => {
    it("should evaluate complex nested policy with declarative expressions", () => {
      const expr = or<Resources, Actor>(
        eq("post.published", true),
        and(eq("post.ownerId", "1"), eq("post.published", true)),
      );

      const actor = { user: { id: "2", role: "user" as const } };
      const publishedResources = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(expr, { actor, resources: publishedResources })).toBe(true);

      const ownerActor = { user: { id: "1", role: "user" as const } };
      const ownerPublishedResources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(expr, { actor: ownerActor, resources: ownerPublishedResources })).toBe(true);

      const unpublishedResources = { post: { id: "1", ownerId: "2", published: false } };
      expect(evaluate(expr, { actor, resources: unpublishedResources })).toBe(false);
    });

    it("should evaluate policy with mixed declarative and function expressions", () => {
      const fn = ({ actor }: { actor: Actor }) => {
        if (actor.user.role === "admin") return true;
        return and<Resources, Actor>(eq("post.ownerId", actor.user.id), eq("post.published", true));
      };

      const adminActor = { user: { id: "1", role: "admin" as const } };
      const adminResources = { post: { id: "1", ownerId: "2", published: false } };
      expect(evaluate(fn, { actor: adminActor, resources: adminResources })).toBe(true);

      const ownerActor = { user: { id: "1", role: "user" as const } };
      const ownerResources = { post: { id: "1", ownerId: "1", published: true } };
      expect(evaluate(fn, { actor: ownerActor, resources: ownerResources })).toBe(true);

      const otherActor = { user: { id: "1", role: "user" as const } };
      const otherResources = { post: { id: "1", ownerId: "2", published: true } };
      expect(evaluate(fn, { actor: otherActor, resources: otherResources })).toBe(false);
    });
  });
});
