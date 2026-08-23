"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      }),
  );

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <QueryClientProvider client={client}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "!rounded-lg !border !border-n-3 !bg-n-0 !text-n-11 !text-sm !font-sans",
              description: "!text-n-8",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
