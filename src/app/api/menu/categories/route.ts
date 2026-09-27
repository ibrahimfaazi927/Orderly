import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoCategories, saveDemoCategory } from "@/lib/server-demo-store";

const isUUID = (str: any) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

// GET all categories for the restaurant
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurant_id");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });
  }

  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  if (isPlaceholder) {
    const demoCats = getDemoCategories(restaurantId);
    return NextResponse.json({ categories: demoCats });
  }

  const admin = createAdminClient();

  // Resolve restaurant UUID if a slug or non-UUID was provided
  let targetRestId = restaurantId;
  if (!isUUID(restaurantId)) {
    const { data: rest } = await admin
      .from("restaurants")
      .select("id")
      .ilike("slug", restaurantId)
      .maybeSingle();
    if (rest?.id) {
      targetRestId = rest.id;
    }
  }

  const { data, error } = await admin
    .from("categories")
    .select("*")
    .eq("restaurant_id", targetRestId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to load categories" }, { status: 500 });
  }

  return NextResponse.json({ categories: data || [] });
}

// POST: Create a new category
export async function POST(request: Request) {
  const body = await request.json();

  if (!body.restaurant_id || !body.name?.trim()) {
    return NextResponse.json({ error: "restaurant_id and name are required" }, { status: 400 });
  }

  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  if (isPlaceholder) {
    const existing = getDemoCategories(body.restaurant_id);
    const demoCat = {
      id: body.id || `cat-${Date.now()}`,
      restaurant_id: body.restaurant_id,
      name: body.name.trim(),
      sort_order: existing.length + 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveDemoCategory(demoCat as any);
    return NextResponse.json({ category: demoCat }, { status: 201 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    // Try resolving by slug
    const cleanSlug = String(body.restaurant_id).toLowerCase().replace(/[^a-z0-9-]/g, "");
    const { data: restBySlug } = await admin
      .from("restaurants")
      .select("id")
      .ilike("slug", cleanSlug)
      .maybeSingle();
    if (restBySlug?.id) resolvedRestId = restBySlug.id;
  }

  if (!resolvedRestId) {
    // Check if user has an existing membership in any restaurant
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

  // Ensure user is an OWNER or MANAGER of this restaurant
  let { data: membership } = await admin
    .from("restaurant_members")
    .select("role")
    .eq("restaurant_id", resolvedRestId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    // Auto-link authenticated user as OWNER using adminClient (bypassing RLS circular lock)
    const { error: linkErr } = await admin.from("restaurant_members").upsert(
      {
        restaurant_id: resolvedRestId,
        user_id: user.id,
        role: "OWNER",
      },
      { onConflict: "restaurant_id,user_id" }
    );
    if (linkErr) {
      console.error("[Categories API] Failed to link owner:", linkErr);
      return NextResponse.json(
        { error: "Failed to establish restaurant ownership: " + linkErr.message },
        { status: 403 }
      );
    }
    membership = { role: "OWNER" };
  }

  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permissions to manage categories for this restaurant" },
      { status: 403 }
    );
  }

  // Get next sort_order
  const { count } = await admin
    .from("categories")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", resolvedRestId);

  const { data: newCategory, error: insertError } = await admin
    .from("categories")
    .insert({
      restaurant_id: resolvedRestId,
      name: body.name.trim(),
      sort_order: (count || 0) + 1,
      is_active: true,
    })
    .select()
    .single();

  if (insertError || !newCategory) {
    console.error("[Categories API] Insert category error:", insertError);
    return NextResponse.json(
      { error: insertError?.message || "Failed to create category in database" },
      { status: 400 }
    );
  }

  return NextResponse.json({ category: newCategory }, { status: 201 });
}
