import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { MOCK_RESTAURANT, MOCK_MENU_ITEMS, MOCK_TABLES } from "@/lib/data/mock-data";
import {
  findDemoRestaurant,
  getDemoMenuItems,
  getDemoTables,
  findDemoTable,
} from "@/lib/server-demo-store";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantSlug, tableToken, items, customerName, customerPhone, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart cannot be empty" }, { status: 400 });
    }

    const cleanSlug = (restaurantSlug || "").trim().toLowerCase();
    const isPlaceholder =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

    let supabase: any = null;
    let restaurant: any = null;
    let table: any = null;

    if (!isPlaceholder) {
      supabase = await createClient();

      // 1. Authoritative Restaurant Lookup by slug (case-insensitive, with/without hyphen) or UUID
      const noHyphen = cleanSlug.replace(/-/g, "");
      let { data: dbRestaurant } = await supabase
        .from("restaurants")
        .select("*")
        .or(`slug.ilike.${cleanSlug},slug.ilike.${noHyphen}`)
        .limit(1)
        .maybeSingle();

      if (!dbRestaurant) {
        // Fallback: check if slug passed is actually an ID
        const { data: byId } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", cleanSlug)
          .maybeSingle();
        dbRestaurant = byId;
      }

      restaurant = dbRestaurant;

      if (!restaurant) {
        return NextResponse.json(
          { error: `Restaurant "${restaurantSlug}" could not be found or is inactive.` },
          { status: 404 }
        );
      }

      if (restaurant.is_active === false) {
        return NextResponse.json(
          { error: "This restaurant is currently closed or inactive" },
          { status: 400 }
        );
      }

      // 2. Authoritative Table Lookup
      if (tableToken) {
        const { data: dbTable } = await supabase
          .from("restaurant_tables")
          .select("*")
          .eq("token", tableToken)
          .eq("restaurant_id", restaurant.id)
          .maybeSingle();
        table = dbTable;
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

        table = anyTable;
      }

      if (!table) {
        // Create an authoritative table entry in database
        const { data: newTable } = await supabase
          .from("restaurant_tables")
          .insert({
            restaurant_id: restaurant.id,
            table_number: "01",
            token: tableToken || `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            is_active: true,
          })
          .select()
          .single();
        table = newTable;
      }
    } else {
      // Mock / Demo Mode
      const demoRest = findDemoRestaurant(cleanSlug);
      restaurant = demoRest || { ...MOCK_RESTAURANT, slug: cleanSlug };
      const demoTables = restaurant?.id ? getDemoTables(restaurant.id) : [];
      table = tableToken
        ? (restaurant?.id ? findDemoTable(restaurant.id, tableToken) : null) ||
          demoTables.find((t) => t.token === tableToken || t.id === tableToken) ||
          MOCK_TABLES.find((t) => t.token === tableToken) ||
          MOCK_TABLES[0]
        : demoTables[0] || MOCK_TABLES[0];
    }

    if (table && table.is_active === false) {
      return NextResponse.json(
        { error: "This table is currently inactive" },
        { status: 400 }
      );
    }

    // 3. ZERO-TRUST PRICING: Authoritatively fetch item prices strictly from DB
    const itemIds = items.map((i: any) => i.itemId).filter(Boolean);
    let menuItems: any[] = [];

    const isUUID = (str: any) =>
      typeof str === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

    if (!isPlaceholder && restaurant?.id) {
      const uuidItemIds = itemIds.filter(isUUID);
      if (uuidItemIds.length > 0) {
        const { data: dbItems } = await supabase
          .from("menu_items")
          .select("*")
          .in("id", uuidItemIds)
          .eq("restaurant_id", restaurant.id);

        if (dbItems && dbItems.length > 0) {
          menuItems = dbItems;
        }
      }

      // If some items were not matched by ID, try matching by name within this restaurant
      if (menuItems.length < items.length) {
        const { data: allRestaurantItems } = await supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .eq("is_available", true);

        if (allRestaurantItems && allRestaurantItems.length > 0) {
          for (const cartItem of items) {
            if (!menuItems.some((m) => m.id === cartItem.itemId)) {
              const matchedByName = allRestaurantItems.find(
                (m: any) =>
                  m.name.trim().toLowerCase() ===
                  (cartItem.name || cartItem.itemName || "").trim().toLowerCase()
              );
              if (matchedByName && !menuItems.some((m) => m.id === matchedByName.id)) {
                menuItems.push(matchedByName);
                // Update cartItem itemId to real DB id for seamless consistency
                cartItem.itemId = matchedByName.id;
              }
            }
          }
        }
      }
    } else {
      const demoItems = restaurant?.id ? getDemoMenuItems(restaurant.id) : [];
      menuItems = demoItems.length > 0 ? [...demoItems] : [...MOCK_MENU_ITEMS];
      // If still missing items and cart items provide a name or price, allow demo matching
      for (const cartItem of items) {
        if (!menuItems.some((m) => m.id === cartItem.itemId)) {
          if (cartItem.price !== undefined && (cartItem.name || cartItem.itemName)) {
            menuItems.push({
              id: cartItem.itemId,
              restaurant_id: restaurant?.id || "demo",
              name: cartItem.name || cartItem.itemName,
              price: Number(cartItem.price),
              tax_rate: restaurant?.tax_rate || 5,
              is_available: true,
            });
          }
        }
      }
    }

    // Recalculate prices strictly on server using authoritative database data
    const orderItemsCalculated: any[] = [];
    let calculatedSubtotal = 0;

    for (const cartItem of items) {
      let match = menuItems.find((m) => m.id === cartItem.itemId);
      if (!match && cartItem.name) {
        match = menuItems.find(
          (m) => m.name.toLowerCase() === cartItem.name.toLowerCase()
        );
      }

      if (!match) {
        // In demo mode or if client-created items (e.g. item-...) aren't persisted server-side,
        // accept client-sent item data if valid price and name are provided
        const isClientDemoItem =
          isPlaceholder ||
          process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true" ||
          String(cartItem.itemId).startsWith("item-") ||
          !isUUID(cartItem.itemId);

        if (isClientDemoItem && cartItem.price !== undefined && (cartItem.name || cartItem.itemName)) {
          match = {
            id: cartItem.itemId,
            restaurant_id: restaurant?.id || "demo",
            name: cartItem.name || cartItem.itemName,
            price: Number(cartItem.price),
            tax_rate: restaurant?.tax_rate || 5,
            is_available: true,
          };
        } else {
          return NextResponse.json(
            { error: `Item "${cartItem.itemId}" is invalid or does not belong to this restaurant` },
            { status: 400 }
          );
        }
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
      const lineTaxRate =
        match?.tax_rate !== undefined
          ? Number(match.tax_rate)
          : Number(restaurant.tax_rate || 5);
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

    const calculatedTax = Number(
      ((calculatedSubtotal * Number(restaurant.tax_rate || 5)) / 100).toFixed(2)
    );
    const calculatedTotal = Number((calculatedSubtotal + calculatedTax).toFixed(2));
    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : (await import("crypto")).randomUUID();

    // 4. Initialize Payment Provider
    const provider = getPaymentProvider();
    const paymentOrder = await provider.createOrder({
      orderId,
      orderNumber,
      amount: calculatedTotal,
      currency: restaurant.currency || "INR",
      receipt: orderNumber,
      notes: {
        table_number: table?.table_number || "Table",
        customer_name: customerName || "Guest",
      },
    });

    // 5. Insert order into DB if connected
    if (!isPlaceholder && supabase && restaurant?.id && table?.id) {
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

        // Insert order line items
        if (orderItemsCalculated.length > 0) {
          const lineItemsToInsert = orderItemsCalculated.map((item) => ({
            order_id: orderId,
            menu_item_id: isUUID(item.menu_item_id) ? item.menu_item_id : null,
            item_name_snapshot: item.item_name_snapshot,
            unit_price_snapshot: item.unit_price_snapshot,
            quantity: item.quantity,
            tax: item.tax,
            total: item.total,
          }));
          await supabase.from("order_items").insert(lineItemsToInsert);
        }
      } catch (dbErr) {
        logger.warn("payment_order_db_insert_warning", { error: String(dbErr) });
      }
    }

    logger.info("payment_order_created", {
      orderId,
      orderNumber,
      restaurantId: restaurant.id,
      tableNumber: table?.table_number,
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
      tableNumber: table?.table_number || "Table",
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
    return NextResponse.json(
      { error: err.message || "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
