import { useState } from "react";
import { Target, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input } from "@/components/ui";

export function AuthPage({
  mode,
  onNavigate,
  onBack,
}: {
  mode: "signin" | "signup";
  onNavigate: (mode: "signin" | "signup") => void;
  onBack: () => void;
}) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = isSignUp
      ? await signUp(email, password, fullName)
      : await signIn(email, password);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Target className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">LeadFlow</span>
      </button>

      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {isSignUp
            ? "Join your team's lead pipeline."
            : "Sign in to manage your leads."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isSignUp && (
            <Input
              label="Full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          )}
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <Input
            label="Password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => onNavigate(isSignUp ? "signin" : "signup")}
            className="font-medium text-slate-900 underline-offset-2 hover:underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </Card>
    </div>
  );
}
