"use client";

import { createClient } from "@/lib/supabase/client";
import {
  mapPaymentMethodRow,
  mapRowsToTransactions,
  type TransactionRowDb,
} from "@/lib/mapTransaction";
import type { ExpenseCategory, PaymentMethod, Transaction } from "@/lib/types";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TransactionContextValue = {
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  hydrated: boolean;
  /** Supabase env not set in .env.local */
  configMissing: boolean;
  /** Logged in */
  signedIn: boolean;
  userEmail: string | null;
  queueIds: string[];
  refresh: () => Promise<void>;
  addTransactions: (
    rows: { date: string; amount: number; merchant: string }[],
    paymentMethodId: string,
  ) => Promise<{ error: string | null }>;
  setCategory: (
    id: string,
    category: ExpenseCategory,
  ) => Promise<{ error: string | null }>;
  clearCategory: (id: string) => Promise<{ error: string | null }>;
  uploadReceiptImage: (id: string, file: File) => Promise<{ error: string | null }>;
  removeReceiptImage: (id: string) => Promise<{ error: string | null }>;
  setReimbursementBilled: (
    id: string,
    value: boolean,
  ) => Promise<{ error: string | null }>;
  setReimbursementPaid: (
    id: string,
    value: boolean,
  ) => Promise<{ error: string | null }>;
  batchUpdateReimbursements: (
    ids: string[],
    patch: { reimbursement_billed?: boolean; reimbursement_paid?: boolean },
  ) => Promise<{ error: string | null }>;
  setTransactionNote: (id: string, note: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const configMissing =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL !== "string" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "string" ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setHydrated(true);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSignedIn(false);
      setUserEmail(null);
      setTransactions([]);
      setPaymentMethods([]);
      setHydrated(true);
      return;
    }

    setSignedIn(true);
    setUserEmail(user.email ?? null);

    const [pmRes, txRes] = await Promise.all([
      supabase
        .from("payment_methods")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("transactions")
        .select(
          `
          *,
          payment_methods ( id, name )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (pmRes.data) {
      setPaymentMethods(pmRes.data.map(mapPaymentMethodRow));
    } else {
      setPaymentMethods([]);
    }

    if (txRes.data) {
      const mapped = await mapRowsToTransactions(
        supabase,
        txRes.data as TransactionRowDb[],
      );
      setTransactions(mapped);
    } else {
      setTransactions([]);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (configMissing) {
      startTransition(() => setHydrated(true));
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      startTransition(() => setHydrated(true));
      return;
    }

    queueMicrotask(() => {
      void refresh();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      queueMicrotask(() => {
        void refresh();
      });
    });

    return () => subscription.unsubscribe();
  }, [configMissing, refresh]);

  const queueIds = useMemo(() => {
    return transactions
      .filter((t) => t.category === null || t.category === "research-needed")
      .sort((a, b) => {
        // Sort by date first (oldest to newest)
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return dateCmp;
        // Fallback to createdAt
        return a.createdAt.localeCompare(b.createdAt);
      })
      .map((t) => t.id);
  }, [transactions]);

  const addTransactions = useCallback(
    async (
      rows: { date: string; amount: number; merchant: string }[],
      paymentMethodId: string,
    ) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase is not configured." };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: "Sign in to import transactions." };

      const payload = rows.map((r) => ({
        user_id: user.id,
        amount: r.amount,
        date: r.date,
        merchant: r.merchant,
        category: null as string | null,
        reimbursement_billed: false,
        reimbursement_paid: false,
        payment_method_id: paymentMethodId,
      }));

      const { error } = await supabase.from("transactions").insert(payload);
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const setCategory = useCallback(
    async (id: string, category: ExpenseCategory) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase is not configured." };
      const patch: Record<string, unknown> = {
        category,
        updated_at: new Date().toISOString(),
      };
      if (category !== "reimbursable") {
        patch.reimbursement_billed = false;
        patch.reimbursement_paid = false;
      }
      const { error } = await supabase
        .from("transactions")
        .update(patch)
        .eq("id", id);
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const clearCategory = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase is not configured." };
      const { error } = await supabase
        .from("transactions")
        .update({
          category: null,
          reimbursement_billed: false,
          reimbursement_paid: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const uploadReceiptImage = useCallback(
    async (id: string, file: File) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase is not configured." };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: "Sign in required." };

      const current = transactions.find((t) => t.id === id);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ["png", "jpg", "jpeg", "webp", "gif", "heic"].includes(ext)
        ? ext === "jpeg"
          ? "jpg"
          : ext
        : "jpg";
      const path = `${user.id}/${id}/${Date.now()}.${safeExt}`;

      if (current?.receiptStoragePath) {
        await supabase.storage
          .from("receipts")
          .remove([current.receiptStoragePath]);
      }

      const { error: upErr } = await supabase.storage
        .from("receipts")
        .upload(path, file, { upsert: false });

      if (upErr) return { error: upErr.message };

      const { error: dbErr } = await supabase
        .from("transactions")
        .update({
          receipt_storage_path: path,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (dbErr) return { error: dbErr.message };
      await refresh();
      return { error: null };
    },
    [transactions, refresh],
  );

  const removeReceiptImage = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase is not configured." };
      const current = transactions.find((t) => t.id === id);
      if (current?.receiptStoragePath) {
        await supabase.storage
          .from("receipts")
          .remove([current.receiptStoragePath]);
      }
      const { error } = await supabase
        .from("transactions")
        .update({
          receipt_storage_path: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [transactions, refresh],
  );

  const setReimbursementBilled = useCallback(
    async (id: string, value: boolean) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase is not configured." };
      const { error } = await supabase
        .from("transactions")
        .update({
          reimbursement_billed: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const setReimbursementPaid = useCallback(
    async (id: string, value: boolean) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase is not configured." };
      const { error } = await supabase
        .from("transactions")
        .update({
          reimbursement_paid: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const batchUpdateReimbursements = useCallback(
    async (
      ids: string[],
      patch: { reimbursement_billed?: boolean; reimbursement_paid?: boolean },
    ) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase is not configured." };
      const { error } = await supabase
        .from("transactions")
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const setTransactionNote = useCallback(async (id: string, note: string) => {
    const supabase = createClient();
    if (!supabase) return { error: "Supabase is not configured." };
    const { error } = await supabase
      .from("transactions")
      .update({
        notes: note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  }, [refresh]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      transactions,
      paymentMethods,
      hydrated,
      configMissing,
      signedIn,
      userEmail,
      queueIds,
      refresh,
      addTransactions,
      setCategory,
      clearCategory,
      uploadReceiptImage,
      removeReceiptImage,
      setReimbursementBilled,
      setReimbursementPaid,
      batchUpdateReimbursements,
      setTransactionNote,
      signOut,
    }),
    [
      transactions,
      paymentMethods,
      hydrated,
      configMissing,
      signedIn,
      userEmail,
      queueIds,
      refresh,
      addTransactions,
      setCategory,
      clearCategory,
      uploadReceiptImage,
      removeReceiptImage,
      setReimbursementBilled,
      setReimbursementPaid,
      batchUpdateReimbursements,
      setTransactionNote,
      signOut,
    ],
  );

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) {
    throw new Error("useTransactions must be used within TransactionProvider");
  }
  return ctx;
}
