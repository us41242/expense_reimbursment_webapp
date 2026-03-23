import { normalizeAmount } from "@/lib/types";

export type ParsedImportRow = {
  date: string;
  amount: number;
  merchant: string;
};

/** Minimal RFC-style CSV parser (quoted fields, commas). */
export function splitCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }
    if (!inQuotes && c === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  row.push(cur);
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }
  return rows;
}

function findColumnIndex(headers: string[], pattern: RegExp): number {
  return headers.findIndex((h) => pattern.test(h.trim()));
}

function parseDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (mdy) {
    const m = mdy[1]!.padStart(2, "0");
    const d = mdy[2]!.padStart(2, "0");
    return `${mdy[3]}-${m}-${d}`;
  }

  const t = Date.parse(v);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  return null;
}

function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "").trim();
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  if (Number.isNaN(n)) return null;
  return normalizeAmount(Math.abs(n));
}

const DATE_HEADER =
  /\b(transaction\s+date|post(ing)?\s*date|trans(fer)?\s*date|posted|date)\b/i;
const AMOUNT_HEADER =
  /\b(amount|debit|credit|withdrawal|deposit)\b/i;
const DESC_HEADER =
  /description|memo|payee|merchant|name|details|narrative|counterparty/i;

function parseRowsAsPositionFallback(rows: string[][]): ParsedImportRow[] {
  const out: ParsedImportRow[] = [];
  for (const cells of rows) {
    if (cells.length < 2) continue;
    const date = parseDate((cells[0] ?? "").trim());
    if (!date) continue;

    // First try the strict (Date, Amount, Merchant) pattern
    let amount = parseAmount((cells[1] ?? "").trim());
    let merchant = (cells[2]?.trim() ?? "") || "Unknown";

    // If cells[1] isn't a valid amount, try treating cells[2] as the amount (Date, Merchant, Amount)
    if (amount === null && cells.length >= 3) {
      const amountBackup = parseAmount((cells[2] ?? "").trim());
      if (amountBackup !== null) {
        amount = amountBackup;
        merchant = (cells[1]?.trim() ?? "") || "Unknown";
      }
    }

    if (amount === null) continue;
    out.push({ date, amount, merchant });
  }
  return out;
}

/**
 * Parse a bank-export CSV into import rows. Uses header row to map columns.
 * If headers are not recognized, treats each row as: date, amount, description (optional).
 */
export function parseBankCsv(text: string): ParsedImportRow[] {
  const rows = splitCsvRows(text);
  if (rows.length === 0) return [];

  const headerRow = rows[0]!.map((c) => c.trim());
  const dateIdx = findColumnIndex(headerRow, DATE_HEADER);
  const amountIdx = findColumnIndex(headerRow, AMOUNT_HEADER);
  let descIdx = findColumnIndex(headerRow, DESC_HEADER);

  if (dateIdx < 0 || amountIdx < 0) {
    return parseRowsAsPositionFallback(rows);
  }

  if (descIdx < 0) {
    descIdx = headerRow.findIndex((_, i) => i !== dateIdx && i !== amountIdx);
  }

  const dataRows = rows.slice(1);
  const out: ParsedImportRow[] = [];

  for (const cells of dataRows) {
    const dateRaw = cells[dateIdx]?.trim() ?? "";
    const amountRaw = cells[amountIdx]?.trim() ?? "";
    const merchant =
      descIdx >= 0
        ? (cells[descIdx]?.trim() ?? "Unknown")
        : "Unknown";

    const date = parseDate(dateRaw);
    const amount = parseAmount(amountRaw);
    if (!date || amount === null) continue;

    out.push({ date, amount, merchant: merchant || "Unknown" });
  }

  return out;
}
