import React from "react";

// Authed shell. Phase 3 replaces this with the responsive sidebar (lg:) /
// bottom-tab (<md) navigation mirroring mobile's MainTabs.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6">{children}</main>
  );
}
