"use client";

import { useTransactions } from "@/context/TransactionContext";
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
  const { transactions, hydrated, configMissing, signedIn } = useTransactions();

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
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
          <tr>
            <th scope="col" className="px-4 py-3">
              Receipt
            </th>
            <th scope="col" className="px-4 py-3">
              Date
            </th>
            <th scope="col" className="px-4 py-3">
              Merchant
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Amount
            </th>
            <th scope="col" className="px-4 py-3">
              Category
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((tx) => {
            const d = new Date(tx.date + "T12:00:00");
            return (
              <tr
                key={tx.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/transactions/${tx.id}`}
                    className="inline-flex items-center justify-center"
                  >
                    {tx.receiptImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tx.receiptImageUrl}
                        alt=""
                        className="h-10 w-10 rounded-md border border-zinc-200 object-cover dark:border-zinc-600"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900">
                        —
                      </span>
                    )}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {dateFmt.format(d)}
                </td>
                <td className="max-w-[200px] px-4 py-3">
                  <Link
                    href={`/transactions/${tx.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {tx.merchant}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                  {money.format(tx.amount)}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {tx.category ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
