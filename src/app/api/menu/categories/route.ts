import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET all categories for the authenticated user's restaurant
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurant_id");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }

  return NextResponse.json({ categories: data });
}

// POST: Create a new category
export async function POST(request: Request) {
  const body = await request.json();

  if (!body.restaurant_id || !body.name?.trim()) {
    return NextResponse.json({ error: "restaurant_id and name are required" }, { status: 400 });
  }

  const supabase = await createClient();

  const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");
  if (!isPlaceholder) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("restaurant_members")
      .select("role")
      .eq("restaurant_id", body.restaurant_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permissions to manage categories for this restaurant" },
        { status: 403 }
      );
    }
  }

  // Get next sort_order
  const { count } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", body.restaurant_id);

  const { data, error } = await supabase
    .from("categories")
    .insert({
      restaurant_id: body.restaurant_id,
      name: body.name.trim(),
      sort_order: (count || 0) + 1,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to create category" }, { status: 400 });
  }

  return NextResponse.json({ category: data }, { status: 201 });
}
