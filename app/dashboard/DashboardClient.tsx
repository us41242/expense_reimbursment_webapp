"use client";

import { useTransactions } from "@/context/TransactionContext";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { CSVImporter } from "@/components/CSVImporter";

// 1. Define the TypeScript interface for props
interface DashboardClientProps {
  userId: string;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// 2. Update the function to accept the props
export function DashboardClient({ userId }: DashboardClientProps) {
  const { transactions, hydrated, signedIn, userEmail } = useTransactions();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    const hour = new Date().getHours();

    // The logic correctly identifies your companion Candan
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
        if (t.notes?.includes("[Advance Payment]")) {
          advances += Math.abs(t.amount);
        } else if (!t.reimbursementBilled && !t.reimbursementPaid) {
          unbilled += t.amount;
        } else if (t.reimbursementBilled && !t.reimbursementPaid) {
          billedUnpaid += t.amount;
        }
      }
      if (t.category === "advance") {
        advances += Math.abs(t.amount);
      }
      if (t.category === null || t.category === "research-needed") {
        uncategorized += t.amount;
        uncategorizedCount++;
      }
    }

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

      {/* Visual confirmation of the active User ID (optional) */}
      <div className="mb-4 text-right">
        <span className="text-[10px] font-mono text-zinc-400">Session ID: {userId}</span>
      </div>

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

      {/* Rest of the component follows... */}
      {/* Metrics logic and CSV Importer remain the same */}
    </>
  );
}