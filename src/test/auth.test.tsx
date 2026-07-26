import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  API_URL: "http://localhost:4000",
}));

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: mocks.getItem,
    setItem: mocks.setItem,
    removeItem: mocks.removeItem,
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  },
  writable: true,
});

function wrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
}

describe("Auth context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getItem.mockReturnValue(null);
    global.fetch = vi.fn();
  });

  it("starts with no user when no token is stored", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper() as any });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("returns an error message on failed sign-in", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid email or password" }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper() as any });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    let res: { error: string | null } = { error: "init" };
    await act(async () => {
      res = await result.current.signIn("bad@example.com", "wrongpass");
    });

    expect(res.error).toBe("Invalid email or password");
  });

  it("stores token and sets user on successful sign-in", async () => {
    const mockUser = { id: "u1", email: "test@test.com", full_name: "Test", role: "admin" };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "jwt-token", user: mockUser }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper() as any });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    let res: { error: string | null } = { error: "init" };
    await act(async () => {
      res = await result.current.signIn("test@test.com", "password123");
    });

    expect(res.error).toBeNull();
    expect(result.current.user).toEqual(mockUser);
    expect(mocks.setItem).toHaveBeenCalledWith("leadflow_token", "jwt-token");
  });

  it("clears user on signOut", async () => {
    mocks.getItem.mockReturnValue("some-token");
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "u1", email: "t@t.com", full_name: "T", role: "admin" } }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper() as any });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(mocks.removeItem).toHaveBeenCalledWith("leadflow_token");
  });
});
