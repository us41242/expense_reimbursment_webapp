"use client";

import { useTransactions } from "@/context/TransactionContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, LayoutDashboard, FolderKanban, Receipt, PieChart, Landmark, ListTodo, Wallet } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/uncategorized", label: "Uncategorized", icon: FolderKanban },
  { href: "/transactions?filter=uncategorized&sort=oldest", label: "List View", icon: ListTodo },
  { href: "/transactions", label: "Receipts", icon: Receipt },
  { href: "/advances/new", label: "Log Advance", icon: Wallet },
  { href: "/reports", label: "Reports", icon: PieChart },
  { href: "/banks", label: "Bank Accounts", icon: Landmark },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { signedIn, signOut, configMissing } = useTransactions();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Top Left Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-[110] flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-all hover:bg-white/80 hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:hover:bg-zinc-800"
        aria-label="Open Navigation"
      >
        <Menu className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[115] bg-black/20 backdrop-blur-sm transition-opacity dark:bg-black/40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-[120] flex h-full w-72 flex-col gap-6 bg-white/80 px-6 py-8 shadow-2xl backdrop-blur-2xl transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] dark:bg-zinc-950/90 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 bg-gradient-to-br from-emerald-500 to-teal-600 bg-clip-text text-transparent">
            Menu
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            aria-label="Close Navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-2 mt-4">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/20 dark:bg-white dark:text-zinc-900 dark:shadow-white/20 scale-[1.02]"
                    : "text-zinc-600 hover:bg-zinc-100 hover:scale-[1.02] dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                <Icon className={`h-5 w-5 transition-colors ${active ? "text-white dark:text-zinc-900" : "text-zinc-500"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {signedIn && (
          <div className="mt-auto pt-6 border-t border-zinc-200 dark:border-white/10">
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 text-red-600 px-4 py-3.5 text-sm font-semibold transition-all hover:bg-red-100 active:scale-95 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              Sign Out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
