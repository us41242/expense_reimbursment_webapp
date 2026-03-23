"use client";

import { useTransactions } from "@/context/TransactionContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const MAX_BYTES = 2.5 * 1024 * 1024;

type Props = { id: string };

export function TransactionDetailClient({ id }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    transactions,
    hydrated,
    configMissing,
    signedIn,
    uploadReceiptImage,
    removeReceiptImage,
    setReimbursementBilled,
    setReimbursementPaid,
  } = useTransactions();

  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const tx = transactions.find((t) => t.id === id);

  const onFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file (PNG, JPG, or screenshot).");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Image is too large. Try a file under 2.5 MB.");
        return;
      }
      setUploading(true);
      const { error: err } = await uploadReceiptImage(id, file);
      setUploading(false);
      if (err) setError(err);
    },
    [id, uploadReceiptImage],
  );

  const onRemove = useCallback(async () => {
    setError(null);
    setUploading(true);
    const { error: err } = await removeReceiptImage(id);
    setUploading(false);
    if (err) setError(err);
  }, [id, removeReceiptImage]);

  if (configMissing) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Configure Supabase environment variables to use cloud storage.
      </p>
    );
  }

  if (!hydrated) {
    return (
      <p className="text-sm text-zinc-500">Loading…</p>
    );
  }

  if (!signedIn) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-600 dark:text-zinc-400">Sign in to view transactions.</p>
        <Link
          href="/login"
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-600 dark:text-zinc-400">Transaction not found.</p>
        <Link
          href="/categorizer"
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Back to Categorizer
        </Link>
      </div>
    );
  }

  const d = new Date(tx.date + "T12:00:00");
  const reimbursable = tx.category === "reimbursable";

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="no-print flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back
        </button>
        <Link
          href="/categorizer"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Categorizer
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {tx.merchant}
        </h1>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {money.format(tx.amount)}
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {dateFmt.format(d)}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Category:{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {tx.category ?? "Uncategorized"}
          </span>
        </p>
        {tx.paymentMethodName ? (
          <p className="mt-1 text-sm text-zinc-500">
            Payment used:{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {tx.paymentMethodName}
            </span>
          </p>
        ) : null}
      </header>

      <section
        aria-labelledby="receipt-heading"
        className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        <h2
          id="receipt-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Receipt
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Upload a photo or screenshot. Files are stored in your Supabase{" "}
          <code className="text-[11px]">receipts</code> bucket.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload receipt image"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = "";
          }}
        />

        {tx.receiptImageUrl ? (
          <div className="mt-4 space-y-3">
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tx.receiptImageUrl}
                alt={`Receipt for ${tx.merchant}`}
                className="max-h-80 w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Replace image
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => void onRemove()}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="mt-4 flex w-full flex-col items-center rounded-xl border-2 border-dashed border-zinc-300 bg-white px-6 py-12 text-center transition hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 dark:hover:border-zinc-500"
          >
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {uploading ? "Uploading…" : "Upload image or screenshot"}
            </span>
            <span className="mt-1 text-xs text-zinc-500">
              PNG, JPG, or HEIC — max 2.5 MB
            </span>
          </button>
        )}

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {reimbursable ? (
        <section
          aria-labelledby="reimbursement-heading"
          className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
        >
          <h2
            id="reimbursement-heading"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Reimbursement
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Syncs with the Reports page. Marking as paid removes the expense from the unpaid
            list.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <ToggleRow
              label="Billed"
              pressed={tx.reimbursementBilled}
              onToggle={() =>
                void setReimbursementBilled(id, !tx.reimbursementBilled)
              }
            />
            <ToggleRow
              label="Paid"
              pressed={tx.reimbursementPaid}
              onToggle={() =>
                void setReimbursementPaid(id, !tx.reimbursementPaid)
              }
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  pressed,
  onToggle,
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700">
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={pressed}
        onClick={onToggle}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          pressed
            ? "bg-emerald-600 dark:bg-emerald-500"
            : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            pressed ? "left-7" : "left-1"
          }`}
        />
        <span className="sr-only">
          {label}: {pressed ? "on" : "off"}
        </span>
      </button>
    </div>
  );
}
