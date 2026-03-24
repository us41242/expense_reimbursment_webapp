import type { ParsedImportRow } from "@/lib/csvParser";
import type { Transaction } from "@/lib/types";
import { duplicateKey } from "@/lib/types";

/**
 * Split parsed CSV rows into duplicates (same date+amount as existing)
 * vs rows that are unique against the current store.
 */
export function partitionImportRows(
  rows: ParsedImportRow[],
  existing: Transaction[],
): { duplicateRows: ParsedImportRow[]; uniqueRows: ParsedImportRow[] } {
  // Count how many times each key appears in the DB so we don't inaccurately identify 
  // multiple recurring CSV items as duplicates if they are actually new.
  const existingCounts = new Map<string, number>();
  for (const t of existing) {
    const key = duplicateKey(t.date, t.amount, t.merchant);
    existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
  }

  const duplicateRows: ParsedImportRow[] = [];
  const uniqueRows: ParsedImportRow[] = [];

  for (const row of rows) {
    const key = duplicateKey(row.date, row.amount, row.merchant);
    const count = existingCounts.get(key) || 0;
    
    if (count > 0) {
      // It matches an existing transaction in the DB
      duplicateRows.push(row);
      // Consume one of the DB occurrences so if the CSV has another of the same,
      // and the DB doesn't have a second one, the next one from CSV will be considered unique
      existingCounts.set(key, count - 1);
    } else {
      uniqueRows.push(row);
    }
  }

  return { duplicateRows, uniqueRows };
}
