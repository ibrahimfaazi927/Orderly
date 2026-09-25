import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH: Update a category name
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");
  if (!isPlaceholder) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: category } = await supabase
      .from("categories")
      .select("restaurant_id")
      .eq("id", id)
      .single();

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("restaurant_members")
      .select("role")
      .eq("restaurant_id", category.restaurant_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to update category" }, { status: 400 });
  }

  return NextResponse.json({ category: data });
}

// DELETE: Remove a category and its items
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");
  if (!isPlaceholder) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: category } = await supabase
      .from("categories")
      .select("restaurant_id")
      .eq("id", id)
      .single();

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("restaurant_members")
      .select("role")
      .eq("restaurant_id", category.restaurant_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Delete associated menu items first (CASCADE should handle it but let's be explicit)
  await supabase.from("menu_items").delete().eq("category_id", id);

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to delete category" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
