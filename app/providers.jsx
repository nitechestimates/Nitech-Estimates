"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { useStore } from "@/lib/store";

export default function Providers({ children }) {
  useEffect(() => {
    // Rehydrate the Zustand store on client mount to prevent server hydration mismatches
    useStore.persist.rehydrate();
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}