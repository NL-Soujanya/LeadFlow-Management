import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Lead lifecycle + permission tests.
 *
 * These tests verify the core business rules enforced by the edge function
 * (server-side permission logic) by exercising the permission-check functions
 * directly. We extract the permission logic into a small pure module so it can
 * be unit-tested without deploying the edge function.
 */

import {
  canDelete,
  canEditField,
  resolveAllowedUpdates,
} from "@/lib/permissions";
import type { Profile } from "@/lib/types";

const admin: Profile = { id: "a", full_name: "Admin", role: "admin", created_at: "" };
const member: Profile = { id: "m", full_name: "Member", role: "member", created_at: "" };

describe("Permission rules", () => {
  describe("canDelete", () => {
    it("allows admins to delete", () => {
      expect(canDelete(admin)).toBe(true);
    });
    it("blocks members from deleting", () => {
      expect(canDelete(member)).toBe(false);
    });
  });

  describe("canEditField", () => {
    it("allows admins to edit any field", () => {
      expect(canEditField(admin, "name")).toBe(true);
      expect(canEditField(admin, "email")).toBe(true);
      expect(canEditField(admin, "company")).toBe(true);
      expect(canEditField(admin, "status")).toBe(true);
      expect(canEditField(admin, "assigned_to")).toBe(true);
    });

    it("allows members to edit status and assigned_to only", () => {
      expect(canEditField(member, "status")).toBe(true);
      expect(canEditField(member, "assigned_to")).toBe(true);
    });

    it("blocks members from editing contact fields", () => {
      expect(canEditField(member, "name")).toBe(false);
      expect(canEditField(member, "email")).toBe(false);
      expect(canEditField(member, "phone")).toBe(false);
      expect(canEditField(member, "company")).toBe(false);
      expect(canEditField(member, "message")).toBe(false);
      expect(canEditField(member, "source")).toBe(false);
    });
  });

  describe("resolveAllowedUpdates", () => {
    it("applies all admin edits", () => {
      const result = resolveAllowedUpdates(admin, {
        name: "New Name",
        email: "new@test.com",
        status: "won",
        assigned_to: "user-1",
      });
      expect(result.allowed).toEqual({
        name: "New Name",
        email: "new@test.com",
        status: "won",
        assigned_to: "user-1",
      });
      expect(result.forbidden).toEqual([]);
    });

    it("strips forbidden fields for members and reports them", () => {
      const result = resolveAllowedUpdates(member, {
        name: "Hacked",
        status: "contacted",
        assigned_to: "user-2",
        email: "hacked@test.com",
      });
      expect(result.allowed).toEqual({
        status: "contacted",
        assigned_to: "user-2",
      });
      expect(result.forbidden).toContain("name");
      expect(result.forbidden).toContain("email");
    });

    it("returns empty allowed when member only sends forbidden fields", () => {
      const result = resolveAllowedUpdates(member, { name: "X", company: "Y" });
      expect(result.allowed).toEqual({});
      expect(result.forbidden).toEqual(["name", "company"]);
    });
  });
});
