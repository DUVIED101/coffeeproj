import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

// Root-level 404: rendered outside the authed (app) shell, so it carries its
// own minimal header like the legal layout does.
export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-primary"
          >
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              className="rounded-full"
              priority
            />
            БыстроБариста
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-secondary">
          Ошибка 404
        </p>
        <h1 className="text-3xl font-bold text-ink">Такой страницы нет</h1>
        <p className="max-w-md text-ink-secondary">
          Возможно, ссылка устарела или в адресе опечатка.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-card bg-primary px-6 py-3 font-medium text-white"
        >
          На главную
        </Link>
      </main>
    </div>
  );
}
