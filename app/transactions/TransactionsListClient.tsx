"use client";

import { useTransactions } from "@/context/TransactionContext";
import type { ExpenseCategory } from "@/lib/types";
import Link from "next/link";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function TransactionsListClient() {
  const { transactions, hydrated, configMissing, signedIn, setCategory, clearCategory } = useTransactions();

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

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
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
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
                        className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                      >
                        Add
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
                    className="max-w-[160px] appearance-none truncate rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-600 dark:focus:border-zinc-400"
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
  );
}
