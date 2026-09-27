import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  saveDemoRestaurant,
  saveDemoCategory,
  saveDemoTable,
  syncFullDemoRestaurant,
  findDemoRestaurant,
} from "@/lib/server-demo-store";

export async function GET(request: Request) {
  try {
    const isPlaceholder =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

    if (isPlaceholder) {
      const { searchParams } = new URL(request.url);
      const slug = searchParams.get("slug");
      if (slug) {
        const found = findDemoRestaurant(slug);
        if (found) {
          return NextResponse.json({ success: true, restaurant: found, source: "demo" });
        }
      }
      return NextResponse.json({ success: false, error: "Demo mode" }, { status: 200 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 1. Check existing restaurant membership
    const { data: membership } = await admin
      .from("restaurant_members")
      .select("restaurant_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membership?.restaurant_id) {
      const { data: restaurant } = await admin
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

    const cleanNoHyphen = restaurantName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanWithHyphen = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if restaurant with this slug already exists (try cleanNoHyphen first, then cleanWithHyphen)
    let { data: existingRest } = await admin
      .from("restaurants")
      .select("*")
      .or(`slug.ilike.${cleanNoHyphen},slug.ilike.${cleanWithHyphen}`)
      .limit(1)
      .maybeSingle();

    if (existingRest) {
      // Link user as owner with admin client (bypasses RLS circular lock)
      await admin.from("restaurant_members").upsert(
        {
          restaurant_id: existingRest.id,
          user_id: user.id,
          role: "OWNER",
        },
        { onConflict: "restaurant_id,user_id" }
      );

      return NextResponse.json({ success: true, restaurant: existingRest, role: "OWNER" });
    }

    // 3. Auto-provision restaurant row if not yet created (defaults to unhyphenated clean slug like katihouse)
    const baseSlug = cleanNoHyphen || `rest-${user.id.slice(0, 8)}`;
    const { data: newRest, error: createError } = await admin
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

    if (createError || !newRest) {
      return NextResponse.json({ error: createError?.message || "Failed to create restaurant" }, { status: 400 });
    }

    // Link user as OWNER
    await admin.from("restaurant_members").insert({
      restaurant_id: newRest.id,
      user_id: user.id,
      role: "OWNER",
    });

    // Create default table
    await admin.from("restaurant_tables").insert({
      restaurant_id: newRest.id,
      table_number: "01",
      token: `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      is_active: true,
    });

    // Create default category
    await admin.from("categories").insert({
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
    const body = await request.json();

    const isPlaceholder =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

    if (isPlaceholder) {
      if (body.syncState) {
        syncFullDemoRestaurant(body);
        return NextResponse.json({ success: true, source: "demo" });
      }

      const name = (body.name || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Restaurant name is required" }, { status: 400 });
      }

      const cleanSlug = (body.slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/^-|-$/g, "");

      const restId = body.id || `rest-${cleanSlug}-${Date.now()}`;
      const demoRestaurant = {
        id: restId,
        name,
        slug: cleanSlug,
        business_type: body.business_type || "RESTAURANT",
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        currency: body.currency || "INR",
        tax_rate: body.tax_rate !== undefined ? Number(body.tax_rate) : 5,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveDemoRestaurant(demoRestaurant as any);

      const catId = `cat-${Date.now()}`;
      const demoCat = {
        id: catId,
        restaurant_id: restId,
        name: body.initialCategory || "Chef's Specials",
        sort_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveDemoCategory(demoCat as any);

      const tblId = `tbl-${Date.now()}`;
      const demoTable = {
        id: tblId,
        restaurant_id: restId,
        table_number: "01",
        token: `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        capacity: 4,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      saveDemoTable(demoTable as any);

      return NextResponse.json({
        success: true,
        source: "demo",
        restaurant: demoRestaurant,
        categories: [demoCat],
        tables: [demoTable],
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Restaurant name is required" }, { status: 400 });
    }

    // Exact slug entered or derived without unnecessary hyphens (e.g. katihouse)
    const cleanSlug = (body.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-|-$/g, "");

    const admin = createAdminClient();

    // 1. Check if restaurant with this slug already exists
    let { data: existingRest } = await admin
      .from("restaurants")
      .select("*")
      .ilike("slug", cleanSlug)
      .maybeSingle();

    if (existingRest) {
      // Update restaurant details & ensure membership
      const { data: updatedRest } = await admin
        .from("restaurants")
        .update({
          name,
          phone: body.phone?.trim() || existingRest.phone,
          address: body.address?.trim() || existingRest.address,
          currency: body.currency || existingRest.currency,
          tax_rate: body.tax_rate !== undefined ? Number(body.tax_rate) : existingRest.tax_rate,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRest.id)
        .select()
        .single();

      const { error: memberErr } = await admin.from("restaurant_members").upsert(
        {
          restaurant_id: existingRest.id,
          user_id: user.id,
          role: "OWNER",
        },
        { onConflict: "restaurant_id,user_id" }
      );

      if (memberErr) {
        console.error("[Restaurants API] Upsert member error:", memberErr);
        return NextResponse.json(
          { error: "Failed to establish restaurant ownership: " + memberErr.message },
          { status: 500 }
        );
      }

      // Ensure at least one table exists
      let { data: table } = await admin
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", existingRest.id)
        .limit(1)
        .maybeSingle();

      if (!table) {
        const { data: newTbl } = await admin
          .from("restaurant_tables")
          .insert({
            restaurant_id: existingRest.id,
            table_number: "01",
            token: `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            is_active: true,
          })
          .select()
          .single();
        table = newTbl;
      }

      // Ensure at least one category exists
      let { data: category } = await admin
        .from("categories")
        .select("*")
        .eq("restaurant_id", existingRest.id)
        .limit(1)
        .maybeSingle();

      if (!category) {
        const { data: newCat } = await admin
          .from("categories")
          .insert({
            restaurant_id: existingRest.id,
            name: body.initialCategory || "Chef's Specials",
            sort_order: 1,
            is_active: true,
          })
          .select()
          .single();
        category = newCat;
      }

      return NextResponse.json({
        success: true,
        restaurant: updatedRest || existingRest,
        categories: category ? [category] : [],
        tables: table ? [table] : [],
      });
    }

    // 2. Insert restaurant if it doesn't exist yet
    const { data: restaurant, error: restError } = await admin
      .from("restaurants")
      .insert({
        name,
        slug: cleanSlug,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        currency: body.currency || "INR",
        tax_rate: body.tax_rate !== undefined ? Number(body.tax_rate) : 5.0,
        is_active: true,
      })
      .select()
      .single();

    if (restError || !restaurant) {
      return NextResponse.json({ error: restError?.message || "Failed to create restaurant" }, { status: 400 });
    }

    // Link user as OWNER using adminClient (bypassing RLS circular lock)
    const { error: memberError } = await admin.from("restaurant_members").insert({
      restaurant_id: restaurant.id,
      user_id: user.id,
      role: "OWNER",
    });

    if (memberError) {
      console.error("[Restaurants API] Insert member error:", memberError);
      return NextResponse.json(
        { error: "Failed to link owner to restaurant: " + memberError.message },
        { status: 500 }
      );
    }

    // Create initial table
    const { data: createdTable } = await admin
      .from("restaurant_tables")
      .insert({
        restaurant_id: restaurant.id,
        table_number: "01",
        token: `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        is_active: true,
      })
      .select()
      .single();

    // Create initial category
    const { data: createdCategory } = await admin
      .from("categories")
      .insert({
        restaurant_id: restaurant.id,
        name: body.initialCategory || "Chef's Specials",
        sort_order: 1,
        is_active: true,
      })
      .select()
      .single();

    return NextResponse.json(
      {
        success: true,
        restaurant,
        categories: createdCategory ? [createdCategory] : [],
        tables: createdTable ? [createdTable] : [],
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create restaurant" },
      { status: 500 }
    );
  }
}
