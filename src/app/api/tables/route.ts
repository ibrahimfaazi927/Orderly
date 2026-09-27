import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoTables, saveDemoTable } from "@/lib/server-demo-store";

const isUUID = (str: any) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

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

    const admin = createAdminClient();

    let targetRestId = restaurantId;
    if (!isUUID(restaurantId)) {
      const { data: rest } = await admin
        .from("restaurants")
        .select("id")
        .ilike("slug", restaurantId)
        .maybeSingle();
      if (rest?.id) targetRestId = rest.id;
    }

    const { data: tables, error } = await admin
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", targetRestId)
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

    const admin = createAdminClient();

    // Resolve restaurant UUID
    let resolvedRestId: string | null = null;
    if (isUUID(restaurant_id)) {
      const { data: rest } = await admin
        .from("restaurants")
        .select("id")
        .eq("id", restaurant_id)
        .maybeSingle();
      if (rest?.id) resolvedRestId = rest.id;
    }

    if (!resolvedRestId) {
      const cleanSlug = String(restaurant_id).toLowerCase().replace(/[^a-z0-9-]/g, "");
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
        { error: `Restaurant "${restaurant_id}" could not be resolved. Please complete onboarding first.` },
        { status: 400 }
      );
    }

    // Auto-link owner if membership is missing
    let { data: membership } = await admin
      .from("restaurant_members")
      .select("role")
      .eq("restaurant_id", resolvedRestId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      await admin.from("restaurant_members").upsert(
        {
          restaurant_id: resolvedRestId,
          user_id: user.id,
          role: "OWNER",
        },
        { onConflict: "restaurant_id,user_id" }
      );
    }

    const token =
      body.token || `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const { data: table, error } = await admin
      .from("restaurant_tables")
      .insert({
        restaurant_id: resolvedRestId,
        table_number: table_number.trim(),
        token,
        is_active: body.is_active !== undefined ? body.is_active : true,
      })
      .select()
      .single();

    if (error || !table) {
      console.error("[Tables API] Insert table error:", error);
      return NextResponse.json({ error: error?.message || "Failed to create table in database" }, { status: 400 });
    }

    return NextResponse.json({ table }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create table" },
      { status: 500 }
    );
  }
}
