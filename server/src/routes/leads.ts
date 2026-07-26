import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db.js";
import { authRequired, adminOnly } from "../middleware.js";

const router = Router();

const VALID_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

// ============================================================
// Public lead capture — POST /api/leads (no auth)
// ============================================================
router.post("/leads", async (req, res) => {
  const hasAuth = !!req.headers.authorization;
  return createLead(req, res, hasAuth);
});

// ============================================================
// Authenticated lead create — POST /api/leads (with auth)
// ============================================================
router.post("/leads/auth", authRequired, async (req, res) => {
  return createLead(req, res, true);
});

async function createLead(req: any, res: any, authenticated: boolean) {
  const { name, email, phone, company, message, source, status, assigned_to } = req.body;

  if (!name || !name.trim()) {
    return res.status(422).json({ error: "Name is required" });
  }

  const leadStatus = status && VALID_STATUSES.includes(status) ? status : "new";
  const leadSource = source?.trim() || (authenticated ? "manual" : "website");

  const id = uuidv4();
  const createdBy = authenticated ? req.user?.id : null;
  const assignedTo = assigned_to || null;

  await query(
    `INSERT INTO leads (id, name, email, phone, company, message, source, status, assigned_to, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name.trim(), email?.trim() || null, phone?.trim() || null, company?.trim() || null, message?.trim() || null, leadSource, leadStatus, assignedTo, createdBy]
  );

  await query(
    "INSERT INTO lead_activities (id, lead_id, user_id, type, description, metadata) VALUES (?, ?, ?, 'created', ?, ?)",
    [uuidv4(), id, createdBy, `Lead submitted via ${leadSource} capture form`, JSON.stringify({ source: leadSource })]
  );

  const rows = await query("SELECT * FROM leads WHERE id = ?", [id]);
  res.status(201).json({ data: rows[0] });
}

// ============================================================
// List leads with pagination + filtering
// ============================================================
router.get("/leads", authRequired, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, parseInt(req.query.per_page as string) || PAGE_SIZE_DEFAULT)
  );
  const offset = (page - 1) * perPage;

  let where = "1=1";
  const params: unknown[] = [];

  if (req.query.status) {
    const statuses = (req.query.status as string)
      .split(",")
      .filter((s) => VALID_STATUSES.includes(s));
    if (statuses.length) {
      where += ` AND status IN (${statuses.map(() => "?").join(",")})`;
      params.push(...statuses);
    }
  }

  if (req.query.search) {
    where += " AND (name LIKE ? OR email LIKE ? OR company LIKE ?)";
    const term = `%${req.query.search}%`;
    params.push(term, term, term);
  }

  if (req.query.assigned_to) {
    where += " AND assigned_to = ?";
    params.push(req.query.assigned_to);
  }

  const sortBy = ["created_at", "updated_at", "name", "status"].includes(
    req.query.sort_by as string
  )
    ? (req.query.sort_by as string)
    : "created_at";
  const sortOrder = req.query.sort_order === "asc" ? "ASC" : "DESC";

  const countRows = await query<{ total: number }[]>(`SELECT COUNT(*) as total FROM leads WHERE ${where}`, params);
  const total = countRows[0].total;

  const data = await query(
    `SELECT * FROM leads WHERE ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );

  const totalPages = Math.ceil(total / perPage);
  res.json({
    data,
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  });
});

// ============================================================
// Get single lead with notes + activities
// ============================================================
router.get("/leads/:id", authRequired, async (req, res) => {
  const leadRows = await query("SELECT * FROM leads WHERE id = ?", [req.params.id]);
  if (leadRows.length === 0) {
    return res.status(404).json({ error: "Lead not found" });
  }

  const notes = await query(
    "SELECT id, body, user_id, created_at FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC",
    [req.params.id]
  );

  const activities = await query(
    "SELECT id, type, description, metadata, user_id, created_at FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC",
    [req.params.id]
  );

  res.json({
    data: { ...leadRows[0], notes, activities },
  });
});

// ============================================================
// Update lead (admin: all fields; member: status + assignment only)
// ============================================================
router.put("/leads/:id", authRequired, async (req, res) => {
  const existingRows = await query("SELECT * FROM leads WHERE id = ?", [req.params.id]);
  if (existingRows.length === 0) {
    return res.status(404).json({ error: "Lead not found" });
  }
  const existing = existingRows[0] as Record<string, unknown>;

  const updates: string[] = [];
  const values: unknown[] = [];
  const isAdmin = req.user?.role === "admin";

  const { status, assigned_to, name, email, phone, company, message, source } = req.body;

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(422).json({ error: "Invalid status" });
    }
    updates.push("status = ?");
    values.push(status);
  }

  if (assigned_to !== undefined) {
    updates.push("assigned_to = ?");
    values.push(assigned_to || null);
  }

  if (isAdmin) {
    if (name !== undefined) { updates.push("name = ?"); values.push(name?.trim()); }
    if (email !== undefined) { updates.push("email = ?"); values.push(email?.trim() || null); }
    if (phone !== undefined) { updates.push("phone = ?"); values.push(phone?.trim() || null); }
    if (company !== undefined) { updates.push("company = ?"); values.push(company?.trim() || null); }
    if (message !== undefined) { updates.push("message = ?"); values.push(message?.trim() || null); }
    if (source !== undefined) { updates.push("source = ?"); values.push(source?.trim()); }
  } else {
    const adminOnlyFields = ["name", "email", "phone", "company", "message", "source"];
    for (const f of adminOnlyFields) {
      if (req.body[f] !== undefined && req.body[f] !== existing[f]) {
        return res.status(403).json({ error: "Members can only update status and assignment" });
      }
    }
  }

  if (updates.length === 0) {
    return res.json({ data: existing });
  }

  values.push(req.params.id);
  await query(`UPDATE leads SET ${updates.join(", ")} WHERE id = ?`, values);

  // Log activities
  if (status && status !== existing.status) {
    await query(
      "INSERT INTO lead_activities (id, lead_id, user_id, type, description, metadata) VALUES (?, ?, ?, 'status_changed', ?, ?)",
      [uuidv4(), req.params.id, req.user!.id, `Status changed from ${existing.status} to ${status}`, JSON.stringify({ from: existing.status, to: status })]
    );
  }
  if (assigned_to !== undefined && assigned_to !== existing.assigned_to) {
    await query(
      "INSERT INTO lead_activities (id, lead_id, user_id, type, description, metadata) VALUES (?, ?, ?, 'assigned', ?, ?)",
      [uuidv4(), req.params.id, req.user!.id, "Lead reassigned", JSON.stringify({ from: existing.assigned_to, to: assigned_to })]
    );
  }

  const updatedRows = await query("SELECT * FROM leads WHERE id = ?", [req.params.id]);
  res.json({ data: updatedRows[0] });
});

// ============================================================
// Delete lead — admin only
// ============================================================
router.delete("/leads/:id", authRequired, adminOnly, async (req, res) => {
  await query("DELETE FROM leads WHERE id = ?", [req.params.id]);
  res.json({ data: { id: req.params.id, deleted: true } });
});

// ============================================================
// Add note
// ============================================================
router.post("/leads/:id/notes", authRequired, async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) {
    return res.status(422).json({ error: "Note body is required" });
  }

  const leadRows = await query("SELECT id FROM leads WHERE id = ?", [req.params.id]);
  if (leadRows.length === 0) {
    return res.status(404).json({ error: "Lead not found" });
  }

  const id = uuidv4();
  await query(
    "INSERT INTO lead_notes (id, lead_id, user_id, body) VALUES (?, ?, ?, ?)",
    [id, req.params.id, req.user!.id, body.trim()]
  );

  await query(
    "INSERT INTO lead_activities (id, lead_id, user_id, type, description, metadata) VALUES (?, ?, ?, 'note_added', 'Note added', ?)",
    [uuidv4(), req.params.id, req.user!.id, JSON.stringify({ note_id: id })]
  );

  const noteRows = await query("SELECT id, body, user_id, created_at FROM lead_notes WHERE id = ?", [id]);
  res.status(201).json({ data: noteRows[0] });
});

// ============================================================
// List activities for a lead
// ============================================================
router.get("/leads/:id/activities", authRequired, async (req, res) => {
  const rows = await query(
    "SELECT id, type, description, metadata, user_id, created_at FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC",
    [req.params.id]
  );
  res.json({ data: rows });
});

// ============================================================
// Team directory
// ============================================================
router.get("/team", authRequired, async (req, res) => {
  const rows = await query("SELECT id, full_name, role, created_at FROM users ORDER BY created_at ASC");
  res.json({ data: rows });
});

// ============================================================
// Dashboard stats
// ============================================================
router.get("/stats", authRequired, async (req, res) => {
  const rows = await query<{ status: string; count: number }[]>(
    "SELECT status, COUNT(*) as count FROM leads GROUP BY status"
  );
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byStatus[r.status] = r.count;
    total += r.count;
  }
  res.json({ data: { total, by_status: byStatus } });
});

export default router;
