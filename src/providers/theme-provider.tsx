'use client';

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { usePreferences } from '@/contexts/preferences-context';

export { useTheme };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange={false}
      storageKey="fabriiq-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
