"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { ConsentModal } from "@/components/compliance/ConsentModal";
import { CookieBanner } from "@/components/compliance/CookieBanner";
import { PolicyAcceptance } from "@/components/compliance/PolicyAcceptance";
import { api } from "@/utils/api";

function ConsentGate({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id as string | undefined;
  const [open, setOpen] = useState(false);

  const { data } = api.consent.getStatus.useQuery(
    { dataCategories: ["essential"] },
    { enabled: Boolean(userId) }
  );

  useEffect(() => {
    if (!userId) return;
    const hasEssential = data?.status?.some((s: any) => s.dataCategory === "essential" && s.consentGiven);
    setOpen(!hasEssential);
  }, [userId, data]);

  return (
    <>
      {children}
      <ConsentModal open={open} onClose={() => setOpen(false)} />
      <CookieBanner />
      <PolicyAcceptance />
    </>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ConsentGate>{children}</ConsentGate>
    </SessionProvider>
  );
}