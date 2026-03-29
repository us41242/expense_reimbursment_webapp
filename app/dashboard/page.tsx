import { DashboardClient } from "./DashboardClient";
import SyncButton from "@/components/SyncButton";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  const userId = "2d71f2fb-d40b-4b29-89f3-f7e61ae8ce52";

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-xl font-bold">Expense Dashboard</h1>
        <div className="flex gap-2">
          <Link 
            href="/transactions/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            Enter Transaction
          </Link>
          <SyncButton />
        </div>
      </div>

      <div className="py-2">
        <DashboardClient userId={userId} />
      </div>
    </div>
  );
}