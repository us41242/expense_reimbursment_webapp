"use client";

import { useTransactions } from "@/context/TransactionContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/uncategorized", label: "Uncategorized" },
  { href: "/transactions", label: "Receipts" },
  { href: "/reports", label: "Reports" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { signedIn, signOut, configMissing } = useTransactions();

  return (
    <header className="fixed top-3 left-3 right-3 z-[100] mx-auto flex max-w-5xl flex-col gap-3 rounded-[1.5rem] border border-white/60 bg-white/40 px-3 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-all dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] md:top-6 md:left-6 md:right-6 md:flex-row md:items-center md:justify-center md:rounded-[2rem] md:px-6 md:py-3">

      {/* Navigation Pills */}
      <nav className="flex items-center justify-between gap-1 overflow-x-auto rounded-xl bg-white/40 p-1 shadow-inner dark:bg-black/30 md:justify-center md:rounded-full">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-xs font-semibold transition-all md:rounded-full md:px-4 md:text-sm ${
                active
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-white/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

    </header>
  );
}


