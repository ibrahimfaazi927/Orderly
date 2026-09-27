import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MOCK_RESTAURANT, MOCK_CATEGORIES, MOCK_MENU_ITEMS, MOCK_TABLES } from "@/lib/data/mock-data";
import {
  findDemoRestaurant,
  getDemoCategories,
  getDemoMenuItems,
  getDemoTables,
  findDemoTable,
} from "@/lib/server-demo-store";

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

      // 1. Authoritative Restaurant Lookup by slug (case-insensitive, with/without hyphen) or UUID
      const noHyphen = cleanSlug.replace(/-/g, "");
      let { data: restaurant } = await supabase
        .from("restaurants")
        .select("*")
        .or(`slug.ilike.${cleanSlug},slug.ilike.${noHyphen}`)
        .limit(1)
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

    // -------------------------------------------------------------
    // DEMO / LOCAL STORE MODE (When Supabase is not configured)
    // -------------------------------------------------------------
    const demoRest = findDemoRestaurant(cleanSlug);
    if (demoRest) {
      const categories = getDemoCategories(demoRest.id);
      const menuItems = getDemoMenuItems(demoRest.id);
      const tables = getDemoTables(demoRest.id);
      const matchedTable = tableToken
        ? findDemoTable(demoRest.id, tableToken) ||
          tables.find((t) => t.token === tableToken || t.id === tableToken)
        : null;

      const finalTable =
        matchedTable ||
        tables[0] || {
          id: `tbl-${Date.now()}`,
          restaurant_id: demoRest.id,
          table_number: "Table 01",
          token: tableToken || "tbl_01",
          is_active: true,
        };

      return NextResponse.json({
        success: true,
        source: "demo",
        restaurant: demoRest,
        categories: categories || [],
        menuItems: menuItems || [],
        table: finalTable,
      });
    }

    // Only return Sunrise Bistro mock if the user explicitly requested sunrise-bistro
    if (cleanSlug === "sunrise-bistro" || cleanSlug === "sunrise" || cleanSlug === "rest-sunrise-bistro-001") {
      const mockTable = tableToken
        ? MOCK_TABLES.find((t) => t.token === tableToken) || MOCK_TABLES[0]
        : MOCK_TABLES[0];

      return NextResponse.json({
        success: true,
        source: "mock",
        restaurant: MOCK_RESTAURANT,
        categories: MOCK_CATEGORIES,
        menuItems: MOCK_MENU_ITEMS,
        table: mockTable,
      });
    }

    // Not found in demo store either
    return NextResponse.json(
      { error: `Restaurant "${rawSlug}" not found.` },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load public restaurant menu" },
      { status: 500 }
    );
  }
}
