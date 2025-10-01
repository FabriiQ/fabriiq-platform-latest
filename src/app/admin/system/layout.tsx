"use client";

import React from "react";
import { CurrencyProvider } from '@/contexts/currency-context';

export default function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CurrencyProvider>
      <div className="flex-1">
        {children}
      </div>
    </CurrencyProvider>
  );
}