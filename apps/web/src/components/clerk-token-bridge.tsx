"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setTokenGetter } from "@/lib/auth-token";

// Renders nothing — just keeps lib/api.ts's module-level token getter in
// sync with Clerk's current session. See lib/auth-token.ts for why this
// indirection exists.
export function ClerkTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenGetter(getToken);
    return () => setTokenGetter(null);
  }, [getToken]);

  return null;
}
