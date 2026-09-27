import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoMenuItems, saveDemoMenuItem } from "@/lib/server-demo-store";

const isUUID = (str: any) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

// GET menu items with optional restaurant_id and category_id filters
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurant_id");
  const categoryId = searchParams.get("category_id");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });
  }

  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  if (isPlaceholder) {
    let items = getDemoMenuItems(restaurantId);
    if (categoryId) {
      items = items.filter((i) => i.category_id === categoryId);
    }
    return NextResponse.json({ items });
  }

  const admin = createAdminClient();

  // Resolve restaurant UUID if needed
  let targetRestId = restaurantId;
  if (!isUUID(restaurantId)) {
    const { data: rest } = await admin
      .from("restaurants")
      .select("id")
      .ilike("slug", restaurantId)
      .maybeSingle();
    if (rest?.id) targetRestId = rest.id;
  }

  let query = admin
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", targetRestId)
    .order("sort_order", { ascending: true });

  if (categoryId && isUUID(categoryId)) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to load menu items" }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
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

  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  if (isPlaceholder) {
    const existing = getDemoMenuItems(body.restaurant_id);
    const newItem = {
      id: body.id || `item-${Date.now()}`,
      restaurant_id: body.restaurant_id,
      category_id: body.category_id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      image_url: body.image_url?.trim() || null,
      price: Number(body.price),
      tax_rate: body.tax_rate !== undefined ? Number(body.tax_rate) : 5.0,
      is_available: body.is_available !== undefined ? body.is_available : true,
      dietary_type: body.dietary_type || "VEG",
      sort_order: existing.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveDemoMenuItem(newItem as any);
    return NextResponse.json({ item: newItem }, { status: 201 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Resolve authoritative restaurant UUID
  let resolvedRestId: string | null = null;
  if (isUUID(body.restaurant_id)) {
    const { data: rest } = await admin
      .from("restaurants")
      .select("id")
      .eq("id", body.restaurant_id)
      .maybeSingle();
    if (rest?.id) resolvedRestId = rest.id;
  }

  if (!resolvedRestId) {
    const cleanSlug = String(body.restaurant_id).toLowerCase().replace(/[^a-z0-9-]/g, "");
    const { data: restBySlug } = await admin
      .from("restaurants")
      .select("id")
      .ilike("slug", cleanSlug)
      .maybeSingle();
    if (restBySlug?.id) resolvedRestId = restBySlug.id;
  }

  if (!resolvedRestId) {
    const { data: userMembership } = await admin
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (userMembership?.restaurant_id) {
      resolvedRestId = userMembership.restaurant_id;
    }
  }

  if (!resolvedRestId) {
    return NextResponse.json(
      { error: `Restaurant "${body.restaurant_id}" could not be resolved. Please complete onboarding first.` },
      { status: 400 }
    );
  }

  // Resolve authoritative category UUID
  let resolvedCatId: string | null = null;
  if (isUUID(body.category_id)) {
    const { data: cat } = await admin
      .from("categories")
      .select("id")
      .eq("id", body.category_id)
      .eq("restaurant_id", resolvedRestId)
      .maybeSingle();
    if (cat?.id) resolvedCatId = cat.id;
  }

  if (!resolvedCatId) {
    // Try matching category by name
    const { data: catByName } = await admin
      .from("categories")
      .select("id")
      .eq("restaurant_id", resolvedRestId)
      .ilike("name", String(body.category_id).trim())
      .maybeSingle();
    if (catByName?.id) resolvedCatId = catByName.id;
  }

  if (!resolvedCatId) {
    // Try any active category for this restaurant
    const { data: anyCat } = await admin
      .from("categories")
      .select("id")
      .eq("restaurant_id", resolvedRestId)
      .limit(1)
      .maybeSingle();
    if (anyCat?.id) resolvedCatId = anyCat.id;
  }

  if (!resolvedCatId) {
    return NextResponse.json(
      { error: "Please create at least one category before adding menu items" },
      { status: 400 }
    );
  }

  // Check/ensure membership
  let { data: membership } = await admin
    .from("restaurant_members")
    .select("role")
    .eq("restaurant_id", resolvedRestId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    const { error: linkErr } = await admin.from("restaurant_members").upsert(
      {
        restaurant_id: resolvedRestId,
        user_id: user.id,
        role: "OWNER",
      },
      { onConflict: "restaurant_id,user_id" }
    );
    if (linkErr) {
      console.error("[Items API] Failed to link owner:", linkErr);
      return NextResponse.json(
        { error: "Failed to establish restaurant ownership: " + linkErr.message },
        { status: 403 }
      );
    }
    membership = { role: "OWNER" };
  }

  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permissions to manage menu items for this restaurant" },
      { status: 403 }
    );
  }

  const { count } = await admin
    .from("menu_items")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", resolvedRestId);

  const { data: newItem, error: insertError } = await admin
    .from("menu_items")
    .insert({
      restaurant_id: resolvedRestId,
      category_id: resolvedCatId,
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

  if (insertError || !newItem) {
    console.error("[Items API] Insert item error:", insertError);
    return NextResponse.json(
      { error: insertError?.message || "Failed to create menu item in database" },
      { status: 400 }
    );
  }

  return NextResponse.json({ item: newItem }, { status: 201 });
}
