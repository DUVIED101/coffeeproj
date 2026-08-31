"use client";

import React, { useEffect, useState } from "react";
import { setPlatform } from "@bystrobarista/core/platform";
import { initSupabase } from "@bystrobarista/core/config/supabase";
import { STABLE_STORAGE_KEY } from "@bystrobarista/core/config/authStorage";
import { initI18n } from "@bystrobarista/core/i18n";
import {
  registerAuthListener,
  useAuthStore,
} from "@bystrobarista/core/stores/authStore";
import { webPlatform } from "@/platform";
import { webStorage } from "@/platform/storage";
import { pickBrowserSupabaseHost } from "@/lib/supabaseHost";
import { AlertHost } from "@/components/AlertHost";

declare global {
  interface Window {
    __bbBootstrapped?: boolean;
  }
}

// Platform + supabase must be live before ANY core module call. Module-eval
// time of this client component is the earliest browser hook we have; the
// window flag guards against HMR re-evaluation (initSupabase throws on a
// second call by design).
if (typeof window !== "undefined" && !window.__bbBootstrapped) {
  window.__bbBootstrapped = true;
  setPlatform(webPlatform);
  initSupabase({
    url: pickBrowserSupabaseHost().url,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    storage: webStorage,
    storageKey: STABLE_STORAGE_KEY,
    // supabase-js reads the email-confirmation / magic-link hash on load.
    detectSessionInUrl: true,
    flowType: "pkce",
  });
  // Inside the guard, not the React effect: Strict Mode double-runs effects
  // in dev, and a second registerAuthListener would attach a duplicate
  // onAuthStateChange handler (double setSession / profile fetches).
  registerAuthListener();
}

export function Providers({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initI18n();
      void useAuthStore.getState().initialize();
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        aria-busy="true"
      />
    );
  }

  return (
    <>
      {children}
      <AlertHost />
    </>
  );
}
