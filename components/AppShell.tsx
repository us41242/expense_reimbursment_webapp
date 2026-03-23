import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <main className="min-h-full flex-1 overflow-auto bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
