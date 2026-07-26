import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VALID_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status);
}

type Role = "admin" | "member";

interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
}

async function getProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data as Profile | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/leads-api/, "") || "/";
  const segments = path.split("/").filter(Boolean);

  try {
    // Public lead submission — POST /leads-api/leads (no auth required)
    if (req.method === "POST" && segments.length === 1 && segments[0] === "leads") {
      return await createLeadPublic(req);
    }

    // Everything below requires authentication
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return errorResponse("Missing or invalid Authorization header", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: userData, error: authError } = await userSupabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !userData.user) {
      return errorResponse("Invalid or expired token", 401);
    }

    const user = userData.user;
    const profile = await getProfile(supabase, user.id);
    if (!profile) {
      return errorResponse("Profile not found", 403);
    }

    // GET /leads-api/leads — list with pagination + filtering
    if (req.method === "GET" && segments.length === 1 && segments[0] === "leads") {
      return await listLeads(supabase, url);
    }

    // POST /leads-api/leads — create (authenticated)
    if (req.method === "POST" && segments.length === 1 && segments[0] === "leads") {
      return await createLeadAuthenticated(supabase, req, user.id);
    }

    // /leads-api/leads/:id
    if (segments.length === 2 && segments[0] === "leads") {
      const leadId = segments[1];

      if (req.method === "GET") {
        return await getLead(supabase, leadId);
      }
      if (req.method === "PUT") {
        return await updateLead(supabase, req, leadId, user.id, profile);
      }
      if (req.method === "DELETE") {
        return await deleteLead(supabase, leadId, profile);
      }
    }

    // /leads-api/leads/:id/notes
    if (
      segments.length === 3 &&
      segments[0] === "leads" &&
      segments[2] === "notes" &&
      req.method === "POST"
    ) {
      return await addNote(supabase, req, segments[1], user.id);
    }

    // /leads-api/leads/:id/activities
    if (
      segments.length === 3 &&
      segments[0] === "leads" &&
      segments[2] === "activities" &&
      req.method === "GET"
    ) {
      return await listActivities(supabase, segments[1]);
    }

    // /leads-api/team
    if (segments.length === 1 && segments[0] === "team" && req.method === "GET") {
      return await listTeam(supabase);
    }

    // /leads-api/stats
    if (segments.length === 1 && segments[0] === "stats" && req.method === "GET") {
      return await getStats(supabase);
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});

// ============================================================
// Public lead capture (no auth)
// ============================================================
async function createLeadPublic(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const name = (body.name as string)?.trim();
  if (!name) return errorResponse("Name is required", 422);
  const email = (body.email as string)?.trim() || null;
  const phone = (body.phone as string)?.trim() || null;
  const company = (body.company as string)?.trim() || null;
  const message = (body.message as string)?.trim() || null;
  const source = ((body.source as string)?.trim() || "website") as string;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({ name, email, phone, company, message, source, status: "new" })
    .select()
    .single();

  if (error) return errorResponse("Failed to create lead", 500);

  await supabase.from("lead_activities").insert({
    lead_id: (lead as { id: string }).id,
    type: "created",
    description: `Lead submitted via ${source} capture form`,
    metadata: { source },
  });

  return json({ data: lead }, 201);
}

// ============================================================
// Authenticated lead create
// ============================================================
async function createLeadAuthenticated(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  userId: string
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const name = (body.name as string)?.trim();
  if (!name) return errorResponse("Name is required", 422);
  const email = (body.email as string)?.trim() || null;
  const phone = (body.phone as string)?.trim() || null;
  const company = (body.company as string)?.trim() || null;
  const message = (body.message as string)?.trim() || null;
  const source = ((body.source as string)?.trim() || "manual") as string;
  const status = ((body.status as string)?.trim() || "new") as string;
  if (!VALID_STATUSES.includes(status)) return errorResponse("Invalid status", 422);
  const assignedTo = (body.assigned_to as string) || null;

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      name,
      email,
      phone,
      company,
      message,
      source,
      status,
      assigned_to: assignedTo,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return errorResponse("Failed to create lead", 500);

  await supabase.from("lead_activities").insert({
    lead_id: (lead as { id: string }).id,
    user_id: userId,
    type: "created",
    description: `Lead created by team member`,
    metadata: { source, status },
  });

  return json({ data: lead }, 201);
}

// ============================================================
// List leads with pagination + filtering
// ============================================================
async function listLeads(
  supabase: ReturnType<typeof createClient>,
  url: URL
): Promise<Response> {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const perPage = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, parseInt(url.searchParams.get("per_page") || String(PAGE_SIZE_DEFAULT), 10))
  );
  const offset = (page - 1) * perPage;

  let query = supabase
    .from("leads")
    .select("id, name, email, phone, company, message, source, status, assigned_to, created_by, created_at, updated_at", { count: "exact" });

  const status = url.searchParams.get("status");
  if (status) {
    const statuses = status.split(",").filter((s) => VALID_STATUSES.includes(s));
    if (statuses.length) query = query.in("status", statuses);
  }

  const search = url.searchParams.get("search");
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
  }

  const assignedTo = url.searchParams.get("assigned_to");
  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  const sortBy = url.searchParams.get("sort_by") || "created_at";
  const sortOrder = url.searchParams.get("sort_order") === "asc" ? "asc" : "desc";
  const validSorts = ["created_at", "updated_at", "name", "status"];
  if (validSorts.includes(sortBy)) {
    query = query.order(sortBy, { ascending: sortOrder === "asc" });
  }

  query = query.range(offset, offset + perPage - 1);

  const { data, error, count } = await query;

  if (error) return errorResponse("Failed to fetch leads", 500);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / perPage);

  return json({
    data: data || [],
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  });
}

// ============================================================
// Get single lead with notes + activities
// ============================================================
async function getLead(
  supabase: ReturnType<typeof createClient>,
  leadId: string
): Promise<Response> {
  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (error) return errorResponse("Failed to fetch lead", 500);
  if (!lead) return errorResponse("Lead not found", 404);

  const { data: notes } = await supabase
    .from("lead_notes")
    .select("id, body, user_id, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  const { data: activities } = await supabase
    .from("lead_activities")
    .select("id, type, description, metadata, user_id, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  return json({ data: { ...lead, notes: notes || [], activities: activities || [] } });
}

// ============================================================
// Update lead (admin: all fields; member: status + notes only)
// ============================================================
async function updateLead(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  leadId: string,
  userId: string,
  profile: Profile
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { data: existing, error: existError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (existError) return errorResponse("Failed to fetch lead", 500);
  if (!existing) return errorResponse("Lead not found", 404);

  const update: Record<string, unknown> = {};

  // Both roles can change status
  if (body.status !== undefined) {
    const status = (body.status as string)?.trim();
    if (!VALID_STATUSES.includes(status)) return errorResponse("Invalid status", 422);
    update.status = status;
  }

  // Both roles can re-assign
  if (body.assigned_to !== undefined) {
    update.assigned_to = body.assigned_to || null;
  }

  // Admin-only fields
  if (profile.role === "admin") {
    if (body.name !== undefined) update.name = (body.name as string)?.trim();
    if (body.email !== undefined) update.email = (body.email as string)?.trim() || null;
    if (body.phone !== undefined) update.phone = (body.phone as string)?.trim() || null;
    if (body.company !== undefined) update.company = (body.company as string)?.trim() || null;
    if (body.message !== undefined) update.message = (body.message as string)?.trim() || null;
    if (body.source !== undefined) update.source = (body.source as string)?.trim();
  } else {
    // Members attempting admin-only fields get 403
    const adminOnlyFields = ["name", "email", "phone", "company", "message", "source"];
    for (const f of adminOnlyFields) {
      if (body[f] !== undefined && body[f] !== (existing as Record<string, unknown>)[f]) {
        return errorResponse("Members can only update status and assignment", 403);
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return json({ data: existing });
  }

  const { data: updated, error } = await supabase
    .from("leads")
    .update(update)
    .eq("id", leadId)
    .select()
    .single();

  if (error) return errorResponse("Failed to update lead", 500);

  // Log activities
  const activities: Record<string, unknown>[] = [];
  if (update.status && update.status !== (existing as Record<string, unknown>).status) {
    activities.push({
      lead_id: leadId,
      user_id: userId,
      type: "status_changed",
      description: `Status changed from ${existing.status} to ${update.status}`,
      metadata: { from: existing.status, to: update.status },
    });
  }
  if (body.assigned_to !== undefined && body.assigned_to !== (existing as Record<string, unknown>).assigned_to) {
    activities.push({
      lead_id: leadId,
      user_id: userId,
      type: "assigned",
      description: `Lead reassigned`,
      metadata: { from: existing.assigned_to, to: body.assigned_to },
    });
  }
  if (activities.length) {
    await supabase.from("lead_activities").insert(activities);
  }

  return json({ data: updated });
}

// ============================================================
// Delete lead — admin only
// ============================================================
async function deleteLead(
  supabase: ReturnType<typeof createClient>,
  leadId: string,
  profile: Profile
): Promise<Response> {
  if (profile.role !== "admin") {
    return errorResponse("Only admins can delete leads", 403);
  }

  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) return errorResponse("Failed to delete lead", 500);

  return json({ data: { id: leadId, deleted: true } });
}

// ============================================================
// Add note
// ============================================================
async function addNote(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  leadId: string,
  userId: string
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const noteBody = (body.body as string)?.trim();
  if (!noteBody) return errorResponse("Note body is required", 422);

  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return errorResponse("Lead not found", 404);

  const { data: note, error } = await supabase
    .from("lead_notes")
    .insert({ lead_id: leadId, user_id: userId, body: noteBody })
    .select()
    .single();

  if (error) return errorResponse("Failed to add note", 500);

  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    user_id: userId,
    type: "note_added",
    description: "Note added",
    metadata: { note_id: (note as { id: string }).id },
  });

  return json({ data: note }, 201);
}

// ============================================================
// List activities
// ============================================================
async function listActivities(
  supabase: ReturnType<typeof createClient>,
  leadId: string
): Promise<Response> {
  const { data, error } = await supabase
    .from("lead_activities")
    .select("id, type, description, metadata, user_id, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) return errorResponse("Failed to fetch activities", 500);
  return json({ data: data || [] });
}

// ============================================================
// Team directory
// ============================================================
async function listTeam(supabase: ReturnType<typeof createClient>): Promise<Response> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: true });

  if (error) return errorResponse("Failed to fetch team", 500);
  return json({ data: data || [] });
}

// ============================================================
// Dashboard stats
// ============================================================
async function getStats(supabase: ReturnType<typeof createClient>): Promise<Response> {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("status, assigned_to");

  if (error) return errorResponse("Failed to fetch stats", 500);

  const byStatus: Record<string, number> = {};
  for (const l of leads || []) {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
  }

  return json({
    data: {
      total: leads?.length || 0,
      by_status: byStatus,
    },
  });
}
