import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  API_URL: "http://localhost:4000",
}));

vi.mock("@/lib/auth", () => ({
  getToken: mocks.getItem,
}));

Object.defineProperty(window, "localStorage", {
  value: {
    getItem: mocks.getItem,
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  },
  writable: true,
});

import {
  listLeads,
  getLead,
  updateLead,
  deleteLead,
  createLeadAuthenticated,
  addNote,
  submitPublicLead,
  listTeam,
  getStats,
} from "@/lib/api";

const API_URL = "http://localhost:4000";

function mockFetchOnce(body: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

function expectFetchCalled(method: string, path: string) {
  expect(global.fetch).toHaveBeenCalledWith(
    `${API_URL}${path}`,
    expect.objectContaining({ method })
  );
}

describe("API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getItem.mockReturnValue("test-token");
  });

  it("listLeads builds query string with pagination + filters", async () => {
    mockFetchOnce({ data: [], pagination: { total: 0, total_pages: 0 } });
    await listLeads({ page: 2, per_page: 5, status: "new", search: "acme" });
    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("page=2");
    expect(url).toContain("per_page=5");
    expect(url).toContain("status=new");
    expect(url).toContain("search=acme");
    expect(opts.method).toBe("GET");
  });

  it("getLead calls GET /api/leads/:id", async () => {
    mockFetchOnce({ data: { id: "123", notes: [], activities: [] } });
    const lead = await getLead("123");
    expect(lead.id).toBe("123");
    expectFetchCalled("GET", "/api/leads/123");
  });

  it("updateLead sends PUT with updates", async () => {
    mockFetchOnce({ data: { id: "123", status: "won" } });
    const lead = await updateLead("123", { status: "won" });
    expect(lead.status).toBe("won");
    expectFetchCalled("PUT", "/api/leads/123");
  });

  it("deleteLead sends DELETE", async () => {
    mockFetchOnce({ data: { id: "123", deleted: true } });
    await deleteLead("123");
    expectFetchCalled("DELETE", "/api/leads/123");
  });

  it("createLeadAuthenticated sends POST to /api/leads/auth", async () => {
    mockFetchOnce({ data: { id: "new" } });
    await createLeadAuthenticated({ name: "Test" });
    expectFetchCalled("POST", "/api/leads/auth");
  });

  it("addNote sends POST to /api/leads/:id/notes", async () => {
    mockFetchOnce({ data: { id: "note1" } });
    await addNote("123", "hello");
    expectFetchCalled("POST", "/api/leads/123/notes");
  });

  it("submitPublicLead sends POST without auth token", async () => {
    mockFetchOnce({ data: { id: "new" } });
    await submitPublicLead({ name: "Public", source: "website" });
    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toBe(`${API_URL}/api/leads`);
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it("listTeam calls GET /api/team", async () => {
    mockFetchOnce({ data: [] });
    await listTeam();
    expectFetchCalled("GET", "/api/team");
  });

  it("getStats calls GET /api/stats", async () => {
    mockFetchOnce({ data: { total: 0, by_status: {} } });
    await getStats();
    expectFetchCalled("GET", "/api/stats");
  });

  it("throws on non-2xx response with error message", async () => {
    mockFetchOnce({ error: "Lead not found" }, 404);
    await expect(getLead("bad")).rejects.toThrow("Lead not found");
  });

  it("throws on 403 forbidden", async () => {
    mockFetchOnce({ error: "Only admins can delete leads" }, 403);
    await expect(deleteLead("123")).rejects.toThrow("Only admins can delete leads");
  });
});
