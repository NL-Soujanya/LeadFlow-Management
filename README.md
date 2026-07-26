# LeadFlow — Lead Management Platform

A lead management application for small sales teams. Public capture form, authenticated admin/member app, lead lifecycle pipeline, notes, activity trail, and a documented JSON API.

**Built for Digital Heroes Training Task** — [digitalheroesco.com](https://digitalheroesco.com)

---

## Live URL

The app is deployed and live at:

```
https://xkgicabrmgroeovioynr.supabase.co
```

> The frontend is served from the Supabase-hosted environment. The JSON API runs as an edge function at `/functions/v1/leads-api`.

## Demo Credentials

| Role   | Email                  | Password      |
|--------|------------------------|---------------|
| Admin  | admin@leadflow.demo    | admin12345    |
| Member | member@leadflow.demo   | member12345   |

**What each role can do:**

- **Admin** — full access: create, read, update, and delete leads; edit all lead fields; assign leads; add notes.
- **Member** — can create and read leads, update lead status and assignment, add notes. Cannot delete leads or edit contact fields (name, email, phone, company, message, source).

Permissions are enforced on **both** the client (UI hides/disables actions) and the server (edge function rejects unauthorized requests with `403`).

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18 + TypeScript + Vite        |
| Styling    | Tailwind CSS                        |
| Icons      | lucide-react                        |
| Backend    | Supabase (PostgreSQL + Auth + Edge Functions) |
| Database   | PostgreSQL with Row Level Security  |
| API        | Deno Edge Function (RESTful JSON)   |
| Tests      | Vitest + Testing Library            |

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Public landing page │     │  Authenticated app   │     │  Supabase Auth  │
│  (lead capture form) │     │  (dashboard + detail)│     │  (email/pw JWT) │
└────────┬────────────┘     └──────────┬───────────┘     └────────┬────────┘
         │                             │                           │
         │   POST /leads (anon)        │  GET/PUT/DELETE /leads/*  │
         ▼                             ▼                           │
  ┌──────────────────────────────────────────────────────────────────┐
  │            Edge Function: leads-api (Deno)                        │
  │  - Validates JWT, loads profile, checks role                      │
  │  - Enforces admin vs member permissions server-side               │
  │  - Pagination, filtering, sorting                                  │
  │  - Returns proper HTTP status codes                                 │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │                     PostgreSQL (Supabase)                         │
  │  Tables: profiles, leads, lead_notes, lead_activities             │
  │  RLS enabled on all tables (defense-in-depth)                     │
  │  Triggers: auto-profile on signup, auto updated_at on leads       │
  └──────────────────────────────────────────────────────────────────┘
```

### Data Model

| Table             | Purpose                                              |
|-------------------|------------------------------------------------------|
| `profiles`        | One row per auth user; holds `role` (admin/member)   |
| `leads`           | Lead records with status pipeline, assignment, source|
| `lead_notes`      | Timestamped notes attached to a lead                 |
| `lead_activities` | Append-only activity trail (created, status_changed, assigned, note_added) |

**Lead status pipeline:** `new → contacted → qualified → proposal → won | lost`

---

## Local Development

```bash
npm install
npm run dev        # start dev server
npm run build      # production build
npm run typecheck  # TypeScript checking
npm test           # run test suite
```

Environment variables (pre-configured in `.env`):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon public key

---

## Running Tests

```bash
npm test
```

**Test coverage (25 tests across 4 suites):**

| Suite                    | Tests | What it covers                                    |
|--------------------------|-------|---------------------------------------------------|
| `auth.test.tsx`          | 4     | Auth context: session state, sign-in errors, sign-up, sign-out |
| `api.test.ts`            | 11    | API client: all endpoints, query building, error handling, auth headers |
| `capture-flow.test.tsx`  | 2     | Public lead capture form: success + error states  |
| `permissions.test.ts`    | 8     | Role-based permissions: admin vs member field-level rules, delete restrictions |

Tests cover **auth rules** (session management, sign-in/sign-up/sign-out) and **two core flows** (public lead capture, and permission enforcement across the lead lifecycle).

---

## API Documentation

Base URL: `{SUPABASE_URL}/functions/v1/leads-api`

All authenticated endpoints require the `Authorization: Bearer <access_token>` header (obtained via sign-in) and the `apikey` header.

### Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/leads` | POST | None (public) | Submit a lead via the public capture form |

### Leads

#### List Leads

```
GET /leads?page=1&per_page=20&status=new,contacted&search=acme&sort_by=created_at&sort_order=desc
```

| Parameter    | Type   | Default | Description |
|--------------|--------|---------|-------------|
| `page`       | int    | 1       | Page number |
| `per_page`   | int    | 20      | Items per page (max 100) |
| `status`     | string | —       | Comma-separated statuses to filter by |
| `search`     | string | —       | Search name, email, company (case-insensitive) |
| `assigned_to`| uuid   | —       | Filter by assigned user |
| `sort_by`    | string | created_at | `created_at`, `updated_at`, `name`, `status` |
| `sort_order` | string | desc    | `asc` or `desc` |

**Response 200:**
```json
{
  "data": [ { "id": "...", "name": "...", "status": "new", ... } ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

#### Get Lead

```
GET /leads/:id
```

**Response 200:** Lead object with nested `notes[]` and `activities[]`.

**Response 404:** `{ "error": "Lead not found" }`

#### Create Lead (Authenticated)

```
POST /leads
```

**Body:**
```json
{
  "name": "Jane Doe",           // required
  "email": "jane@test.com",
  "phone": "+1 555 0000",
  "company": "Acme",
  "message": "Interested in pricing",
  "status": "new",
  "assigned_to": "uuid",
  "source": "manual"
}
```

**Response 201:** Created lead object.

**Response 422:** `{ "error": "Name is required" }`

#### Create Lead (Public — no auth)

```
POST /leads
```

Same body, but `status` defaults to `new` and `source` defaults to `website`. No `created_by` is set. No `Authorization` header required.

**Response 201:** Created lead object.

#### Update Lead

```
PUT /leads/:id
```

**Body:** Any subset of lead fields.

**Permission rules (enforced server-side):**
- Both admin and member can update `status` and `assigned_to`.
- Only admin can update `name`, `email`, `phone`, `company`, `message`, `source`.
- Members attempting admin-only field changes receive **403**.

**Response 200:** Updated lead object.

**Response 403:** `{ "error": "Members can only update status and assignment" }`

#### Delete Lead

```
DELETE /leads/:id
```

**Permission:** Admin only. Members receive **403**.

**Response 200:** `{ "data": { "id": "...", "deleted": true } }`

### Notes

#### Add Note

```
POST /leads/:id/notes
```

**Body:** `{ "body": "Note text" }`

**Response 201:** Created note object. Also logs a `note_added` activity.

### Activities

#### List Activities

```
GET /leads/:id/activities
```

**Response 200:** `{ "data": [ { "type": "status_changed", "description": "...", ... } ] }`

### Team

#### List Team Members

```
GET /team
```

**Response 200:** `{ "data": [ { "id": "...", "full_name": "...", "role": "admin" } ] }`

### Stats

#### Dashboard Stats

```
GET /stats
```

**Response 200:**
```json
{
  "data": {
    "total": 42,
    "by_status": { "new": 10, "contacted": 5, "won": 3, ... }
  }
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 400  | Bad request (invalid JSON) |
| 401  | Unauthorized (missing/invalid token) |
| 403  | Forbidden (insufficient role) |
| 404  | Not found |
| 422  | Unprocessable entity (validation error) |
| 500  | Internal server error |

---

## Project Structure

```
src/
├── components/
│   └── ui.tsx              # Shared UI components (Button, Card, Input, etc.)
├── lib/
│   ├── api.ts             # API client (fetch wrapper for edge function)
│   ├── auth.tsx           # Auth context + provider
│   ├── permissions.ts     # Pure permission logic (unit-tested)
│   ├── supabase.ts        # Supabase client singleton
│   └── types.ts           # Shared TypeScript types
├── pages/
│   ├── AuthPage.tsx       # Sign in / sign up
│   ├── DashboardPage.tsx  # Lead list with filters, pagination, stats
│   ├── LandingPage.tsx    # Public page with lead capture form
│   └── LeadDetailPage.tsx # Lead detail: lifecycle, notes, activity trail
├── test/
│   ├── api.test.ts        # API client tests
│   ├── auth.test.tsx      # Auth context tests
│   ├── capture-flow.test.tsx # Public capture form tests
│   ├── permissions.test.ts   # Permission rules tests
│   └── setup.ts           # Test setup
└── App.tsx                # Router + auth gate

supabase/
└── functions/
    └── leads-api/
        └── index.ts       # Edge function (RESTful JSON API)
```

---

## Security

- **Row Level Security** enabled on all tables — defense-in-depth behind the edge function.
- **Server-side permission checks** in the edge function: the JWT is validated, the user's profile/role is loaded, and admin-vs-member rules are enforced before any mutation.
- **Client-side permission checks** in the UI: admin-only actions (delete, edit contact fields) are hidden from members.
- **No secrets in client code** — only the anon key is used client-side; the service role key is used exclusively in the edge function.
- **Public lead capture** is limited to INSERT only (anon can create leads but cannot read, update, or delete them).

---

## Footer Credit

As required by the task, every page includes a visible footer credit:

> **Built for Digital Heroes Training Task** — linked to [digitalheroesco.com](https://digitalheroesco.com)
