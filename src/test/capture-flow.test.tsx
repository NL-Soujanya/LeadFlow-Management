import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/config", () => ({
  API_URL: "http://localhost:4000",
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
  getToken: () => null,
}));

vi.mock("@/lib/api", () => ({
  submitPublicLead: vi.fn(),
  listLeads: vi.fn(),
  getLead: vi.fn(),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  createLeadAuthenticated: vi.fn(),
  addNote: vi.fn(),
  listTeam: vi.fn(),
  getStats: vi.fn(),
  STATUS_LABELS: {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    proposal: "Proposal",
    won: "Won",
    lost: "Lost",
  },
  STATUS_COLORS: {
    new: "bg-blue-100 text-blue-700 border-blue-200",
    contacted: "bg-cyan-100 text-cyan-700 border-cyan-200",
    qualified: "bg-amber-100 text-amber-700 border-amber-200",
    proposal: "bg-violet-100 text-violet-700 border-violet-200",
    won: "bg-emerald-100 text-emerald-700 border-emerald-200",
    lost: "bg-rose-100 text-rose-700 border-rose-200",
  },
}));

import { LandingPage } from "@/pages/LandingPage";
import { submitPublicLead } from "@/lib/api";

describe("Lead capture flow (public)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the public lead form and shows a thank-you message", async () => {
    vi.mocked(submitPublicLead).mockResolvedValueOnce({
      id: "lead-1",
      name: "Jane",
      email: "jane@test.com",
      phone: null,
      company: null,
      message: null,
      source: "website",
      status: "new",
      assigned_to: null,
      created_by: null,
      created_at: "",
      updated_at: "",
    });

    render(<LandingPage onSignIn={() => {}} />);

    const nameInput = screen.getByPlaceholderText("Jane Doe");
    const emailInput = screen.getByPlaceholderText("jane@company.com");
    const submitButton = screen.getByRole("button", { name: /submit/i });

    await userEvent.type(nameInput, "Jane");
    await userEvent.type(emailInput, "jane@test.com");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Thank you!")).toBeInTheDocument();
    });

    expect(submitPublicLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane",
        email: "jane@test.com",
        source: "website",
      })
    );
  });

  it("shows an error message when submission fails", async () => {
    vi.mocked(submitPublicLead).mockRejectedValueOnce(new Error("Server error"));

    render(<LandingPage onSignIn={() => {}} />);

    await userEvent.type(screen.getByPlaceholderText("Jane Doe"), "Jane");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });
});
