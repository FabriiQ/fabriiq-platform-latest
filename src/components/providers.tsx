'use client'

import { ThemeProvider } from 'next-themes'
import { ReactNode, useState } from 'react'
import { api } from '@/trpc/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import { batchFilterLink, loggingLink } from '@/utils/trpc-batch-filter'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000,
        retry: 1,
      },
    },
  }))

  const [trpcClient] = useState(() =>
    api.createClient({
      transformer: superjson,
      links: [
        // Add our custom batch filter link to filter out invalid procedures
        batchFilterLink(),

        // Add logging link for debugging (optional, can be removed in production)
        loggingLink(),

        // Standard HTTP batch link with extended timeout for bulk operations
        httpBatchLink({
          url: '/api/trpc',
          headers() {
            return {
              'Content-Type': 'application/json',
            };
          },
          fetch(url, options) {
            return fetch(url, {
              ...options,
              // Extend timeout for bulk operations (10 minutes for large datasets)
              signal: AbortSignal.timeout(600000),
            });
          },
        }),
      ],
    })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </api.Provider>
  )
}