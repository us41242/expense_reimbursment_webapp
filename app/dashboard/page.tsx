import { DashboardClient } from "./DashboardClient";
import LinkBankButton from "@/components/LinkBankButton";
import SyncButton from "@/components/SyncButton";

export default function DashboardPage() {
  const userId = "2d71f2fb-d40b-4b29-89f3-f7e61ae8ce52";

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-xl font-bold">Expense Dashboard</h1>
        <div className="flex gap-2">
          <LinkBankButton userId={userId} />
          <SyncButton />
        </div>
      </div>

      <div className="py-2">
        <DashboardClient userId={userId} />
      </div>
    </div>
  );
}