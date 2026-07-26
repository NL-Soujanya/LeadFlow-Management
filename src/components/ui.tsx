import { type ReactNode } from "react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-sm text-slate-500">
            LeadFlow &middot; Lead management for small sales teams
          </p>
          <a
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Built for Digital Heroes Training Task
          </a>
        </div>
      </div>
    </footer>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-300",
    ghost: "text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-300",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  error,
  className = "",
  ...props
}: { label?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}
      <input
        className={`block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 ${error ? "border-rose-400" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  className = "",
  ...props
}: { label?: string; error?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}
      <textarea
        className={`block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 ${error ? "border-rose-400" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  error,
  className = "",
  children,
  ...props
}: { label?: string; error?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}
      <select
        className={`block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 ${error ? "border-rose-400" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 ${className}`}
      style={{ width: "1em", height: "1em" }}
    />
  );
}
