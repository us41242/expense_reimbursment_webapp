"use client";

import { useTransactions } from "@/context/TransactionContext";
import type { ExpenseCategory } from "@/lib/types";
import Link from "next/link";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRightLeft, ArrowDown, ArrowUp } from "lucide-react";

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
  if (!name) return '/cards/Wire Transfer Icon.png';
  const n = name?.toLowerCase() || '';
  if (n.includes('costco') || n.includes('citi')) return '/cards/Citi Costco Icon.png';
  if (n.includes('debit') || n.includes('bus complete chk') || n.includes('chk')) return '/cards/Chase Business Debit Icon.png';
  if (n.includes('sav') || n.includes('total sav')) return '/cards/Chase Business Savings Icon.png';
  if (n.includes('ink')) return '/cards/Chase Ink Icon.png';
  return null;
}

function TransactionsListContent() {
  const { transactions, hydrated, configMissing, signedIn, setCategory, clearCategory } = useTransactions();
  const searchParams = useSearchParams();

  const [filter, setFilter] = useState<"all" | "uncategorized" | "categorized" | "reimbursable" | "personal">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "largest" | "smallest">("newest");

  // Read initial params
  useEffect(() => {
    const f = searchParams.get("filter");
    if (f === "uncategorized" || f === "categorized" || f === "reimbursable" || f === "personal") setFilter(f as any);
    if (searchParams.get("sort") === "oldest") setSort("oldest");
  }, [searchParams]);

  const sorted = [...transactions]
    .filter((t) => {
      if (filter === "uncategorized") return !t.category || t.category === "research-needed";
      if (filter === "categorized") return !!t.category && t.category !== "research-needed";
      if (filter === "reimbursable") return t.category === "reimbursable";
      if (filter === "personal") return t.category === "personal";
      return true;
    })
    .sort((a, b) => {
      if (sort === "largest") return Math.abs(b.amount) - Math.abs(a.amount);
      if (sort === "smallest") return Math.abs(a.amount) - Math.abs(b.amount);
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-2 px-2 sm:mx-0 sm:px-0">
          {(["all", "uncategorized", "categorized", "reimbursable", "personal"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition shrink-0 ${
                filter === f
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {f === "all" ? "All" : f === "uncategorized" ? "Uncategorized" : f === "reimbursable" ? "Reimbursable" : f === "personal" ? "Personal" : "Completed"}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap justify-start gap-2 pb-2">
          <button
            onClick={() => setSort(s => s === "newest" ? "oldest" : "newest")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors border ${
              sort === "newest" || sort === "oldest" 
                ? "bg-zinc-100 border-zinc-300 text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" 
                : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            {sort === "newest" ? (
              <><span>Newest First</span> <ArrowDown className="h-3.5 w-3.5" /></>
            ) : sort === "oldest" ? (
              <><span>Oldest First</span> <ArrowUp className="h-3.5 w-3.5" /></>
            ) : (
              <span>Sort by Date</span>
            )}
          </button>

          <button
            onClick={() => setSort(s => s === "largest" ? "smallest" : "largest")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors border ${
              sort === "largest" || sort === "smallest" 
                ? "bg-zinc-100 border-zinc-300 text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" 
                : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            {sort === "largest" ? (
              <><span>Largest First</span> <ArrowDown className="h-3.5 w-3.5" /></>
            ) : sort === "smallest" ? (
              <><span>Smallest First</span> <ArrowUp className="h-3.5 w-3.5" /></>
            ) : (
              <span>Sort by Amount</span>
            )}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col">
        {sorted.length === 0 ? (
          <div className="px-4 py-12 text-center text-zinc-500">
            {filter === "uncategorized" 
              ? "All caught up! You have no uncategorized transactions." 
              : filter === "categorized"
                ? "You have no categorized transactions yet."
                : filter === "reimbursable"
                  ? "You have no reimbursable transactions."
                : filter === "personal"
                  ? "You have no personal transactions."
                : "No transactions found."}
          </div>
        ) : (
          sorted.map((tx) => {
            const d = new Date(tx.date + "T12:00:00");
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white p-4 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/40"
              >
                {/* Image & Text Header */}
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex flex-col items-center justify-start shrink-0 w-14">
                    <div className={`relative h-14 w-14 overflow-hidden rounded-lg bg-zinc-50 dark:bg-zinc-900 ${
                      tx.category === 'reimbursable' ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-zinc-950 border-0' :
                      tx.category === 'personal' ? 'ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-zinc-950 border-0' :
                      tx.category === 'non-reimbursable' ? 'ring-2 ring-orange-500 ring-offset-1 dark:ring-offset-zinc-950 border-0' :
                      tx.category === 'research-needed' ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-zinc-950 border-0' :
                      'border border-zinc-200 dark:border-zinc-700'
                    }`}>
                      <select
                        value={tx.category ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) void clearCategory(tx.id);
                          else void setCategory(tx.id, val as ExpenseCategory);
                        }}
                        className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer text-base"
                      >
                        <option value="">Uncategorized</option>
                        <option value="personal">Personal</option>
                        <option value="reimbursable">Reimbursable</option>
                        <option value="non-reimbursable">Tax Deductible</option>
                        <option value="research-needed">Research Needed</option>
                      </select>

                      {tx.receiptImageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={tx.receiptImageUrl}
                          alt="Receipt"
                          className="h-full w-full object-cover transition hover:opacity-80"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800 transition hover:opacity-80">
                          {(() => {
                            const isWireTransfer = 
                              tx.notes?.includes("[Advance Payment]") || 
                              tx.merchant.startsWith("Payout from") ||
                              tx.merchant.toLowerCase().includes("direct deposit") ||
                              tx.merchant.toLowerCase().includes("transfer");

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
                        </div>
                      )}
                    </div>
                    
                    <Link href={`/transactions/${tx.id}`} className="mt-1.5 w-full shrink-0">
                      <span className="block text-center text-[10px] font-medium tracking-tight text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 truncate">
                        {tx.receiptImageUrl ? "Receipt/Note" : "Add Receipt"}
                      </span>
                    </Link>
                  </div>
                  
                  <div className="flex flex-col overflow-hidden pl-1 max-w-[170px] sm:max-w-none">
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="text-[15px] font-bold tracking-tight text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50 truncate pb-0.5"
                    >
                      {tx.merchant}
                    </Link>
                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">
                      {dateFmt.format(d)}
                    </span>
                    {tx.category && (
                      <span className={`mt-0.5 text-[11px] font-semibold capitalize truncate ${
                        tx.category === 'reimbursable' ? 'text-emerald-600 dark:text-emerald-500' :
                        tx.category === 'personal' ? 'text-purple-600 dark:text-purple-500' :
                        tx.category === 'non-reimbursable' ? 'text-orange-600 dark:text-orange-500' :
                        tx.category === 'research-needed' ? 'text-amber-600 dark:text-amber-500' :
                        'text-zinc-500 dark:text-zinc-400'
                      }`}>
                        {tx.category === 'non-reimbursable' ? 'Tax Deductible' : tx.category.replace("-", " ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="flex shrink-0 items-center justify-end text-right">
                  {(() => {
                    const pmName = (tx.paymentMethodName || '').toLowerCase();
                    const isDepository = pmName.includes('chk') || pmName.includes('debit') || pmName.includes('sav');
                    const isAdvance = tx.notes?.includes("[Advance Payment]");
                    const isCredit = isAdvance ? true : (isDepository ? tx.amount > 0 : tx.amount < 0);
                    
                    return (
                      <span className={`text-base sm:text-lg font-bold tabular-nums tracking-tight ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
                        {isCredit ? `(Credit) ${money.format(Math.abs(tx.amount))}` : money.format(Math.abs(tx.amount))}
                      </span>
                    );
                  })()}
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
