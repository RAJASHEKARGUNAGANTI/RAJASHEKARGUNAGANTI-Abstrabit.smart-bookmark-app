import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userEmail={user.email ?? ""} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Dashboard
          initialBookmarks={bookmarks ?? []}
          userId={user.id}
        />
      </main>
    </div>
  );
}
