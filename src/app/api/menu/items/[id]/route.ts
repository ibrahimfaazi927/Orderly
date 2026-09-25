import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH: Update a menu item
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

    const { data: item } = await supabase
      .from("menu_items")
      .select("restaurant_id")
      .eq("id", id)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("restaurant_members")
      .select("role")
      .eq("restaurant_id", item.restaurant_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.image_url !== undefined) updates.image_url = body.image_url?.trim() || null;
  if (body.price !== undefined) updates.price = Number(body.price);
  if (body.tax_rate !== undefined) updates.tax_rate = Number(body.tax_rate);
  if (body.category_id !== undefined) updates.category_id = body.category_id;
  if (body.is_available !== undefined) updates.is_available = body.is_available;
  if (body.dietary_type !== undefined) updates.dietary_type = body.dietary_type;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("menu_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to update item" }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}

// DELETE: Remove a menu item
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

    const { data: item } = await supabase
      .from("menu_items")
      .select("restaurant_id")
      .eq("id", id)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("restaurant_members")
      .select("role")
      .eq("restaurant_id", item.restaurant_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to delete item" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
