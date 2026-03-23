import { CSVImporter } from "@/components/CSVImporter";
import { UncategorizedView } from "./UncategorizedView";

export default function UncategorizedPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="hidden md:block mb-4">
        <CSVImporter />
      </div>

      <UncategorizedView />
    </div>
  );
}
