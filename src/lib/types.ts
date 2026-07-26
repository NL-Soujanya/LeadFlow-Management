export type Role = "admin" | "member";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
];

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export type ActivityType =
  | "created"
  | "status_changed"
  | "assigned"
  | "note_added"
  | "updated"
  | "deleted";

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string | null;
  type: ActivityType;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LeadDetail extends Lead {
  notes: LeadNote[];
  activities: LeadActivity[];
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: string;
}
