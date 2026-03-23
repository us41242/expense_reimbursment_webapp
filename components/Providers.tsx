"use client";

import { TransactionProvider } from "@/context/TransactionContext";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <TransactionProvider>{children}</TransactionProvider>;
}
