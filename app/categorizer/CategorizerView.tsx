"use client";

import { useTransactions } from "@/context/TransactionContext";
import type { ExpenseCategory, Transaction } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CATEGORY_ACTIONS: { category: ExpenseCategory; label: string }[] = [
  { category: "personal", label: "Personal" },
  { category: "reimbursable", label: "Reimbursable" },
  { category: "non-reimbursable", label: "Non-Reimbursable" },
  { category: "research-needed", label: "Research Needed" },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

type Direction = 1 | -1;

function TransactionCard({ tx }: { tx: Transaction }) {
  const d = useMemo(() => new Date(tx.date + "T12:00:00"), [tx.date]);

  return (
    <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-zinc-200 bg-white px-8 py-10 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {tx.merchant}
      </p>
      <p className="mt-6 text-4xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
        {money.format(tx.amount)}
      </p>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        {dateFmt.format(d)}
      </p>
    </div>
  );
}

export function CategorizerView() {
  const {
    transactions,
    queueIds,
    setCategory,
    clearCategory,
    hydrated,
    configMissing,
    signedIn,
  } = useTransactions();

  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [direction, setDirection] = useState<Direction>(1);
  const pendingFocusRef = useRef<string | null>(null);

  const currentId = queueIds[index];
  const current = useMemo(
    () =>
      currentId ? transactions.find((t) => t.id === currentId) ?? null : null,
    [transactions, currentId],
  );

  const done = queueIds.length === 0 || index >= queueIds.length;

  useEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) return;
    pendingFocusRef.current = null;
    const idx = queueIds.indexOf(id);
    if (idx >= 0) setIndex(idx);
  }, [queueIds]);

  const advance = useCallback(
    (cat: ExpenseCategory) => {
      const id = queueIds[index];
      if (!id) return;
      setDirection(1);
      setHistory((h) => [...h, id]);
      void setCategory(id, cat);
    },
    [queueIds, index, setCategory],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const id = h[h.length - 1]!;
      setDirection(-1);
      void clearCategory(id);
      pendingFocusRef.current = id;
      return h.slice(0, -1);
    });
  }, [clearCategory]);

  const canUndo = history.length > 0;

  if (!hydrated) {
    return (
      <div className="flex min-h-[min(52vh,420px)] items-center justify-center text-sm text-zinc-500">
        Loading transactions…
      </div>
    );
  }

  if (configMissing) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        Add Supabase URL and anon key to <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.local</code> to load transactions from the cloud.
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
        <p>Sign in to load and categorize your transactions.</p>
        <Link
          href="/login"
          className="mt-3 inline-block font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col">
      <motion.div
        className="relative flex min-h-[min(52vh,420px)] flex-1 flex-col items-center justify-center px-2"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.35 }}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.y > 72 && canUndo) {
            undo();
          }
        }}
        style={{ touchAction: "none" }}
      >
        <p className="absolute top-0 left-1/2 -translate-x-1/2 text-center text-xs text-zinc-400 dark:text-zinc-500">
          {canUndo ? "Swipe down to undo" : ""}
        </p>

        <div className="relative flex min-h-[280px] w-full max-w-md items-center justify-center">
          <AnimatePresence
            mode="wait"
            custom={direction}
            initial={false}
          >
            {current ? (
              <motion.div
                key={current.id}
                custom={direction}
                variants={{
                  initial: (dir: Direction) => ({
                    y: dir > 0 ? 320 : -320,
                    opacity: 0,
                  }),
                  animate: { y: 0, opacity: 1 },
                  exit: (dir: Direction) => ({
                    y: dir > 0 ? -320 : 320,
                    opacity: 0,
                  }),
                }}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute w-full max-w-md"
              >
                <TransactionCard tx={current} />
                <p className="mt-4 text-center">
                  <Link
                    href={`/transactions/${current.id}`}
                    className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Receipt &amp; details
                  </Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="all-done"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="absolute w-full max-w-md rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-8 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/50"
              >
                <p className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
                  You&apos;re all caught up
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  No more transactions to categorize right now.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="mt-auto grid w-full max-w-2xl grid-cols-2 gap-3 pb-2 sm:mx-auto sm:grid-cols-4 sm:gap-3">
        {CATEGORY_ACTIONS.map(({ category, label }) => (
          <button
            key={category}
            type="button"
            disabled={done}
            onClick={() => advance(category)}
            className="rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-4 text-center text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
