import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Target,
  LogOut,
  Mail,
  Phone,
  Building2,
  MessageSquare,
  Send,
  Clock,
  User as UserIcon,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getLead,
  updateLead,
  addNote,
  listTeam,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/api";
import type { LeadDetail, LeadStatus, Profile, LeadActivity } from "@/lib/types";
import { Button, Card, Select, Textarea, Badge, Footer, Spinner } from "@/components/ui";
import { LEAD_STATUSES } from "@/lib/types";

const ACTIVITY_ICONS: Record<string, typeof Clock> = {
  created: Target,
  status_changed: Clock,
  assigned: UserIcon,
  note_added: MessageSquare,
  updated: Clock,
  deleted: Clock,
};

export function LeadDetailPage({
  leadId,
  onBack,
}: {
  leadId: string;
  onBack: () => void;
}) {
  const { user, signOut } = useAuth();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [team, setTeam] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [updating, setUpdating] = useState(false);
  const isAdmin = user?.role === "admin";

  const fetchLead = async () => {
    try {
      const data = await getLead(leadId);
      setLead(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
    listTeam().then(setTeam).catch(() => {});
  }, [leadId]);

  const handleStatusChange = async (status: LeadStatus) => {
    if (!lead) return;
    setUpdating(true);
    try {
      await updateLead(lead.id, { status });
      await fetchLead();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async (assignedTo: string) => {
    if (!lead) return;
    setUpdating(true);
    try {
      await updateLead(lead.id, { assigned_to: assignedTo || null });
      await fetchLead();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !noteBody.trim()) return;
    setSavingNote(true);
    try {
      await addNote(lead.id, noteBody.trim());
      setNoteBody("");
      await fetchLead();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  const assignedMember = team.find((m) => m.id === lead?.assigned_to);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <p className="text-rose-600">{error}</p>
        <Button className="mt-4" variant="secondary" onClick={onBack}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Target className="h-4 w-4" />
              </div>
              <span className="font-semibold text-slate-900">LeadFlow</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Lead header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{lead.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Lead since {new Date(lead.created_at).toLocaleDateString()} · Source: {lead.source}
              </p>
            </div>
            <Badge className={STATUS_COLORS[lead.status]}>
              {STATUS_LABELS[lead.status]}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: details + notes */}
          <div className="space-y-6 lg:col-span-2">
            {/* Contact info */}
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Contact information
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <InfoRow icon={Mail} label="Email" value={lead.email} />
                <InfoRow icon={Phone} label="Phone" value={lead.phone} />
                <InfoRow icon={Building2} label="Company" value={lead.company} />
                <InfoRow
                  icon={UserIcon}
                  label="Assigned to"
                  value={assignedMember?.full_name ?? "Unassigned"}
                />
              </dl>
              {lead.message && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-1 text-sm font-medium text-slate-500">Message</p>
                  <p className="text-sm text-slate-700">{lead.message}</p>
                </div>
              )}
            </Card>

            {/* Notes */}
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Notes
              </h2>
              <form onSubmit={handleAddNote} className="mb-4 flex gap-2">
                <Textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="flex-1"
                />
                <Button type="submit" disabled={savingNote || !noteBody.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <div className="space-y-3">
                {lead.notes.length === 0 ? (
                  <p className="text-sm text-slate-400">No notes yet.</p>
                ) : (
                  lead.notes.map((note) => {
                    const author = team.find((m) => m.id === note.user_id);
                    return (
                      <div
                        key={note.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">
                            {author?.full_name ?? "Team member"}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{note.body}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Right: controls + activity */}
          <div className="space-y-6">
            {/* Pipeline controls */}
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Pipeline
              </h2>
              <div className="space-y-4">
                <Select
                  label="Status"
                  value={lead.status}
                  disabled={updating}
                  onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Assigned to"
                  value={lead.assigned_to ?? ""}
                  disabled={updating}
                  onChange={(e) => handleAssign(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? "Unknown"} ({m.role})
                    </option>
                  ))}
                </Select>
              </div>
              {!isAdmin && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                  <Lock className="h-3 w-3" />
                  Members can update status and assignment. Admins can edit all fields.
                </p>
              )}
            </Card>

            {/* Activity trail */}
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Activity trail
              </h2>
              <ol className="relative space-y-4 border-l border-slate-200 pl-4">
                {lead.activities.length === 0 ? (
                  <p className="text-sm text-slate-400">No activity yet.</p>
                ) : (
                  lead.activities.map((activity: LeadActivity) => {
                    const Icon = ACTIVITY_ICONS[activity.type] ?? Clock;
                    const author = team.find((m) => m.id === activity.user_id);
                    return (
                      <li key={activity.id} className="relative">
                        <span className="absolute -left-[1.4rem] flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-slate-200">
                          <Icon className="h-3 w-3 text-slate-500" />
                        </span>
                        <p className="text-sm text-slate-700">
                          {activity.description}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {author?.full_name ?? "System"} ·{" "}
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </li>
                    );
                  })
                )}
              </ol>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </dt>
        <dd className="text-sm text-slate-700">{value ?? "—"}</dd>
      </div>
    </div>
  );
}
