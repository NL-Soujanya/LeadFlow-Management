import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Target,
  LogOut,
  LayoutDashboard,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  listLeads,
  createLeadAuthenticated,
  deleteLead,
  getStats,
  listTeam,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/api";
import type { Lead, LeadStatus, Profile } from "@/lib/types";
import { Button, Card, Input, Select, Badge, Footer, Spinner } from "@/components/ui";
import { LEAD_STATUSES } from "@/lib/types";

export function DashboardPage({
  onOpenLead,
}: {
  onOpenLead: (id: string) => void;
}) {
  const { user, signOut } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [stats, setStats] = useState<{ total: number; by_status: Record<string, number> } | null>(null);
  const [team, setTeam] = useState<Profile[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const isAdmin = user?.role === "admin";

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listLeads({
        page,
        per_page: 10,
        status: statusFilter || undefined,
        search: search || undefined,
        sort_by: "created_at",
        sort_order: "desc",
      });
      setLeads(res.data);
      setTotalPages(res.pagination.total_pages);
      setTotal(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    listTeam().then(setTeam).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Target className="h-4 w-4" />
            </div>
            <span className="font-semibold text-slate-900">LeadFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm text-slate-600">
                {user?.full_name ?? "User"}
              </span>
              <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                {user?.role}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} lead{total === 1 ? "" : "s"} in your pipeline
          </p>
        </div>

        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {LEAD_STATUSES.map((status) => (
              <Card key={status} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {stats.by_status[status] ?? 0}
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search leads..."
                className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <Button type="submit" variant="secondary" size="md">
              Search
            </Button>
          </form>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">All Status</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> New lead
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Leads table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Spinner className="h-6 w-6" />
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-500">No leads found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Company</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Source</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => onOpenLead(lead.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{lead.name}</div>
                        <div className="text-xs text-slate-500">{lead.email ?? "—"}</div>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                        {lead.company ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[lead.status]}>
                          {STATUS_LABELS[lead.status]}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                        {lead.source}
                      </td>
                      <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this lead?")) {
                                deleteLead(lead.id).then(fetchLeads);
                              }
                            }}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>

      {showCreate && (
        <CreateLeadModal
          team={team}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchLeads();
            getStats().then(setStats).catch(() => {});
          }}
        />
      )}

      <Footer />
    </div>
  );
}

function CreateLeadModal({
  team,
  onClose,
  onCreated,
}: {
  team: Profile[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    status: "new" as LeadStatus,
    assigned_to: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createLeadAuthenticated({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        company: form.company || null,
        message: form.message || null,
        status: form.status,
        assigned_to: form.assigned_to || null,
        source: "manual",
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">New lead</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name *"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <Input
            label="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select
            label="Assign to"
            value={form.assigned_to}
            onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
          >
            <option value="">Unassigned</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? "Unknown"} ({m.role})
              </option>
            ))}
          </Select>
          <Input
            label="Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create lead"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
