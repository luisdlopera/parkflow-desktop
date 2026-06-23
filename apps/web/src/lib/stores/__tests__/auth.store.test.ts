import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../auth.store";

const initialState = {
  user: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true,
};

beforeEach(() => {
  useAuthStore.setState(initialState);
});

describe("useAuthStore", () => {
  it("has correct initial state", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.permissions).toEqual([]);
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  describe("setUser", () => {
    it("sets user and marks authenticated when called with a user", () => {
      const user = { id: "1", name: "Alice", email: "alice@test.com", role: "admin" };
      useAuthStore.getState().setUser(user);
      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("clears user and marks unauthenticated when called with null", () => {
      // Pre-set a user
      useAuthStore.setState({
        user: { id: "1", name: "Alice", email: "alice@test.com", role: "admin" },
        isAuthenticated: true,
        isLoading: false,
      });
      useAuthStore.getState().setUser(null);
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("setPermissions", () => {
    it("sets the permissions array", () => {
      useAuthStore.getState().setPermissions(["read:users", "write:roles"]);
      expect(useAuthStore.getState().permissions).toEqual(["read:users", "write:roles"]);
    });

    it("overwrites previous permissions", () => {
      useAuthStore.setState({ permissions: ["old:perm"] });
      useAuthStore.getState().setPermissions(["new:perm"]);
      expect(useAuthStore.getState().permissions).toEqual(["new:perm"]);
    });
  });

  describe("setLoading", () => {
    it("sets loading to true", () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it("sets loading to false", () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe("logout", () => {
    it("resets everything to default and stops loading", () => {
      useAuthStore.setState({
        user: { id: "1", name: "Alice", email: "alice@test.com", role: "admin" },
        permissions: ["read:users"],
        isAuthenticated: true,
        isLoading: false,
      });
      useAuthStore.getState().logout();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.permissions).toEqual([]);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("hasPermission", () => {
    it("returns true for an exact match", () => {
      useAuthStore.setState({ permissions: ["read:users", "write:roles"] });
      expect(useAuthStore.getState().hasPermission("read:users")).toBe(true);
    });

    it("is case sensitive", () => {
      useAuthStore.setState({ permissions: ["Read:Users"] });
      expect(useAuthStore.getState().hasPermission("read:users")).toBe(false);
    });

    it("returns false for a non-existent permission", () => {
      useAuthStore.setState({ permissions: ["read:users"] });
      expect(useAuthStore.getState().hasPermission("delete:everything")).toBe(false);
    });

    it("returns false when permissions are empty", () => {
      expect(useAuthStore.getState().hasPermission("anything")).toBe(false);
    });
  });
});
