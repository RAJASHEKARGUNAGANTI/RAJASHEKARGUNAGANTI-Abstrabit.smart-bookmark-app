import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { url, title, description } = await request.json();

  if (!url || !title) {
    return NextResponse.json(
      { error: "URL and title are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({ 
      user_id: user.id, 
      url, 
      title,
      description: description || null
    })
    .select()
    .single();

  if (error) {
    console.error("Insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id, url, title, description } = await request.json();

  if (!id || !url || !title) {
    return NextResponse.json(
      { error: "ID, URL, and title are required" },
      { status: 400 }
    );
  }

  console.log("PATCH Request:", { id, url, title, description, userId: user.id });

  // First, check if bookmark exists
  const { data: checkData, error: checkError } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("id", id);

  console.log("Bookmark check:", { checkData, checkError });

  // Now try to update
  const { data, error, count } = await supabase
    .from("bookmarks")
    .update({ 
      url, 
      title,
      description: description || null
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select();

  console.log("Update result:", { data, error, count, dataLength: data?.length });

  if (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check if any rows were updated
  if (!data || data.length === 0) {
    console.log("No rows updated. Bookmark might not exist or user doesn't have permission.");
    return NextResponse.json(
      { 
        error: "Bookmark not found or you don't have permission to edit it",
        debug: {
          requestedId: id,
          userId: user.id,
          bookmarkExists: !!checkData && checkData.length > 0,
          bookmarkUserId: checkData && checkData.length > 0 ? checkData[0].user_id : null
        }
      },
      { status: 404 }
    );
  }

  // Return the first (and should be only) updated bookmark
  return NextResponse.json(data[0]);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json(
      { error: "Bookmark ID is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}