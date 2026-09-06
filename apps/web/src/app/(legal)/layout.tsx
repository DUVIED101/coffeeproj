import Link from "next/link";
import React from "react";

// Public shell for the four legal documents. They must be readable BEFORE
// signing up — the consent checkboxes on /auth/signup link straight here —
// so this layout deliberately sits outside the authed (app) shell and needs
// no session.
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-4">
          <Link href="/" className="text-lg font-bold text-primary">
            БыстроБариста
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
