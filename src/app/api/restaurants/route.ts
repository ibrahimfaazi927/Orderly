import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const isPlaceholder =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

    if (isPlaceholder) {
      return NextResponse.json({ success: false, error: "Demo mode" }, { status: 200 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Check existing restaurant membership
    const { data: membership } = await supabase
      .from("restaurant_members")
      .select("restaurant_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membership?.restaurant_id) {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", membership.restaurant_id)
        .single();

      if (restaurant) {
        return NextResponse.json({ success: true, restaurant, role: membership.role });
      }
    }

    // 2. If no membership exists, check user metadata for restaurant name
    const restaurantName =
      user.user_metadata?.restaurant_name ||
      user.user_metadata?.business_name ||
      user.user_metadata?.full_name ||
      "Orderly Restaurant";

    const baseSlug = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `rest-${user.id.slice(0, 8)}`;

    // Check if restaurant with this slug already exists
    let { data: existingRest } = await supabase
      .from("restaurants")
      .select("*")
      .ilike("slug", baseSlug)
      .maybeSingle();

    if (existingRest) {
      // Link user as owner
      await supabase.from("restaurant_members").upsert(
        {
          restaurant_id: existingRest.id,
          user_id: user.id,
          role: "OWNER",
        },
        { onConflict: "restaurant_id,user_id" }
      );

      return NextResponse.json({ success: true, restaurant: existingRest, role: "OWNER" });
    }

    // 3. Auto-provision restaurant row if not yet created
    const { data: newRest, error: createError } = await supabase
      .from("restaurants")
      .insert({
        name: restaurantName,
        slug: baseSlug,
        currency: "INR",
        tax_rate: 5.0,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Link user as OWNER
    await supabase.from("restaurant_members").insert({
      restaurant_id: newRest.id,
      user_id: user.id,
      role: "OWNER",
    });

    // Create default table
    await supabase.from("restaurant_tables").insert({
      restaurant_id: newRest.id,
      table_number: "01",
      token: `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      is_active: true,
    });

    // Create default category
    await supabase.from("categories").insert({
      restaurant_id: newRest.id,
      name: "Main Menu",
      sort_order: 1,
      is_active: true,
    });

    return NextResponse.json({ success: true, restaurant: newRest, role: "OWNER" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to retrieve restaurant" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const isPlaceholder =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

    if (isPlaceholder) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Restaurant name is required" }, { status: 400 });
    }

    const slug =
      (body.slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `rest-${Date.now()}`;

    // Insert restaurant
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .insert({
        name,
        slug,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        currency: body.currency || "INR",
        tax_rate: body.tax_rate !== undefined ? Number(body.tax_rate) : 5.0,
        is_active: true,
      })
      .select()
      .single();

    if (restError) {
      return NextResponse.json({ error: restError.message }, { status: 400 });
    }

    // Link user as OWNER
    await supabase.from("restaurant_members").insert({
      restaurant_id: restaurant.id,
      user_id: user.id,
      role: "OWNER",
    });

    // Create initial table
    await supabase.from("restaurant_tables").insert({
      restaurant_id: restaurant.id,
      table_number: "01",
      token: `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      is_active: true,
    });

    // Create initial category
    await supabase.from("categories").insert({
      restaurant_id: restaurant.id,
      name: body.initialCategory || "Chef's Specials",
      sort_order: 1,
      is_active: true,
    });

    return NextResponse.json({ success: true, restaurant }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create restaurant" },
      { status: 500 }
    );
  }
}
