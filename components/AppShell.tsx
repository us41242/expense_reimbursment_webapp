import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-32 pb-12">
        <div className="mx-auto max-w-6xl px-4 md:px-6">{children}</div>
      </main>
    </div>
  );
}
