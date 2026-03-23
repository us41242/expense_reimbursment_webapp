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
  month: "short",
  day: "numeric",
  year: "numeric",
});

function Toggle({
  label,
  pressed,
  onToggle,
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        pressed
          ? "bg-emerald-600 dark:bg-emerald-500"
          : "bg-zinc-300 dark:bg-zinc-600"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          pressed ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export function ReportsClient() {
  const {
    hydrated,
    configMissing,
    signedIn,
    transactions,
    setReimbursementBilled,
    setReimbursementPaid,
  } = useTransactions();

  const unpaidReimbursable = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.category === "reimbursable" &&
          !t.reimbursementPaid,
      ),
    [transactions],
  );

  if (!hydrated) {
    return (
      <p className="text-sm text-zinc-500">Loading…</p>
    );
  }

  if (configMissing) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Configure Supabase to load reimbursements.
      </p>
    );
  }

  if (!signedIn) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Sign in to view reimbursements.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Reimbursable expenses that are not marked paid. Mark as billed when you submit them;
          mark as paid when reimbursed.
        </p>
        <Link
          href="/reports/export"
          className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Export report
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
            <tr>
              <th scope="col" className="px-4 py-3">
                Date
              </th>
              <th scope="col" className="px-4 py-3">
                Description
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Amount
              </th>
              <th scope="col" className="px-4 py-3">
                Receipt
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                Billed
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                Paid
              </th>
            </tr>
          </thead>
          <tbody>
            {unpaidReimbursable.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-zinc-500"
                >
                  No unpaid reimbursable items. Categorize transactions as Reimbursable or
                  mark existing ones as paid on the transaction detail page.
                </td>
              </tr>
            ) : (
              unpaidReimbursable.map((t) => (
                <ReportRow
                  key={t.id}
                  tx={t}
                  onBilled={() =>
                    void setReimbursementBilled(t.id, !t.reimbursementBilled)
                  }
                  onPaid={() =>
                    void setReimbursementPaid(t.id, !t.reimbursementPaid)
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportRow({
  tx,
  onBilled,
  onPaid,
}: {
  tx: Transaction;
  onBilled: () => void;
  onPaid: () => void;
}) {
  const d = new Date(tx.date + "T12:00:00");

  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
      <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
        {dateFmt.format(d)}
      </td>
      <td className="max-w-[200px] px-4 py-3">
        <Link
          href={`/transactions/${tx.id}`}
          className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
        >
          {tx.merchant}
        </Link>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
        {money.format(tx.amount)}
      </td>
      <td className="px-4 py-2">
        {tx.receiptImageUrl ? (
          <Link
            href={`/transactions/${tx.id}`}
            className="inline-block overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-600"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tx.receiptImageUrl}
              alt=""
              className="h-12 w-12 object-cover"
            />
          </Link>
        ) : (
          <Link
            href={`/transactions/${tx.id}`}
            className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
          >
            Add receipt
          </Link>
        )}
      </td>
      <td className="px-4 py-2 text-center">
        <Toggle
          label="Mark as billed"
          pressed={tx.reimbursementBilled}
          onToggle={onBilled}
        />
      </td>
      <td className="px-4 py-2 text-center">
        <Toggle
          label="Mark as paid"
          pressed={tx.reimbursementPaid}
          onToggle={onPaid}
        />
      </td>
    </tr>
  );
}
