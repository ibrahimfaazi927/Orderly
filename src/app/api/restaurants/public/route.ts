import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MOCK_RESTAURANT, MOCK_CATEGORIES, MOCK_MENU_ITEMS, MOCK_TABLES } from "@/lib/data/mock-data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSlug = searchParams.get("slug") || "";
    const cleanSlug = rawSlug.trim().toLowerCase();
    const tableToken = searchParams.get("tableToken")?.trim();

    if (!cleanSlug) {
      return NextResponse.json({ error: "Restaurant slug is required" }, { status: 400 });
    }

    const isPlaceholder =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

    if (!isPlaceholder) {
      const supabase = await createClient();

      // 1. Authoritative Restaurant Lookup by slug (case-insensitive) or UUID
      let { data: restaurant } = await supabase
        .from("restaurants")
        .select("*")
        .ilike("slug", cleanSlug)
        .maybeSingle();

      if (!restaurant) {
        // Fallback: check if slug passed is actually an ID
        const { data: byId } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", cleanSlug)
          .maybeSingle();
        restaurant = byId;
      }

      if (restaurant) {
        if (restaurant.is_active === false) {
          return NextResponse.json(
            { error: `Restaurant "${restaurant.name}" is currently inactive.` },
            { status: 403 }
          );
        }

        // 2. Authoritative Active Categories
        const { data: categories, error: catError } = await supabase
          .from("categories")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        // 3. Authoritative Active Menu Items with Database IDs
        const { data: menuItems, error: itemsError } = await supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .eq("is_available", true)
          .order("sort_order", { ascending: true });

        // 4. Validate Table Token for this Restaurant
        let table = null;
        if (tableToken) {
          const { data: matchedTable } = await supabase
            .from("restaurant_tables")
            .select("*")
            .eq("restaurant_id", restaurant.id)
            .eq("token", tableToken)
            .maybeSingle();
          table = matchedTable;
        }

        if (!table) {
          // Find any active table for this restaurant
          const { data: anyTable } = await supabase
            .from("restaurant_tables")
            .select("*")
            .eq("restaurant_id", restaurant.id)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();

          table = anyTable || {
            id: `tbl-${Date.now()}`,
            restaurant_id: restaurant.id,
            table_number: "Table 01",
            token: tableToken || "tbl_fallback",
            is_active: true,
          };
        }

        return NextResponse.json({
          success: true,
          source: "supabase",
          restaurant,
          categories: categories || [],
          menuItems: menuItems || [],
          table,
        });
      }

      // If Supabase is configured and restaurant slug is not found
      return NextResponse.json(
        { error: `Restaurant "${rawSlug}" not found.` },
        { status: 404 }
      );
    }

    // Supabase is not configured (Mock / Local Demo Mode)
    const mockTable = tableToken
      ? MOCK_TABLES.find((t) => t.token === tableToken) || MOCK_TABLES[0]
      : MOCK_TABLES[0];

    return NextResponse.json({
      success: true,
      source: "mock",
      restaurant: { ...MOCK_RESTAURANT, slug: cleanSlug || MOCK_RESTAURANT.slug },
      categories: MOCK_CATEGORIES,
      menuItems: MOCK_MENU_ITEMS,
      table: mockTable,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load public restaurant menu" },
      { status: 500 }
    );
  }
}
