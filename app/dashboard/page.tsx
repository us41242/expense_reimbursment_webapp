export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Overview of your spending and recent activity.
        </p>
      </header>

      <section
        aria-labelledby="expense-overview-heading"
        className="grid gap-4 sm:grid-cols-3"
      >
        <h2 id="expense-overview-heading" className="sr-only">
          Expense overview
        </h2>
        {[
          { label: "This month", value: "—", hint: "Total expenses" },
          { label: "Categories", value: "—", hint: "Active categories" },
          { label: "Pending", value: "—", hint: "To categorize" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{card.hint}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="recent-heading">
        <h2
          id="recent-heading"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
        >
          Recent transactions
        </h2>
        <p className="mt-2 rounded-lg border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Connect data or import receipts to see transactions here.
        </p>
      </section>
    </div>
  );
}
