import { TransactionsListClient } from "./TransactionsListClient";

export default function TransactionsListPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Receipt gallery
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          All transactions — open one to add or replace a receipt image.
        </p>
      </header>

      <TransactionsListClient />
    </div>
  );
}
