# Task B — Inherit and Improve: Assessment, Migration Plan, Refactor, and Standards

> A working but poorly built codebase serving real customers. No tests, business logic in route handlers, direct database calls from the frontend, secrets in the repo. It cannot go down.

---

## A. Assessment: What I Would Fix, In What Order, and the Risk of Leaving Each Issue

### 1. Secrets committed to the repository (CRITICAL — fix first)

**What's wrong:** API keys, database credentials, and third-party secrets are hardcoded in the repo (likely in `.env`, config files, or inline in source). Anyone with repo access — including former employees and CI logs — has production credentials.

**Risk of leaving it:** Total system compromise. An attacker can read/modify customer data, impersonate the service, and pivot to connected systems. This is the single highest-risk issue.

**Fix:** Rotate every exposed secret immediately. Move secrets to a secret manager (environment variables in the hosting platform, or a vault). Add `.env` to `.gitignore`. Scrub secrets from git history with `git filter-repo` or BFG. Add a pre-commit hook that scans for secrets (e.g. `gitleaks`).

### 2. Direct database calls from the frontend (CRITICAL)

**What's wrong:** The frontend talks to the database directly — either via a shared DB connection string embedded in client code, or via an API layer that exposes raw SQL/table access. This means the database is effectively public.

**Risk of leaving it:** SQL injection, data exfiltration, and bypass of all business rules. Any client can read or modify any row. There is no permission boundary between the user and the data.

**Fix:** Introduce an API layer (edge functions / server routes) that validates input, enforces permissions, and exposes only intended operations. The frontend should never hold database credentials or construct queries. If using Supabase, enable Row Level Security on every table and scope policies by `auth.uid()`.

### 3. Business logic inside route handlers (HIGH)

**What's wrong:** Route handlers contain validation, status transitions, pricing calculations, and side-effect orchestration inline. This logic is untestable, duplicated across handlers, and tightly coupled to the HTTP transport.

**Risk of leaving it:** Bugs are hard to find and fix. Adding a feature risks breaking another. Logic drift between endpoints. No way to unit-test the rules that protect revenue and data integrity.

**Fix:** Extract business logic into service modules with pure functions where possible. Route handlers become thin: parse request → call service → format response. Services are unit-tested independently.

### 4. No automated tests (HIGH)

**What's wrong:** Zero tests. Every change is verified manually, if at all. Regressions ship to production regularly.

**Risk of leaving it:** Confidence is zero. Refactoring is dangerous. The team fears change, so the codebase rots. Bugs recur because there's nothing to catch them.

**Fix:** Start with characterization tests around the most critical flows (auth, payment, lead lifecycle). Add integration tests for the API layer. Introduce a CI gate that blocks merges on failing tests. Don't aim for 100% coverage immediately — aim for the critical paths first.

### 5. No CI/CD pipeline (MEDIUM)

**What's wrong:** Deploys are manual. There's no automated build, test, or lint step. A bad commit can go straight to production.

**Risk of leaving it:** Inconsistent deployments, human error, no audit trail. A typo in production can take the service down.

**Fix:** Add a CI pipeline (GitHub Actions) that runs lint, typecheck, tests, and build on every PR. Block merges on failure. Automate deploys from the main branch.

### 6. No error monitoring or logging (MEDIUM)

**What's wrong:** Errors are silent. The team learns about outages from customer complaints.

**Risk of leaving it:** Mean time to detection is measured in customer complaints, not minutes. Recurring issues are invisible.

**Fix:** Add error tracking (Sentry or equivalent). Add structured server-side logging. Set up alerts for error rate spikes.

### 7. No dependency management / outdated packages (LOW-MEDIUM)

**What's wrong:** Dependencies are pinned to old versions with known vulnerabilities. No `npm audit` in CI.

**Risk of leaving it:** Known security vulnerabilities. Supply chain risk.

**Fix:** Run `npm audit`, fix critical vulnerabilities. Add Dependabot or Renovate for automated update PRs. Add `npm audit` to CI.

---

## B. Phased Migration Plan (No Big-Bang Rewrite)

### Week 1 — Stop the Bleeding

**Goal:** Eliminate the highest-risk issues without changing user-facing behavior.

1. **Rotate and remove all secrets from the repo.** Move to environment variables in the hosting platform. Add `.gitignore` entry. Scrub git history.
2. **Add a secrets-scanning pre-commit hook** (`gitleaks`).
3. **Enable RLS on all database tables** as an emergency guard. Even permissive policies (`USING (true)`) are safer than the current state if the frontend is making direct calls — it at least prevents access from outside the Supabase context. Tighten policies in Month 1.
4. **Add error tracking** (Sentry) to the frontend and backend. We need visibility before we change anything.
5. **Set up CI** (GitHub Actions): lint + typecheck + build on PR. No test gate yet (there are no tests), but the pipeline exists.

**What ships:** No user-facing changes. The system is now observable, secrets are safe, and we have a CI pipeline.

### Month 1 — Introduce the API Boundary

**Goal:** Remove direct database access from the frontend. This is the structural change that makes everything else possible.

1. **Build an API layer** (edge functions / server routes) for the most critical operations: read leads, create lead, update lead, auth. The frontend calls the API; the API talks to the database.
2. **Migrate the frontend** one screen at a time to call the API instead of the database directly. Each screen migration is independently deployable. Keep the old direct-DB path working until the API path is proven, then cut over.
3. **Extract business logic** from route handlers into service modules as you build each endpoint. The service is unit-tested; the handler is thin.
4. **Write tests for the critical paths:** auth rules, lead create/update, permission checks. This gives us the safety net for the next phase.
5. **Tighten RLS policies** to ownership-scoped (`auth.uid() = user_id`) now that the frontend authenticates properly.

**What ships:** The frontend no longer touches the database directly. Business logic is testable. Critical paths have test coverage. RLS is properly scoped.

### Quarter 1 — Hardening and Standards

**Goal:** Make the codebase maintainable and the team confident.

1. **Complete the API migration** — every screen goes through the API layer. Remove all direct-DB code paths.
2. **Expand test coverage** to 70%+ of business logic. Add integration tests for the full API surface.
3. **Add a staging environment.** Deploys go to staging first, then production after smoke tests pass.
4. **Introduce dependency management** (Dependabot, `npm audit` in CI).
5. **Add structured logging and dashboards** for key metrics (request latency, error rate, lead conversion).
6. **Document the architecture** and the API. New team members can onboard from docs, not tribal knowledge.
7. **Refactor the data model** if needed — but only with migrations that never lose data. Add indexes for query patterns identified in production.

**What ships:** A codebase with tests, CI/CD, staging, monitoring, and documentation. The team can ship features without fear.

---

## C. Concrete Refactor: Before and After

### The Bad Code (Realistic Sample)

This is a route handler that creates a lead. It contains validation, business logic, database access, side effects, and error handling — all inline.

```typescript
// BEFORE — business logic inside the route handler, untestable, duplicated
app.post('/api/leads', async (req, res) => {
  const { name, email, phone, company, message, status, assignedTo } = req.body;

  // Validation inline
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (status && !['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Business logic inline: default assignment
  let assigned = assignedTo;
  if (!assigned) {
    // Find the team member with the fewest leads — "round robin" assignment
    const result = await db.query(
      `SELECT assigned_to, COUNT(*) as count
       FROM leads WHERE status NOT IN ('won', 'lost')
       GROUP BY assigned_to ORDER BY count ASC LIMIT 1`
    );
    assigned = result.rows[0]?.assigned_to || null;
  }

  // Database access inline
  const insertResult = await db.query(
    `INSERT INTO leads (name, email, phone, company, message, status, assigned_to, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
    [name, email, phone, company, message, status || 'new', assigned]
  );

  const lead = insertResult.rows[0];

  // Side effect inline: send notification email
  if (assigned) {
    const user = await db.query('SELECT email FROM users WHERE id = $1', [assigned]);
    await sendEmail(user.rows[0].email, 'New lead assigned', `Lead: ${lead.name}`);
  }

  // Side effect inline: log activity
  await db.query(
    `INSERT INTO lead_activities (lead_id, type, description) VALUES ($1, 'created', 'Lead created')`,
    [lead.id]
  );

  res.status(201).json(lead);
});
```

**Problems:**
1. **Untestable** — to test the "round robin" assignment logic, you'd have to mock the HTTP request, the database, and the email service, all through this one function.
2. **Business logic is coupled to HTTP** — the assignment rule can't be reused by a batch job or a different endpoint.
3. **Mixed concerns** — validation, data access, business rules, and side effects are all in one block.
4. **Error handling is implicit** — if `sendEmail` throws, the lead is created but the response is a 500. Partial failure with no rollback.
5. **The validation rules are duplicated** across every endpoint that touches leads.

### The Refactor

**Step 1: Extract validation into a pure module.**

```typescript
// src/leads/validation.ts
export const VALID_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;

export interface LeadInput {
  name?: string;
  email?: string;
  status?: string;
  assignedTo?: string;
}

export function validateLeadInput(input: LeadInput): string[] {
  const errors: string[] = [];
  if (!input.name || input.name.trim() === '') {
    errors.push('Name is required');
  }
  if (input.status && !VALID_STATUSES.includes(input.status as any)) {
    errors.push('Invalid status');
  }
  return errors;
}
```

**Step 2: Extract business logic into a service.**

```typescript
// src/leads/leadService.ts
import { LeadRepository } from './leadRepository';
import { NotificationService } from './notificationService';
import { ActivityLog } from './activityLog';

export class LeadService {
  constructor(
    private leads: LeadRepository,
    private notifications: NotificationService,
    private activityLog: ActivityLog,
  ) {}

  async createLead(input: LeadInput, createdBy: string): Promise<Lead> {
    const assignedTo = input.assignedTo ?? await this.leads.findLeastBusyAssignee();

    const lead = await this.leads.insert({
      ...input,
      status: input.status ?? 'new',
      assignedTo,
      createdBy,
    });

    // Side effects are explicit and failure-tolerant
    await this.activityLog.logCreated(lead.id, createdBy);
    if (assignedTo) {
      await this.notifications.notifyAssignment(assignedTo, lead).catch(() => {
        // log but don't fail the request — the lead is already created
      });
    }

    return lead;
  }
}
```

**Step 3: The route handler becomes thin.**

```typescript
// src/routes/leads.ts
app.post('/api/leads', async (req, res) => {
  const errors = validateLeadInput(req.body);
  if (errors.length) return res.status(422).json({ errors });

  try {
    const lead = await leadService.createLead(req.body, req.user.id);
    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create lead' });
  }
});
```

### What Improved

| Before | After |
|--------|-------|
| Business logic is trapped in the route handler | Logic lives in `LeadService`, reusable and testable |
| Validation is inline and duplicated | Validation is a pure function, testable in isolation |
| Database access is inline | Data access is behind a repository interface (swappable, mockable) |
| Side effects are inline with no failure handling | Side effects are explicit; notification failure doesn't break the request |
| Testing requires mocking HTTP + DB + email | Service is tested with simple in-memory fakes |
| The "round robin" assignment rule is hidden in SQL | The rule is a named method, readable and changeable |

**The key insight:** the refactor doesn't change behavior. It separates concerns so each piece can be tested, understood, and changed independently. The route handler now does only what route handlers should do: parse the request, call the service, format the response.

---

## D. Engineering Standards Proposal (and How to Get a Resistant Team to Adopt Them)

### The Standards

1. **Every code change goes through a pull request.** No direct pushes to main. PRs require at least one review.

2. **CI must pass before merge.** Lint, typecheck, tests, and build run on every PR. A red CI blocks the merge button.

3. **No secrets in code.** Secrets live in the hosting platform's environment. A pre-commit hook scans for secrets. This is non-negotiable.

4. **Business logic lives in service modules, not route handlers.** Route handlers parse requests and format responses — nothing else.

5. **Every new feature or bug fix includes a test.** The test proves the fix works and prevents regression. We don't merge without a test for the changed behavior.

6. **Database access goes through the API layer.** The frontend never touches the database directly. RLS is enabled on every table.

7. **Small, frequent deploys.** We deploy multiple times per day from the main branch. Big-bang releases are banned.

8. **We write migrations, not edits.** Schema changes are SQL migration files, applied in order, never destructive (no `DROP`, no column type changes that lose data).

### How to Get a Resistant Team to Adopt Them

**Don't mandate from above. Lead by doing.**

1. **Start with the thing that hurts.** The team is resistant because standards feel like overhead. Pick the one pain point everyone complains about — "we keep breaking production" or "I'm afraid to touch that file" — and show how a test or a CI gate fixes it. Standards adopted to solve a real pain stick; standards adopted because someone said so don't.

2. **Make the easy path the default.** If setting up CI is hard, the team won't do it. I'd set up the pipeline myself, make it green, and show the team that opening a PR "just works." Friction is the enemy of adoption. If the standard adds steps, people route around it. If it removes steps (auto-deploy on merge, auto-test on PR), people use it because it's easier than not using it.

3. **Pair on the first few changes.** Don't hand the team a document and walk away. Sit with each person, implement a feature together using the new standards, and let them experience the benefit firsthand. The test that catches a bug before it ships is the best argument for testing.

4. **Make standards visible, not bureaucratic.** A short `CONTRIBUTING.md` with 5 rules beats a 20-page process doc. A pre-commit hook that runs automatically beats a checklist that nobody reads. Automate the standard so it doesn't require willpower.

5. **Celebrate the wins publicly.** When the test suite catches a regression before it ships, mention it in the team channel. When a small deploy goes out with zero downtime, note it. The team needs to see the standards working, not just hear that they're "best practice."

6. **Accept incremental adoption.** Not every rule lands on day one. Week 1: PRs and CI. Month 1: tests on new code. Quarter 1: tests on legacy code. The goal is a team that wouldn't dream of shipping without tests — not a team that was forced to write tests once and resent it.

7. **Never use standards as a weapon.** Code review comments should be about the code, not the person. "This endpoint would be easier to test if the logic moved to a service" beats "You didn't follow the standards." People adopt standards from peers they trust, not from enforcers they fear.
