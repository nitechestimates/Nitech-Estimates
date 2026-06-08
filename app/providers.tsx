"use client";

import React from "react";
import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { useStore } from "@/lib/store";

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps): React.JSX.Element {
  useEffect(() => {
    // Rehydrate the Zustand store on client mount to prevent server hydration mismatches
    (useStore as any).persist.rehydrate();
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}