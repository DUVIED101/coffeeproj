import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// RSC root: authed users go straight to their home surface; everyone else
// sees the public landing (SEO-indexed, no client JS needed).
export default async function RootPage(): Promise<React.JSX.Element> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: row } = await supabase
      .from("users")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle();
    redirect(row?.account_type === "business" ? "/dashboard" : "/jobs");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold text-primary">БыстроБариста</h1>
      <p className="text-lg text-ink-secondary">
        Биржа смен для бариста и кофеен. Находите смены рядом, публикуйте
        вакансии, договаривайтесь в чате — всё в одном месте.
      </p>
      <div className="flex gap-4">
        <Link
          href="/auth/signup"
          className="rounded-card bg-primary px-6 py-3 font-medium text-white"
        >
          Зарегистрироваться
        </Link>
        <Link
          href="/auth/login"
          className="rounded-card border border-line px-6 py-3 font-medium text-ink"
        >
          Войти
        </Link>
      </div>
    </main>
  );
}
