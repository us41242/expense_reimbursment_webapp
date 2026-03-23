import { ReportsClient } from "./ReportsClient";

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Reports
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Unpaid reimbursable expenses, billing status, and printable export.
        </p>
      </header>

      <ReportsClient />
    </div>
  );
}
