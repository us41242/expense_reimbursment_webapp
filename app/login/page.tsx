"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      return;
    }
    setLoading(true);
    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      router.push("/categorizer");
      router.refresh();
      return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/categorizer");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Use the same email provider you enabled in Supabase Auth.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button
              type="button"
              className="font-medium text-zinc-900 underline dark:text-zinc-100"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="font-medium text-zinc-900 underline dark:text-zinc-100"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
            >
              Sign in
            </button>
          </>
        )}
      </p>

      <p className="text-center">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
        >
          ← Back to app
        </Link>
      </p>
    </div>
  );
}
