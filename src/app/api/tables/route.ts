import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDemoTables, saveDemoTable } from "@/lib/server-demo-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurant_id is required" }, { status: 400 });
    }

    const isPlaceholder =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

    if (isPlaceholder) {
      const demoTables = getDemoTables(restaurantId);
      return NextResponse.json({ tables: demoTables }, { status: 200 });
    }

    const supabase = await createClient();
    const { data: tables, error } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("table_number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tables: tables || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load tables" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_id, table_number, capacity } = body;

    if (!restaurant_id || !table_number?.trim()) {
      return NextResponse.json(
        { error: "restaurant_id and table_number are required" },
        { status: 400 }
      );
    }

    const isPlaceholder =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

    if (isPlaceholder) {
      const newTable = {
        id: body.id || `tbl-${Date.now()}`,
        restaurant_id,
        table_number: table_number.trim(),
        token: body.token || `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        capacity: capacity ? Number(capacity) : 4,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      saveDemoTable(newTable as any);

      return NextResponse.json(
        { table: newTable },
        { status: 201 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-link owner if membership is missing
    let { data: membership } = await supabase
      .from("restaurant_members")
      .select("role")
      .eq("restaurant_id", restaurant_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      await supabase.from("restaurant_members").upsert(
        {
          restaurant_id,
          user_id: user.id,
          role: "OWNER",
        },
        { onConflict: "restaurant_id,user_id" }
      );
    }

    const token =
      body.token || `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const { data: table, error } = await supabase
      .from("restaurant_tables")
      .insert({
        restaurant_id,
        table_number: table_number.trim(),
        token,
        is_active: body.is_active !== undefined ? body.is_active : true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ table }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create table" },
      { status: 500 }
    );
  }
}
