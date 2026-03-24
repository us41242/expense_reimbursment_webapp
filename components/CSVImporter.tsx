"use client";

import { useTransactions } from "@/context/TransactionContext";
import { parseBankCsv, type ParsedImportRow } from "@/lib/csvParser";
import { partitionImportRows } from "@/lib/importPartition";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type PendingDupes = {
  duplicateRows: ParsedImportRow[];
  uniqueRows: ParsedImportRow[];
  allRows: ParsedImportRow[];
  paymentMethodId: string;
};

function rowKey(r: ParsedImportRow, i: number) {
  return `${r.date}|${r.amount}|${r.merchant}|${i}`;
}

export function CSVImporter({ variant = "default" }: { variant?: "default" | "button" } = {}) {
  const {
    transactions,
    paymentMethods,
    hydrated,
    signedIn,
    configMissing,
    addTransactions,
  } = useTransactions();

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Parsed rows waiting for payment method selection */
  const [awaitingPayment, setAwaitingPayment] = useState<ParsedImportRow[] | null>(
    null,
  );
  const [pendingDupes, setPendingDupes] = useState<PendingDupes | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const titleId = useId();
  const descId = useId();
  const payTitleId = useId();

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const applyImport = useCallback(
    async (rows: ParsedImportRow[], paymentMethodId: string) => {
      if (rows.length === 0) {
        setError(
          "No valid rows found. Check that your CSV has Date and Amount columns.",
        );
        return;
      }
      const { error: err } = await addTransactions(
        rows.map((r) => ({
          date: r.date,
          amount: r.amount,
          merchant: r.merchant,
        })),
        paymentMethodId,
      );
      if (err) {
        setError(err);
        return;
      }
      setNotice(
        `Added ${rows.length} transaction${rows.length === 1 ? "" : "s"} to the uncategorized queue.`,
      );
      setError(null);
      setPendingDupes(null);
      setAwaitingPayment(null);
    },
    [addTransactions],
  );

  const runDuplicateCheck = useCallback(
    (rows: ParsedImportRow[], paymentMethodId: string) => {
      const { duplicateRows, uniqueRows } = partitionImportRows(
        rows,
        transactions,
      );

      if (duplicateRows.length > 0) {
        setPendingDupes({
          duplicateRows,
          uniqueRows,
          allRows: rows,
          paymentMethodId,
        });
        return;
      }

      void applyImport(rows, paymentMethodId);
    },
    [transactions, applyImport],
  );

  const processText = useCallback(
    (text: string) => {
      setError(null);
      const rows = parseBankCsv(text);
      if (rows.length === 0) {
        setError(
          "Could not read any transactions. Use a bank CSV with Date and Amount columns (or three columns: date, amount, description).",
        );
        return;
      }
      setAwaitingPayment(rows);
      setSelectedPaymentId(paymentMethods[0]?.id ?? "");
    },
    [paymentMethods],
  );

  const onFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Please upload a .csv file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        processText(String(reader.result ?? ""));
      };
      reader.onerror = () => {
        setError("Could not read that file.");
      };
      reader.readAsText(file);
    },
    [processText],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
      e.target.value = "";
    },
    [onFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const confirmPaymentAndContinue = useCallback(() => {
    if (!awaitingPayment?.length || !selectedPaymentId) {
      setError("Select a form of payment for this import.");
      return;
    }
    const rows = awaitingPayment;
    const pm = selectedPaymentId;
    setAwaitingPayment(null);
    runDuplicateCheck(rows, pm);
  }, [awaitingPayment, selectedPaymentId, runDuplicateCheck]);

  const skipDupes = useCallback(() => {
    if (!pendingDupes) return;
    if (pendingDupes.uniqueRows.length === 0) {
      setNotice("No new unique transactions to add.");
      setPendingDupes(null);
      return;
    }
    void applyImport(pendingDupes.uniqueRows, pendingDupes.paymentMethodId);
  }, [pendingDupes, applyImport]);

  const addAnyway = useCallback(() => {
    if (!pendingDupes) return;
    void applyImport(pendingDupes.allRows, pendingDupes.paymentMethodId);
  }, [pendingDupes, applyImport]);

  const closeDupesModal = useCallback(() => {
    setPendingDupes(null);
  }, []);

  const closePaymentModal = useCallback(() => {
    setAwaitingPayment(null);
  }, []);

  if (configMissing) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        Add <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.local</code>.
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
        Preparing import…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
        Sign in to import CSV files into your Supabase-backed account.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {variant === "button" ? (
          <div>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-4 flex w-full items-center justify-center rounded-xl border border-emerald-900/50 bg-[#0A1612] px-6 py-4 text-xl font-bold tracking-tight text-emerald-500 shadow-sm transition hover:bg-[#0D1C17] dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40"
            >
              Add Transactions
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Upload bank CSV file"
              onChange={onInputChange}
            />
            {error ? (
              <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="mt-3 text-center text-sm text-emerald-700 dark:text-emerald-400" role="status">
                {notice}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              Import from bank CSV
            </p>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragOver
                  ? "border-emerald-500 bg-emerald-50/80 dark:border-emerald-400 dark:bg-emerald-950/40"
                  : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900/30 dark:hover:border-zinc-500"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                aria-label="Upload bank CSV file"
                onChange={onInputChange}
              />
              <p className="text-sm text-zinc-700 dark:text-zinc-200">
                Drop a CSV here or click to browse
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                After parsing, you&apos;ll choose which card or account this export is from.
                Duplicates match on exact date, amount, and merchant name.
              </p>
            </div>
            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
                {notice}
              </p>
            ) : null}
          </>
        )}
      </div>

      {awaitingPayment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={closePaymentModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={payTitleId}
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={payTitleId}
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Form of payment
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This CSV is for one card or account. Which one? (You can manage options in
              Supabase or add rows to <code className="text-xs">payment_methods</code>.)
            </p>
            <label className="mt-6 block text-base font-medium text-zinc-700 dark:text-zinc-300">
              Payment used
              <select
                className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-4 py-4 text-lg text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                value={selectedPaymentId}
                onChange={(e) => setSelectedPaymentId(e.target.value)}
              >
                {paymentMethods.length === 0 ? (
                  <option value="">No payment methods — run SQL seed / sign up again</option>
                ) : (
                  paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={closePaymentModal}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedPaymentId}
                className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                onClick={confirmPaymentAndContinue}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDupes ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={closeDupesModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
              <h2
                id={titleId}
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Possible duplicates
              </h2>
              <p id={descId} className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {pendingDupes.duplicateRows.length} row
                {pendingDupes.duplicateRows.length === 1 ? "" : "s"} match an existing
                transaction (or another row in this file) with the same date, amount, and merchant. How should we continue?
              </p>
            </div>
            <ul className="max-h-40 overflow-auto border-b border-zinc-200 px-5 py-3 text-sm dark:border-zinc-700">
              {pendingDupes.duplicateRows.slice(0, 12).map((r, i) => (
                <li
                  key={rowKey(r, i)}
                  className="flex justify-between gap-2 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800"
                >
                  <span className="truncate text-zinc-700 dark:text-zinc-200">
                    {r.merchant}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-600 dark:text-zinc-400">
                    {dateFmt.format(new Date(r.date + "T12:00:00"))} ·{" "}
                    {money.format(r.amount)}
                  </span>
                </li>
              ))}
              {pendingDupes.duplicateRows.length > 12 ? (
                <li className="py-2 text-xs text-zinc-500">
                  + {pendingDupes.duplicateRows.length - 12} more…
                </li>
              ) : null}
            </ul>
            <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={closeDupesModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={skipDupes}
              >
                Skip duplicates
              </button>
              <button
                type="button"
                className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                onClick={addAnyway}
              >
                Add anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
