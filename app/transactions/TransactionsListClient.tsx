"use client";

import { useTransactions } from "@/context/TransactionContext";
import type { ExpenseCategory } from "@/lib/types";
import Link from "next/link";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function getCardIcon(name: string | null) {
  const n = name?.toLowerCase() || '';
  if (n.includes('costco') || n.includes('citi')) return '/cards/Citi Costco Icon.png';
  if (n.includes('debit')) return '/cards/Chase Business Debit Icon.png';
  if (n.includes('ink')) return '/cards/Chase Ink Icon.png';
  return null;
}

function TransactionsListContent() {
  const { transactions, hydrated, configMissing, signedIn, setCategory, clearCategory } = useTransactions();
  const searchParams = useSearchParams();

  const [filter, setFilter] = useState<"all" | "uncategorized" | "categorized">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  // Read initial params
  useEffect(() => {
    const f = searchParams.get("filter");
    if (f === "uncategorized" || f === "categorized") setFilter(f);
    if (searchParams.get("sort") === "oldest") setSort("oldest");
  }, [searchParams]);

  const sorted = [...transactions]
    .filter((t) => {
      if (filter === "uncategorized") return !t.category || t.category === "research-needed";
      if (filter === "categorized") return !!t.category && t.category !== "research-needed";
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return sort === "newest" ? diff : -diff;
    });

  if (!hydrated) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (configMissing) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Configure Supabase environment variables to use the receipt gallery.
      </p>
    );
  }

  if (!signedIn) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Sign in to see your transactions.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "uncategorized", "categorized"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === f
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {f === "all" ? "All Receipts" : f === "uncategorized" ? "Uncategorized" : "Completed"}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setSort(s => s === "newest" ? "oldest" : "newest")}
          className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          {sort === "newest" ? (
            <>
              <span>Newest First</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </>
          ) : (
            <>
              <span>Oldest First</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </>
          )}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col">
        {sorted.length === 0 ? (
          <div className="px-4 py-12 text-center text-zinc-500">
            No transactions found.
          </div>
        ) : (
          sorted.map((tx) => {
            const d = new Date(tx.date + "T12:00:00");
            return (
              <div
                key={tx.id}
                className="flex flex-col gap-4 border-b border-zinc-200 bg-white p-4 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Image & Text Header */}
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-start shrink-0">
                    <div className="h-14 w-14 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                      {tx.receiptImageUrl ? (
                        <Link href={`/transactions/${tx.id}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={tx.receiptImageUrl}
                            alt="Receipt"
                            className="h-full w-full object-cover transition hover:opacity-80"
                          />
                        </Link>
                      ) : (
                        <Link
                          href={`/transactions/${tx.id}`}
                          className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800 transition hover:opacity-80"
                        >
                          {(() => {
                            const isWireTransfer = tx.notes?.includes("[Advance Payment]") || tx.merchant.startsWith("Payout from");
                            if (isWireTransfer) {
                              /* eslint-disable-next-line @next/next/no-img-element */
                              return <img src="/cards/Wire Transfer Icon.png" alt="Wire Transfer" className="h-full w-full object-cover" />;
                            }
                            const iconUrl = getCardIcon(tx.paymentMethodName);
                            if (iconUrl) {
                              /* eslint-disable-next-line @next/next/no-img-element */
                              return <img src={iconUrl} alt="Card" className="h-full w-full object-cover" />;
                            }
                            return (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                Add
                              </span>
                            );
                          })()}
                        </Link>
                      )}
                    </div>
                    {!tx.receiptImageUrl && (
                      <Link href={`/transactions/${tx.id}`}>
                        <span className="mt-1 block text-center text-[10px] font-medium tracking-tight text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200">
                          Add Receipt
                        </span>
                      </Link>
                    )}
                  </div>
                  
                  <div className="flex flex-col">
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="text-[15px] font-bold tracking-tight text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
                    >
                      {tx.merchant}
                    </Link>
                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {dateFmt.format(d)}
                    </span>
                  </div>
                </div>

                {/* Category Dropdown & Amount */}
                <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3 dark:border-zinc-800 sm:gap-6 sm:border-0 sm:pt-0">
                  <select
                    value={tx.category ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) void clearCategory(tx.id);
                      else void setCategory(tx.id, val as ExpenseCategory);
                    }}
                    className="w-full sm:max-w-[180px] appearance-none truncate rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-xl sm:text-base font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus:border-emerald-400"
                  >
                    <option value="">Uncategorized</option>
                    <option value="personal">Personal</option>
                    <option value="reimbursable">Reimbursable</option>
                    <option value="non-reimbursable">Non-Reimbursable</option>
                    <option value="research-needed">Research Needed</option>
                  </select>

                  <span className="text-lg font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[15px]">
                    {money.format(tx.amount)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      </div>
    </div>
  );
}

export function TransactionsListClient() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading list…</p>}>
      <TransactionsListContent />
    </Suspense>
  );
}
