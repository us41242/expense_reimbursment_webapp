import { CSVImporter } from "@/components/CSVImporter";
import { CategorizerView } from "./CategorizerView";

export default function CategorizerPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Categorizer
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          One transaction at a time — choose a category or swipe down to undo.
        </p>
      </header>

      <CSVImporter />

      <CategorizerView />
    </div>
  );
}
