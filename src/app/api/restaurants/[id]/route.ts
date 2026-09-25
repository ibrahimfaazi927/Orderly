import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Unable to retrieve restaurant" },
      { status: 404 }
    );
  }

  return NextResponse.json({ restaurant });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

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
      .eq("restaurant_id", id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permissions to modify this restaurant" },
        { status: 403 }
      );
    }
  }

  // Enforce server authorization & update
  const { data: updated, error } = await supabase
    .from("restaurants")
    .update({
      name: body.name,
      slug: body.slug ? body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "") : undefined,
      logo_url: body.logo_url,
      description: body.description,
      phone: body.phone,
      email: body.email,
      address: body.address,
      opening_hours: body.opening_hours,
      currency: body.currency,
      tax_rate: body.tax_rate !== undefined ? Number(body.tax_rate) : undefined,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update restaurant profile" },
      { status: 400 }
    );
  }

  return NextResponse.json({ restaurant: updated });
}
