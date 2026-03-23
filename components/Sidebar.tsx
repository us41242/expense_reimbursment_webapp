"use client";

import { useTransactions } from "@/context/TransactionContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/categorizer", label: "Categorizer" },
  { href: "/transactions", label: "Receipt gallery" },
  { href: "/reports", label: "Reports" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { signedIn, userEmail, signOut, configMissing } = useTransactions();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 print:hidden dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-5 py-6 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Expense tracker
        </p>
        <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Receipts
        </p>
        {!configMissing && signedIn && userEmail ? (
          <p className="mt-2 truncate text-xs text-zinc-500" title={userEmail}>
            {userEmail}
          </p>
        ) : null}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Main">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-700"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        {!configMissing && signedIn ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        ) : !configMissing ? (
          <Link
            href="/login"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            Sign in
          </Link>
        ) : (
          <p className="px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Set Supabase env in .env.local
          </p>
        )}
      </div>
    </aside>
  );
}
