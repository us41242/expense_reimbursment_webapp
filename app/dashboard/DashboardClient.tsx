"use client";

import { useTransactions } from "@/context/TransactionContext";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { CSVImporter } from "@/components/CSVImporter";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function DashboardClient() {
  const { transactions, hydrated, signedIn, userEmail } = useTransactions();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    const hour = new Date().getHours();

    const isCandan = userEmail?.toLowerCase().includes('candan');
    const nameStr = userEmail ? userEmail.split('@')[0] : 'User';
    const name = isCandan ? 'Candan' : (nameStr.charAt(0).toUpperCase() + nameStr.slice(1));

    if (hour >= 5 && hour < 12) {
      setGreeting(isCandan ? `Günaydın ${name}` : `Good morning ${name}`);
    } else if (hour >= 12 && hour < 18) {
      setGreeting(isCandan ? `İyi günler ${name}` : `Good afternoon ${name}`);
    } else {
      setGreeting(isCandan ? `İyi akşamlar ${name}` : `Good evening ${name}`);
    }
  }, [hydrated, userEmail]);

  const metrics = useMemo(() => {
    let unbilled = 0;
    let uncategorized = 0;
    let billedUnpaid = 0;
    let uncategorizedCount = 0;
    let advances = 0;

    for (const t of transactions) {
      if (t.category === "reimbursable") {
        if (!t.reimbursementBilled && !t.reimbursementPaid) {
          unbilled += t.amount;
        } else if (t.reimbursementBilled && !t.reimbursementPaid) {
          billedUnpaid += t.amount;
        }
      }
      if (t.category === "advance") {
        // Advances are logged as negative amounts, so we use Math.abs to subtract them
        advances += Math.abs(t.amount);
      }
      if (t.category === null || t.category === "research-needed") {
        uncategorized += t.amount;
        uncategorizedCount++;
      }
    }

    // Cascade advances to lower the effective "owed" metrics
    let trueUnbilled = unbilled;
    let trueBilledUnpaid = billedUnpaid;
    
    if (advances > 0) {
      if (trueUnbilled >= advances) {
         trueUnbilled -= advances;
      } else {
         const remainder = advances - trueUnbilled;
         trueUnbilled = 0;
         trueBilledUnpaid = Math.max(0, trueBilledUnpaid - remainder);
      }
    }

    return { 
      unbilled: trueUnbilled, 
      uncategorized, 
      billedUnpaid: trueBilledUnpaid, 
      uncategorizedCount 
    };
  }, [transactions]);

  if (!hydrated) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!signedIn) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-600 dark:text-zinc-400">Sign in to view dashboard metrics.</p>
        <Link
          href="/login"
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const cards = [
    {
      label: "Unpaid Reimbursable",
      value: money.format(metrics.unbilled),
      hint: "Not yet billed",
      href: "/reports",
    },
    {
      label: "Uncategorized Queue",
      value: money.format(metrics.uncategorized),
      hint: "Total amount uncategorized",
      href: "/transactions?filter=uncategorized&sort=oldest",
    },
    {
      label: "Reimbursement Pending",
      value: money.format(metrics.billedUnpaid),
      hint: "Billed, waiting for payment",
      href: "/reports",
    },
  ];

  return (
    <>
      {greeting && (
        <h1 className="mb-6 text-center text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
          {greeting}
        </h1>
      )}
      <section
        aria-labelledby="expense-overview-heading"
        className="grid gap-4 sm:grid-cols-3"
      >
        <h2 id="expense-overview-heading" className="sr-only">
          Expense overview
        </h2>
        {cards.map((card) => (
          <Link
            href={card.href}
            key={card.label}
            className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{card.hint}</p>
          </Link>
        ))}
      </section>

      {metrics.uncategorizedCount > 0 ? (
        <section aria-labelledby="inbox-cta-heading" className="mt-4">
          <Link
            href="/uncategorized"
            className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100/80 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40 sm:py-6"
          >
            {/* Background decorative glow */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-emerald-100/50 opacity-0 transition duration-500 group-hover:opacity-100 dark:to-emerald-900/20" />

            <div className="relative z-10 flex flex-col items-center">
              <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </span>
              <h2
                id="inbox-cta-heading"
                className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-xl"
              >
                You have {metrics.uncategorizedCount} receipt{metrics.uncategorizedCount === 1 ? "" : "s"} waiting
              </h2>
              <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Keep your expenses up to date. Tap here to clear your inbox.
              </p>
              <div className="mt-4 rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition group-hover:bg-emerald-500 dark:bg-emerald-500 dark:text-emerald-950 dark:group-hover:bg-emerald-400">
                Start Categorizing
              </div>
            </div>
          </Link>
        </section>
      ) : (
        <section className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900/50 dark:text-zinc-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Inbox Zero!
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            All your receipts are categorized.
          </p>
        </section>
      )}

      <div>
        <CSVImporter variant="button" />
      </div>
    </>
  );
}
