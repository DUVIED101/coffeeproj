import React from "react";
import { AppHeader } from "@/components/AppHeader";
import { MobileTabBar } from "@/components/AppNav";
import { ChatUnreadWatcher } from "@/components/ChatUnreadWatcher";
import { NotificationFeedWatcher } from "@/components/NotificationFeedWatcher";
import { QueryProvider } from "@/components/QueryProvider";

// Authed shell: sticky header with desktop nav (md+), bottom tab bar (<md)
// mirroring mobile's MainTabs. pb-20 keeps content clear of the tab bar.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <QueryProvider>
      <ChatUnreadWatcher />
      <NotificationFeedWatcher />
      <AppHeader />
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 pb-20 md:pb-6">
        {children}
      </main>
      <MobileTabBar />
    </QueryProvider>
  );
}
