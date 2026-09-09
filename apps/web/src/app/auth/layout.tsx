import Image from "next/image";
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
        <Image
          src="/logo.png"
          alt=""
          width={36}
          height={36}
          className="rounded-full"
          priority
        />
        БыстроБариста
      </Link>
      <main className="w-full max-w-md rounded-card bg-white p-6 shadow-sm">
        {children}
      </main>
    </div>
  );
}
