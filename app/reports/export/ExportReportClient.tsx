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
      transactions
        .filter(
          (t) =>
            t.category === "reimbursable" &&
            !t.reimbursementPaid,
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [transactions],
  );

  const total = useMemo(
    () => rows.reduce((s, t) => s + t.amount, 0),
    [rows],
  );

  const downloadCSV = () => {
    const header = "Date,Amount,Merchant,Category,Payment Method,Billed\n";
    const csvContent = rows
      .map((t) => {
        const escape = (str: string | null) => {
          if (!str) return '""';
          return `"${str.replace(/"/g, '""')}"`;
        };
        return [
          escape(t.date),
          t.amount.toFixed(2),
          escape(t.merchant),
          escape(t.category),
          escape(t.paymentMethodName),
          t.reimbursementBilled ? "Yes" : "No",
        ].join(",");
      })
      .join("\n");

    const blob = new Blob([header + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `expense_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={downloadCSV}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Print
          </button>
        </div>
      </div>

      <article className="print-report space-y-8 text-zinc-900 dark:text-zinc-50 print:text-black">
        <header className="border-b border-zinc-200 pb-6 dark:border-zinc-800 print:border-zinc-300">
          <h1 className="uppercase text-2xl font-bold tracking-tight text-zinc-900 dark:text-white print:text-2xl print:text-black">
            REIMBURSEMENT EXPENSE REPORT
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
            Unpaid Reimbursable Business Expenses | Report Generated {dateFmt.format(new Date())}
          </p>
          <p className="mt-4 text-lg font-semibold tabular-nums text-zinc-900 dark:text-white print:text-xl print:text-black">
            Total {money.format(total)}
          </p>
        </header>

        {rows.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
            No unpaid reimbursable expenses to include.
          </p>
        ) : (
          <>
            <div className="font-sans text-[12pt] leading-tight print:text-black">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-zinc-300 dark:border-zinc-700">
                    <th className="py-2.5 pr-4 font-bold whitespace-nowrap">Date</th>
                    <th className="py-2.5 pr-4 font-bold">Business / Description</th>
                    <th className="py-2.5 pr-4 font-bold text-right whitespace-nowrap">Charge</th>
                    <th className="py-2.5 font-bold text-right">Account it was paid from</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((tx) => {
                    const absAmt = Math.abs(tx.amount);
                    return (
                      <tr key={tx.id} className="border-b border-zinc-200 print:border-zinc-300 dark:border-zinc-800">
                        <td className="py-2 pr-4">{dateFmt.format(new Date(tx.date + "T12:00:00"))}</td>
                        <td className="py-2 pr-4 font-medium">{tx.merchant}</td>
                        <td className="py-2 pr-4 text-right font-medium">{money.format(absAmt)}</td>
                        <td className="py-2 text-right text-zinc-600 dark:text-zinc-400 print:text-zinc-800">
                          {tx.paymentMethodName || "Unknown"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rows.filter((tx) => tx.receiptImageUrl).length > 0 && (
              <div className="break-before-page pt-8">
                <h2 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-white print:text-black border-b border-zinc-200 pb-4 print:border-zinc-300">
                  Receipt Appendices
                </h2>
                <div className="flex flex-col gap-12">
                  {rows
                    .filter((tx) => tx.receiptImageUrl)
                    .map((tx) => (
                      <div key={`receipt-${tx.id}`} className="break-inside-avoid space-y-4">
                        <p className="font-semibold text-lg text-zinc-900 border-b border-zinc-100 pb-2 dark:text-zinc-100 dark:border-zinc-800 print:text-black print:border-zinc-200">
                          {tx.merchant} — {dateFmt.format(new Date(tx.date + "T12:00:00"))} ({money.format(Math.abs(tx.amount))})
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tx.receiptImageUrl!}
                          alt={`Receipt for ${tx.merchant}`}
                          className="max-w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-700 print:max-w-4xl print:border-none print:shadow-none shadow-sm"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </article>
    </div>
  );
}
