import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExpenseCategory, PaymentMethod, Transaction } from "@/lib/types";

export type TransactionRowDb = {
  id: string;
  teller_id?: string | null;
  user_id: string;
  amount: number;
  date: string;
  merchant: string;
  category: string | null;
  receipt_storage_path: string | null;
  reimbursement_billed: boolean;
  reimbursement_paid: boolean;
  payment_method_id: string | null;
  payment_methods: { id: string; name: string } | null;
  created_at: string;
  notes?: string | null;
};

export async function mapRowsToTransactions(
  supabase: SupabaseClient,
  rows: TransactionRowDb[],
): Promise<Transaction[]> {
  return Promise.all(rows.map((row) => mapRowToTransaction(supabase, row)));
}

async function mapRowToTransaction(
  supabase: SupabaseClient,
  row: TransactionRowDb,
): Promise<Transaction> {
  let receiptImageUrl: string | null = null;
  if (row.receipt_storage_path) {
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(row.receipt_storage_path, 3600);
    if (!error && data?.signedUrl) {
      receiptImageUrl = data.signedUrl;
    }
  }

  const category = row.category as ExpenseCategory | null;

  return {
    id: row.id,
    amount: Number(row.amount),
    date: row.date,
    merchant: row.merchant,
    category: category && isExpenseCategory(category) ? category : null,
    receiptStoragePath: row.receipt_storage_path,
    receiptImageUrl,
    reimbursementBilled: row.reimbursement_billed,
    reimbursementPaid: row.reimbursement_paid,
    paymentMethodId: row.payment_method_id,
    paymentMethodName: row.payment_methods?.name ?? null,
    createdAt: row.created_at,
    notes: row.notes ?? null,
  };
}

function isExpenseCategory(c: string): c is ExpenseCategory {
  return (
    c === "personal" ||
    c === "reimbursable" ||
    c === "non-reimbursable" ||
    c === "research-needed"
  );
}

export function mapPaymentMethodRow(row: {
  id: string;
  name: string;
  sort_order: number;
}): PaymentMethod {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  };
}
