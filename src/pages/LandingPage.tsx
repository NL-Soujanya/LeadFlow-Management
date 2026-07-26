import { useState } from "react";
import {
  CheckCircle2,
  TrendingUp,
  Users,
  Zap,
  Shield,
  ArrowRight,
  Target,
  ClipboardList,
} from "lucide-react";
import { submitPublicLead } from "@/lib/api";
import { Button, Card, Input, Textarea, Footer } from "@/components/ui";

export function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await submitPublicLead({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        company: form.company || undefined,
        message: form.message || undefined,
        source: "website",
      });
      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", company: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Target className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-slate-900">LeadFlow</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onSignIn}>
            Team Sign In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center">
              <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <Zap className="h-3.5 w-3.5" />
                Lead management for small sales teams
              </span>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Capture, track, and close{" "}
                <span className="text-slate-500">more leads</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-slate-600">
                A simple, powerful lead pipeline your whole team can use. Public
                capture form, shared pipeline, notes, and a full activity trail —
                all in one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#capture" className="inline-flex">
                  <Button size="lg">
                    Get in touch <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <Button variant="secondary" size="lg" onClick={onSignIn}>
                  Team login
                </Button>
              </div>
            </div>

            {/* Capture form */}
            <div id="capture" className="lg:pl-4">
              <Card className="p-6 sm:p-8">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      Thank you!
                    </h3>
                    <p className="mt-2 max-w-sm text-slate-600">
                      We've received your message and a member of our team will be
                      in touch shortly.
                    </p>
                    <Button
                      variant="secondary"
                      className="mt-6"
                      onClick={() => setSubmitted(false)}
                    >
                      Submit another
                    </Button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-slate-900">
                      Let's talk
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Tell us about your project and we'll get back to you.
                    </p>
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      <Input
                        label="Name *"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Jane Doe"
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label="Email"
                          type="email"
                          value={form.email}
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                          placeholder="jane@company.com"
                        />
                        <Input
                          label="Phone"
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                          placeholder="+1 555 000 0000"
                        />
                      </div>
                      <Input
                        label="Company"
                        value={form.company}
                        onChange={(e) =>
                          setForm({ ...form, company: e.target.value })
                        }
                        placeholder="Acme Inc."
                      />
                      <Textarea
                        label="Message"
                        rows={4}
                        value={form.message}
                        onChange={(e) =>
                          setForm({ ...form, message: e.target.value })
                        }
                        placeholder="What can we help you with?"
                      />
                      {error && (
                        <p className="text-sm text-rose-600">{error}</p>
                      )}
                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={loading}
                      >
                        {loading ? "Sending..." : "Submit"}
                      </Button>
                    </form>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Everything your sales team needs
            </h2>
            <p className="mt-4 text-slate-600">
              From first contact to closed deal, LeadFlow keeps your pipeline
              organized and your team aligned.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: ClipboardList,
                title: "Lead pipeline",
                desc: "Track every lead through a clear status pipeline from new to won.",
              },
              {
                icon: Users,
                title: "Team assignment",
                desc: "Assign leads to team members and see who's working on what.",
              },
              {
                icon: TrendingUp,
                title: "Activity trail",
                desc: "Every change is logged — status, assignment, notes, and more.",
              },
              {
                icon: Shield,
                title: "Role-based access",
                desc: "Admins and members get the right level of control.",
              },
              {
                icon: Zap,
                title: "Public capture",
                desc: "A simple form on your site feeds leads straight into the pipeline.",
              },
              {
                icon: Target,
                title: "Dashboard stats",
                desc: "See your pipeline at a glance with live counts by status.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <f.icon className="h-5 w-5 text-slate-700" />
                </div>
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}
