import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LandingPage } from "@/pages/LandingPage";
import { AuthPage } from "@/pages/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LeadDetailPage } from "@/pages/LeadDetailPage";
import { Spinner } from "@/components/ui";

type Route =
  | { name: "landing" }
  | { name: "auth"; mode: "signin" | "signup" }
  | { name: "dashboard" }
  | { name: "lead"; id: string };

function Router() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<Route>({ name: "landing" });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // Authenticated routes
  if (user) {
    if (route.name === "lead") {
      return (
        <LeadDetailPage leadId={route.id} onBack={() => setRoute({ name: "dashboard" })} />
      );
    }
    return <DashboardPage onOpenLead={(id) => setRoute({ name: "lead", id })} />;
  }

  // Public routes
  if (route.name === "auth") {
    return (
      <AuthPage
        mode={route.mode}
        onNavigate={(mode) => setRoute({ name: "auth", mode })}
        onBack={() => setRoute({ name: "landing" })}
      />
    );
  }

  return <LandingPage onSignIn={() => setRoute({ name: "auth", mode: "signin" })} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
