"use client";

import { useTransactions } from "@/context/TransactionContext";
import type { ExpenseCategory, Transaction } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CATEGORY_ACTIONS: { category: ExpenseCategory; label: string }[] = [
  { category: "reimbursable", label: "Reimbursable Expenses" },
  { category: "non-reimbursable", label: "EPIC Business Expenses" },
  { category: "personal", label: "Personal Expenses" },
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

  const bgImage = useMemo(() => {
    const isWireTransfer = 
      tx.notes?.includes("[Advance Payment]") || 
      tx.merchant.startsWith("Payout from") ||
      tx.merchant.toLowerCase().includes("direct deposit") ||
      tx.merchant.toLowerCase().includes("transfer");

    if (isWireTransfer) {
      return '/cards/Wire Transfer Icon.png';
    }

    const name = tx.paymentMethodName?.toLowerCase() || '';
    if (name.includes('costco') || name.includes('citi')) {
      return '/cards/Citi Costco.png';
    }
    if (name.includes('debit') || name.includes('bus complete chk') || name.includes('chk')) {
      return '/cards/Chase Business Debit.png';
    }
    if (name.includes('sav') || name.includes('total sav')) {
      return '/cards/Chase Business Savings.png';
    }
    if (name.includes('ink')) {
      return '/cards/Chase Ink.png';
    }
    return '/blue-card.png';
  }, [tx.paymentMethodName, tx.notes, tx.merchant]);

  return (
    <div className="relative flex w-full max-w-[400px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-zinc-900 shadow-[0_0_15px_rgba(255,255,255,0.3)] dark:border-white/20 dark:shadow-[0_0_15px_rgba(255,255,255,0.15)] aspect-[1.586/1]">

      {/* Card Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('${bgImage}')`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Semi-transparent Overlay */}
      <div className="absolute inset-0 z-0 bg-zinc-900/50 dark:bg-black/60" />

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-6">
        <p className="text-sm font-medium text-white/90 drop-shadow-sm">
          {dateFmt.format(d)}
        </p>
        {(() => {
          const pmName = (tx.paymentMethodName || '').toLowerCase();
          const isDepository = pmName.includes('chk') || pmName.includes('debit') || pmName.includes('sav');
          const isCredit = isDepository ? tx.amount > 0 : tx.amount < 0;

          return (
            <p className={`mt-1 text-5xl font-bold tabular-nums tracking-tight drop-shadow-md ${isCredit ? 'text-emerald-400' : 'text-white'}`}>
              {isCredit && <span className="text-xl mr-2 text-emerald-300 uppercase tracking-widest">(Credit)</span>}
              {money.format(Math.abs(tx.amount))}
            </p>
          );
        })()}
        <p className="mt-4 text-center text-sm font-medium tracking-wide text-white/90 drop-shadow-sm">
          {tx.merchant}
        </p>
      </div>
    </div>
  );
}

export function UncategorizedView() {
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

  const currentTheme = useMemo(() => {
    if (!current) return "border-white/20 bg-zinc-900/80 shadow-[0_0_15px_rgba(255,255,255,0.1)] text-white";
    const name = current.paymentMethodName?.toLowerCase() || '';
    if (name.includes('costco') || name.includes('citi')) {
      // Costco Citi: Glass black, red border, red glow
      return "border-red-600/50 bg-black/70 shadow-[0_0_8px_rgba(220,38,38,0.25)] hover:border-red-500/80 hover:bg-black/90 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] text-red-50";
    }
    // Default / Chase Ink: Glass black, blue border, blue glow (#03012B)
    return "border-[#03012B]/80 bg-black/70 shadow-[0_0_15px_rgba(3,1,43,0.6)] hover:border-[#03012B] hover:bg-black/90 hover:shadow-[0_0_30px_rgba(3,1,43,0.9)] text-blue-50";
  }, [current]);

  const done = queueIds.length === 0 || index >= queueIds.length;

  useEffect(() => {
    const id = pendingFocusRef.current;
    if (id) {
      pendingFocusRef.current = null;
      const idx = queueIds.indexOf(id);
      if (idx >= 0) setIndex(idx);
    } else {
      setIndex((curr) => {
        if (queueIds.length === 0) return 0;
        if (curr >= queueIds.length) return 0; // wrap back to start of skipped items
        return curr;
      });
    }
  }, [queueIds]);

  const advance = useCallback(
    (cat: ExpenseCategory) => {
      const id = queueIds[index];
      if (!id) return;
      setDirection(1);
      setHistory((h) => [...h, id]);
      void setCategory(id, cat);
      if (cat === "research-needed") {
        setIndex((i) => i + 1);
      }
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

  const skipForward = useCallback(() => {
    if (index < queueIds.length - 1) {
      setDirection(1);
      setIndex((i) => i + 1);
    }
  }, [index, queueIds.length]);

  const skipBackward = useCallback(() => {
    if (index > 0) {
      setDirection(-1);
      setIndex((i) => i - 1);
    }
  }, [index]);

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
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col items-center justify-start gap-10 pt-4 pb-4">

      {/* Top half: Swiping Card */}
      <motion.div
        className="flex w-full flex-col items-center px-1.5 md:px-4"
        drag
        dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
        dragElastic={0.35}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          const { x, y } = info.offset;
          if (Math.abs(x) > Math.abs(y)) {
            if (x > 72) skipForward();
            else if (x < -72) skipBackward();
          } else {
            if (y > 72 && canUndo) undo();
          }
        }}
        style={{ touchAction: "none" }}
      >
        <div className="relative h-[300px] w-full max-w-[420px]">
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
                    x: dir > 0 ? 300 : -300,
                    opacity: 0,
                    rotate: dir > 0 ? 10 : -10
                  }),
                  animate: { x: 0, opacity: 1, rotate: 0 },
                  exit: (dir: Direction) => ({
                    x: dir > 0 ? -300 : 300,
                    opacity: 0,
                    rotate: dir > 0 ? -10 : 10
                  }),
                }}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                className="absolute inset-0 flex flex-col items-center justify-start pt-2"
              >
                <p className="mb-2 w-full text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 opacity-60">
                  Swipe right to skip
                  {canUndo ? " • down to undo" : ""}
                </p>

                <TransactionCard tx={current} />

                <p className="mt-3 text-center">
                  <Link
                    href={`/transactions/${current.id}`}
                    className="text-[13px] font-semibold text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Add Receipt | Split Charges
                  </Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="all-done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="absolute inset-x-0 top-10 mx-auto w-full max-w-[320px] rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-8 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/50"
              >
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                  <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  All caught up!
                </p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Inbox zero achieved.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom half: Buttons */}
      <div className="grid w-full max-w-[420px] grid-cols-1 gap-3 px-3 pb-2 sm:px-0">
        {CATEGORY_ACTIONS.map(({ category, label }) => (
          <button
            key={category}
            type="button"
            disabled={done}
            onClick={() => advance(category)}
            className={`flex flex-col min-h-[60px] sm:min-h-[70px] items-center justify-center rounded-2xl border-[0.5px] p-2 text-center text-[15px] leading-tight tracking-[0.25em] font-bold backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:active:scale-100 ${currentTheme}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
