import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { MOCK_RESTAURANT, MOCK_MENU_ITEMS, MOCK_TABLES } from "@/lib/data/mock-data";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantSlug, tableToken, items, customerName, customerPhone, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart cannot be empty" }, { status: 400 });
    }

    const supabase = await createClient();

    const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

    // 1. Fetch Restaurant
    let restaurant: any = null;
    if (!isPlaceholder) {
      const { data: dbRestaurant } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", restaurantSlug)
        .single();
      restaurant = dbRestaurant;
    }

    if (!restaurant) {
      restaurant = restaurantSlug === MOCK_RESTAURANT.slug ? MOCK_RESTAURANT : MOCK_RESTAURANT;
    }

    // 2. Fetch & Validate Table
    let table: any = null;
    if (!isPlaceholder) {
      const { data: dbTable } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("token", tableToken)
        .eq("restaurant_id", restaurant.id)
        .single();
      table = dbTable;
    }

    table = table || MOCK_TABLES.find((t) => t.token === tableToken);

    if (!table) {
      // Fallback virtual table
      table = {
        id: `tbl-${Date.now()}`,
        restaurant_id: restaurant.id,
        table_number: "Table Guest",
        token: tableToken,
      };
    }

    if (restaurant.is_active === false) {
      return NextResponse.json(
        { error: "This restaurant is currently closed or inactive" },
        { status: 400 }
      );
    }

    if (table && table.is_active === false) {
      return NextResponse.json(
        { error: "This table is currently inactive" },
        { status: 400 }
      );
    }

    // 3. ZERO-TRUST PRICING: Fetch authoritative item prices strictly from DB/authoritative catalog
    const itemIds = items.map((i: any) => i.itemId);
    let menuItems: any[] = [];
    if (!isPlaceholder) {
      const { data: dbItems } = await supabase
        .from("menu_items")
        .select("*")
        .in("id", itemIds)
        .eq("restaurant_id", restaurant.id);
      if (dbItems && dbItems.length > 0) {
        menuItems = dbItems;
      }
    }
    if (menuItems.length === 0) {
      menuItems = MOCK_MENU_ITEMS.filter((m) => itemIds.includes(m.id));
    }

    // Recalculate prices strictly on server using authoritative database data
    const orderItemsCalculated: any[] = [];
    let calculatedSubtotal = 0;

    for (const cartItem of items) {
      const match = menuItems.find((m) => m.id === cartItem.itemId);
      if (!match) {
        return NextResponse.json(
          { error: `Item "${cartItem.itemId}" is invalid or does not belong to this restaurant` },
          { status: 400 }
        );
      }

      if (match.is_available === false) {
        return NextResponse.json(
          { error: `Item "${match.name}" is currently sold out and unavailable` },
          { status: 400 }
        );
      }

      const rawQty = parseInt(cartItem.quantity, 10);
      if (isNaN(rawQty) || rawQty <= 0 || rawQty > 99) {
        return NextResponse.json(
          { error: `Invalid quantity for "${match.name}". Must be between 1 and 99.` },
          { status: 400 }
        );
      }

      const quantity = rawQty;
      const unitPrice = Number(match.price);
      if (isNaN(unitPrice) || unitPrice < 0) {
        return NextResponse.json(
          { error: `Invalid pricing found for "${match.name}"` },
          { status: 400 }
        );
      }

      const name = match.name;
      const lineSubtotal = unitPrice * quantity;
      const lineTaxRate = match?.tax_rate !== undefined ? Number(match.tax_rate) : Number(restaurant.tax_rate || 5);
      const lineTax = Number(((lineSubtotal * lineTaxRate) / 100).toFixed(2));
      const lineTotal = Number((lineSubtotal + lineTax).toFixed(2));

      calculatedSubtotal += lineSubtotal;
      orderItemsCalculated.push({
        menu_item_id: match.id,
        item_name_snapshot: name,
        unit_price_snapshot: unitPrice,
        quantity,
        tax: lineTax,
        total: lineTotal,
      });
    }

    const calculatedTax = Number(((calculatedSubtotal * Number(restaurant.tax_rate || 5)) / 100).toFixed(2));
    const calculatedTotal = Number((calculatedSubtotal + calculatedTax).toFixed(2));
    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord-${Date.now()}`;

    // 4. Initialize Payment Provider
    const provider = getPaymentProvider();
    const paymentOrder = await provider.createOrder({
      orderId,
      orderNumber,
      amount: calculatedTotal,
      currency: restaurant.currency || "INR",
      receipt: orderNumber,
      notes: {
        table_number: table.table_number,
        customer_name: customerName || "Guest",
      },
    });

    // 5. Insert order into DB if connected
    try {
      await supabase.from("orders").insert({
        id: orderId,
        restaurant_id: restaurant.id,
        table_id: table.id,
        order_number: orderNumber,
        subtotal: calculatedSubtotal,
        tax: calculatedTax,
        total: calculatedTotal,
        currency: restaurant.currency || "INR",
        status: "PAYMENT_PENDING",
        payment_status: "PENDING",
        customer_name: customerName || "Walk-in Guest",
        customer_phone: customerPhone || null,
        notes: notes || null,
      });
    } catch {
      // Offline / local mock state will be synchronized via client store
    }

    logger.info("payment_order_created", {
      orderId,
      orderNumber,
      restaurantId: restaurant.id,
      tableNumber: table.table_number,
      total: calculatedTotal,
      currency: restaurant.currency || "INR",
      provider: paymentOrder.provider,
      itemCount: orderItemsCalculated.length,
    });

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      restaurantName: restaurant.name,
      tableNumber: table.table_number,
      subtotal: calculatedSubtotal,
      tax: calculatedTax,
      total: calculatedTotal,
      currency: restaurant.currency || "INR",
      gatewayOrderId: paymentOrder.gatewayOrderId,
      provider: paymentOrder.provider,
      keyId: paymentOrder.keyId,
      items: orderItemsCalculated,
    });
  } catch (err: any) {
    logger.error("payment_order_creation_failed", err);
    return NextResponse.json({ error: err.message || "Failed to initiate payment" }, { status: 500 });
  }
}
