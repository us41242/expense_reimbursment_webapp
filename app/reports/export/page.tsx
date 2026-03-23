import { ExportReportClient } from "./ExportReportClient";

export default function ExportReportPage() {
  return (
    <div className="space-y-6">
      <header className="no-print">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Export
        </p>
      </header>
      <ExportReportClient />
    </div>
  );
}
