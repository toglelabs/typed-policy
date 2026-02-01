import { type PolicyContext, and, eq, or } from "@typed-policy/core";
import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate.js";

describe("evaluate", () => {
  describe("eq", () => {
    it("should return true when values are equal", () => {
      const expr = eq<PolicyContext, "user.role">("user.role", "admin");
      const ctx = {
        user: { id: "1", role: "admin" as const },
        post: { id: "1", ownerId: "1", published: true },
      };
      expect(evaluate(expr, ctx as Record<string, unknown>)).toBe(true);
    });

    it("should return false when values are not equal", () => {
      const expr = eq<PolicyContext, "user.role">("user.role", "admin");
      const ctx = {
        user: { id: "1", role: "user" as const },
        post: { id: "1", ownerId: "1", published: true },
      };
      expect(evaluate(expr, ctx as Record<string, unknown>)).toBe(false);
    });

    it("should compare two paths", () => {
      const expr = eq<PolicyContext, "post.ownerId">("post.ownerId", "user.id");
      const ctx = {
        user: { id: "1", role: "user" as const },
        post: { id: "1", ownerId: "1", published: true },
      };
      expect(evaluate(expr, ctx as Record<string, unknown>)).toBe(true);
    });

    it("should handle nested path comparison returning false", () => {
      const expr = eq<PolicyContext, "post.ownerId">("post.ownerId", "user.id");
      const ctx = {
        user: { id: "1", role: "user" as const },
        post: { id: "1", ownerId: "2", published: true },
      };
      expect(evaluate(expr, ctx as Record<string, unknown>)).toBe(false);
    });
  });

  describe("and", () => {
    it("should return true when all rules are true", () => {
      const expr = and<PolicyContext>(eq("user.role", "admin"), eq("post.published", true));
      const ctx = {
        user: { id: "1", role: "admin" as const },
        post: { id: "1", ownerId: "1", published: true },
      };
      expect(evaluate(expr, ctx as Record<string, unknown>)).toBe(true);
    });

    it("should return false when any rule is false", () => {
      const expr = and<PolicyContext>(eq("user.role", "admin"), eq("post.published", true));
      const ctx = {
        user: { id: "1", role: "user" as const },
        post: { id: "1", ownerId: "1", published: true },
      };
      expect(evaluate(expr, ctx as Record<string, unknown>)).toBe(false);
    });

    it("should return true for empty and", () => {
      const expr = and<PolicyContext>();
      const ctx = {
        user: { id: "1", role: "user" as const },
        post: { id: "1", ownerId: "1", published: true },
      };
      expect(evaluate(expr, ctx as Record<string, unknown>)).toBe(true);
    });
  });

  describe("or", () => {
    it("should return true when any rule is true", () => {
      const expr = or<PolicyContext>(eq("user.role", "admin"), eq("post.ownerId", "user.id"));
      const ctx = {
        user: { id: "1", role: "user" as const },
        post: { id: "1", ownerId: "1", published: true },
      };
      expect(evaluate(expr, ctx as Record<string, unknown>)).toBe(true);
    });

    it("should return false when all rules are false", () => {
      const expr = or<PolicyContext>(eq("user.role", "admin"), eq("post.ownerId", "user.id"));
      const ctx = {
        user: { id: "1", role: "user" as const },
        post: { id: "1", ownerId: "2", published: true },
      };
      expect(evaluate(expr, ctx as Record<string, unknown>)).toBe(false);
    });

    it("should return false for empty or", () => {
      const expr = or<PolicyContext>();
      const ctx = {
        user: { id: "1", role: "user" as const },
        post: { id: "1", ownerId: "1", published: true },
      };
      expect(evaluate(expr, ctx as Record<string, unknown>)).toBe(false);
    });
  });

  describe("complex policies", () => {
    it("should evaluate complex nested policy", () => {
      const expr = or<PolicyContext>(
        eq("user.role", "admin"),
        and(eq("post.ownerId", "user.id"), eq("post.published", true)),
      );

      const adminCtx = {
        user: { id: "1", role: "admin" as const },
        post: { id: "1", ownerId: "2", published: false },
      };
      expect(evaluate(expr, adminCtx as Record<string, unknown>)).toBe(true);

      const ownerCtx = {
        user: { id: "1", role: "user" as const },
        post: { id: "1", ownerId: "1", published: true },
      };
      expect(evaluate(expr, ownerCtx as Record<string, unknown>)).toBe(true);

      const otherCtx = {
        user: { id: "1", role: "user" as const },
        post: { id: "1", ownerId: "2", published: true },
      };
      expect(evaluate(expr, otherCtx as Record<string, unknown>)).toBe(false);
    });
  });
});
