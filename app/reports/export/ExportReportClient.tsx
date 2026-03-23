"use client";

import { useTransactions } from "@/context/TransactionContext";
import type { Transaction } from "@/lib/types";
import Link from "next/link";
import { useMemo } from "react";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function ExportReportClient() {
  const { transactions, hydrated, configMissing, signedIn } = useTransactions();

  const rows = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.category === "reimbursable" &&
          !t.reimbursementPaid,
      ),
    [transactions],
  );

  const total = useMemo(
    () => rows.reduce((s, t) => s + t.amount, 0),
    [rows],
  );

  if (!hydrated) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (configMissing) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Configure Supabase to export.
      </p>
    );
  }

  if (!signedIn) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Sign in to export your reimbursement report.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/reports"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to Reports
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Print
        </button>
      </div>

      <article className="print-report space-y-8 text-zinc-900 dark:text-zinc-50 print:text-black">
        <header className="border-b border-zinc-200 pb-6 print:border-zinc-300">
          <h1 className="text-2xl font-bold tracking-tight print:text-2xl">
            Reimbursement expense report
          </h1>
          <p className="mt-2 text-sm text-zinc-600 print:text-zinc-600">
            Unpaid reimbursable items · Generated{" "}
            {new Intl.DateTimeFormat("en-US", {
              dateStyle: "long",
            }).format(new Date())}
          </p>
          <p className="mt-4 text-lg font-semibold tabular-nums print:text-xl">
            Total: {money.format(total)}
          </p>
        </header>

        {rows.length === 0 ? (
          <p className="text-zinc-600 print:text-zinc-600">
            No unpaid reimbursable expenses to include.
          </p>
        ) : (
          <ul className="space-y-10 print:space-y-8">
            {rows.map((tx) => (
              <ExportItem key={tx.id} tx={tx} />
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

function ExportItem({ tx }: { tx: Transaction }) {
  const d = new Date(tx.date + "T12:00:00");

  return (
    <li className="break-inside-avoid border-b border-zinc-200 pb-8 last:border-0 print:border-zinc-300 print:pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-zinc-900 print:text-lg">{tx.merchant}</p>
          <p className="text-sm text-zinc-600 print:text-zinc-700">
            {dateFmt.format(d)}
          </p>
          <p className="mt-2 text-xl font-semibold tabular-nums print:text-2xl">
            {money.format(tx.amount)}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 print:text-zinc-700">
            <div>
              <dt className="inline font-medium">Billed: </dt>
              <dd className="inline">{tx.reimbursementBilled ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </div>
        <div className="shrink-0">
          {tx.receiptImageUrl ? (
            <div className="overflow-hidden rounded-lg border border-zinc-200 print:border-zinc-400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tx.receiptImageUrl}
                alt={`Receipt for ${tx.merchant}`}
                className="max-h-48 max-w-full object-contain print:max-h-56"
              />
            </div>
          ) : (
            <div className="flex h-32 w-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-500 print:border-zinc-400 print:bg-white print:text-zinc-600">
              No receipt image
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
