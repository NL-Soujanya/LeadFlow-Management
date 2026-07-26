import type { Profile, LeadStatus } from "./types";

const ADMIN_ONLY_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "message",
  "source",
] as const;

const SHARED_FIELDS = ["status", "assigned_to"] as const;

export type LeadFieldName =
  | (typeof ADMIN_ONLY_FIELDS)[number]
  | (typeof SHARED_FIELDS)[number];

export function canDelete(profile: Profile): boolean {
  return profile.role === "admin";
}

export function canEditField(profile: Profile, field: LeadFieldName): boolean {
  if ((SHARED_FIELDS as readonly string[]).includes(field)) return true;
  if ((ADMIN_ONLY_FIELDS as readonly string[]).includes(field))
    return profile.role === "admin";
  return false;
}

export function resolveAllowedUpdates(
  profile: Profile,
  requested: Record<string, unknown>
): { allowed: Record<string, unknown>; forbidden: string[] } {
  const allowed: Record<string, unknown> = {};
  const forbidden: string[] = [];

  for (const [field, value] of Object.entries(requested)) {
    if (canEditField(profile, field as LeadFieldName)) {
      allowed[field] = value;
    } else {
      forbidden.push(field);
    }
  }

  return { allowed, forbidden };
}

export const VALID_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
];
