import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-secondary px-4 py-10">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2.5 text-2xl font-bold text-primary"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-9 w-9 rounded-full" />
        БыстроБариста
      </Link>
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
