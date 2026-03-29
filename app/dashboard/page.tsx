import { DashboardClient } from "./DashboardClient";
import SyncButton from "@/components/SyncButton";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ActiveTripBanner } from "./ActiveTripBanner";

export default function DashboardPage() {
  const userId = "2d71f2fb-d40b-4b29-89f3-f7e61ae8ce52";

  return (
    <div className="p-4 space-y-6">
      <ActiveTripBanner />
      <div className="flex flex-col-reverse md:flex-row justify-between items-center border-b pb-4 gap-4">
        <div className="flex w-full md:w-auto gap-2 flex-wrap">
          <Link 
            href="/trips/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Do you have work days to enter?
          </Link>
          <Link 
            href="/transactions/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Enter Transaction
          </Link>
          <SyncButton />
        </div>
        <h1 className="text-xl font-bold w-full md:w-auto text-right md:text-left text-zinc-500 uppercase tracking-wider text-sm">Expense Dashboard</h1>
      </div>

      <div className="py-2">
        <DashboardClient userId={userId} />
      </div>
    </div>
  );
}