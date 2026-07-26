import { API_URL } from "./config";
import { getToken } from "./auth";
import type {
  Lead,
  LeadDetail,
  LeadNote,
  LeadActivity,
  PaginatedResponse,
  Profile,
  LeadStatus,
} from "./types";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export interface ListLeadsParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  assigned_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export async function listLeads(
  params: ListLeadsParams = {}
): Promise<PaginatedResponse<Lead>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  if (params.assigned_to) qs.set("assigned_to", params.assigned_to);
  if (params.sort_by) qs.set("sort_by", params.sort_by);
  if (params.sort_order) qs.set("sort_order", params.sort_order);

  const res = await fetch(`${API_URL}/api/leads?${qs.toString()}`, {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<PaginatedResponse<Lead>>(res);
}

export async function getLead(id: string): Promise<LeadDetail> {
  const res = await fetch(`${API_URL}/api/leads/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const body = await handleResponse<{ data: LeadDetail }>(res);
  return body.data;
}

export async function updateLead(
  id: string,
  updates: Partial<Pick<Lead, "name" | "email" | "phone" | "company" | "message" | "source" | "status" | "assigned_to">>
): Promise<Lead> {
  const res = await fetch(`${API_URL}/api/leads/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const body = await handleResponse<{ data: Lead }>(res);
  return body.data;
}

export async function deleteLead(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/leads/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse(res);
}

export async function createLeadAuthenticated(
  data: Partial<Lead>
): Promise<Lead> {
  const res = await fetch(`${API_URL}/api/leads/auth`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const body = await handleResponse<{ data: Lead }>(res);
  return body.data;
}

export async function addNote(leadId: string, body: string): Promise<LeadNote> {
  const res = await fetch(`${API_URL}/api/leads/${leadId}/notes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ body }),
  });
  const json = await handleResponse<{ data: LeadNote }>(res);
  return json.data;
}

export async function listActivities(leadId: string): Promise<LeadActivity[]> {
  const res = await fetch(`${API_URL}/api/leads/${leadId}/activities`, {
    method: "GET",
    headers: authHeaders(),
  });
  const body = await handleResponse<{ data: LeadActivity[] }>(res);
  return body.data;
}

export async function listTeam(): Promise<Profile[]> {
  const res = await fetch(`${API_URL}/api/team`, {
    method: "GET",
    headers: authHeaders(),
  });
  const body = await handleResponse<{ data: Profile[] }>(res);
  return body.data;
}

export async function getStats(): Promise<{
  total: number;
  by_status: Record<string, number>;
}> {
  const res = await fetch(`${API_URL}/api/stats`, {
    method: "GET",
    headers: authHeaders(),
  });
  const body = await handleResponse<{
    data: { total: number; by_status: Record<string, number> };
  }>(res);
  return body.data;
}

export async function submitPublicLead(data: {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  source?: string;
}): Promise<Lead> {
  const res = await fetch(`${API_URL}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await handleResponse<{ data: Lead }>(res);
  return body.data;
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-cyan-100 text-cyan-700 border-cyan-200",
  qualified: "bg-amber-100 text-amber-700 border-amber-200",
  proposal: "bg-violet-100 text-violet-700 border-violet-200",
  won: "bg-emerald-100 text-emerald-700 border-emerald-200",
  lost: "bg-rose-100 text-rose-700 border-rose-200",
};
