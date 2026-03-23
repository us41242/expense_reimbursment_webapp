import { TransactionDetailClient } from "./TransactionDetailClient";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <header className="no-print">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Transaction
        </p>
      </header>
      <TransactionDetailClient id={id} />
    </div>
  );
}
