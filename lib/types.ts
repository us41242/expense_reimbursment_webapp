export type ExpenseCategory =
  | "personal"
  | "reimbursable"
  | "non-reimbursable"
  | "research-needed";

export type PaymentMethod = {
  id: string;
  name: string;
  sortOrder: number;
};

export type Transaction = {
  id: string;
  amount: number;
  /** ISO date YYYY-MM-DD */
  date: string;
  merchant: string;
  category: ExpenseCategory | null;
  /** Path in Supabase `receipts` bucket */
  receiptStoragePath: string | null;
  /** Signed URL for display (short-lived) */
  receiptImageUrl: string | null;
  reimbursementBilled: boolean;
  reimbursementPaid: boolean;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  /** ISO timestamp — used for categorizer queue order */
  createdAt: string;
  notes?: string | null;
};

/** @deprecated Use receiptImageUrl / receiptStoragePath */
export function normalizeTransaction(raw: unknown): Transaction {
  const t = raw as Partial<Transaction> & { receiptImageDataUrl?: string };
  return {
    id: t.id ?? "",
    amount: typeof t.amount === "number" ? t.amount : 0,
    date: typeof t.date === "string" ? t.date : "",
    merchant: typeof t.merchant === "string" ? t.merchant : "",
    category: t.category ?? null,
    receiptStoragePath:
      typeof t.receiptStoragePath === "string" ? t.receiptStoragePath : null,
    receiptImageUrl:
      typeof t.receiptImageUrl === "string"
        ? t.receiptImageUrl
        : typeof t.receiptImageDataUrl === "string"
          ? t.receiptImageDataUrl
          : null,
    reimbursementBilled: Boolean(t.reimbursementBilled),
    reimbursementPaid: Boolean(t.reimbursementPaid),
    paymentMethodId:
      typeof t.paymentMethodId === "string" ? t.paymentMethodId : null,
    paymentMethodName:
      typeof t.paymentMethodName === "string" ? t.paymentMethodName : null,
    createdAt:
      typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
  };
}

/** Normalize amount for duplicate comparison (2 decimal places). */
export function normalizeAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Stable key for duplicate detection: same calendar date + amount + merchant. */
export function duplicateKey(date: string, amount: number, merchant: string): string {
  return `${date}|${normalizeAmount(amount)}|${merchant.trim().toLowerCase()}`;
}
