import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET menu items with optional restaurant_id and category_id filters
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurant_id");
  const categoryId = searchParams.get("category_id");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to load menu items" }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}

// POST: Create a new menu item
export async function POST(request: Request) {
  const body = await request.json();

  if (!body.restaurant_id || !body.category_id || !body.name?.trim()) {
    return NextResponse.json(
      { error: "restaurant_id, category_id, and name are required" },
      { status: 400 }
    );
  }

  if (body.price === undefined || Number(body.price) < 0) {
    return NextResponse.json({ error: "A valid price is required" }, { status: 400 });
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
        { error: "Forbidden: You do not have permissions to manage menu items for this restaurant" },
        { status: 403 }
      );
    }
  }

  const { count } = await supabase
    .from("menu_items")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", body.restaurant_id);

  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      restaurant_id: body.restaurant_id,
      category_id: body.category_id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      image_url: body.image_url?.trim() || null,
      price: Number(body.price),
      tax_rate: body.tax_rate !== undefined ? Number(body.tax_rate) : 5.0,
      is_available: body.is_available !== undefined ? body.is_available : true,
      dietary_type: body.dietary_type || "VEG",
      sort_order: (count || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to create item" }, { status: 400 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
