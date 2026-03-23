import type { ParsedImportRow } from "@/lib/csvParser";
import type { Transaction } from "@/lib/types";
import { duplicateKey } from "@/lib/types";

/**
 * Split parsed CSV rows into duplicates (same date+amount as existing or repeated in file)
 * vs rows that are unique against the current store.
 */
export function partitionImportRows(
  rows: ParsedImportRow[],
  existing: Transaction[],
): { duplicateRows: ParsedImportRow[]; uniqueRows: ParsedImportRow[] } {
  const keys = new Set(
    existing.map((t) => duplicateKey(t.date, t.amount)),
  );
  const seenInImport = new Set<string>();
  const duplicateRows: ParsedImportRow[] = [];
  const uniqueRows: ParsedImportRow[] = [];

  for (const row of rows) {
    const key = duplicateKey(row.date, row.amount);
    if (keys.has(key) || seenInImport.has(key)) {
      duplicateRows.push(row);
    } else {
      uniqueRows.push(row);
    }
    seenInImport.add(key);
  }

  return { duplicateRows, uniqueRows };
}
