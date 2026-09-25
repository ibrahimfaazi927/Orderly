import {
  MOCK_RESTAURANT,
  MOCK_CATEGORIES,
  MOCK_MENU_ITEMS,
  MOCK_TABLES,
  MOCK_ORDERS,
  MOCK_PAYMENTS,
} from "./data/mock-data";
import {
  Restaurant,
  Category,
  MenuItem,
  RestaurantTable,
  Order,
  Payment,
  OrderStatus,
  PaymentStatus,
  DietaryType,
} from "@/types/database";
import { assertValidOrderTransition } from "./order-state-machine";

const STORAGE_KEY = "orderly_state_v1";
const RESTAURANTS_INDEX_KEY = "orderly_restaurants_registry_v1";

export interface OrderlyState {
  restaurant: Restaurant;
  categories: Category[];
  menuItems: MenuItem[];
  tables: RestaurantTable[];
  orders: (Order & { table_number?: string; items?: any[] })[];
  payments: Payment[];
}

const defaultState: OrderlyState = {
  restaurant: MOCK_RESTAURANT,
  categories: MOCK_CATEGORIES,
  menuItems: MOCK_MENU_ITEMS,
  tables: MOCK_TABLES,
  orders: MOCK_ORDERS,
  payments: MOCK_PAYMENTS,
};

export function getLocalState(): OrderlyState {
  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
      return defaultState;
    }
    return JSON.parse(raw);
  } catch {
    return defaultState;
  }
}

export function getRestaurantState(slugOrId?: string): OrderlyState {
  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    if (!slugOrId) {
      return getLocalState();
    }

    const registryRaw = localStorage.getItem(RESTAURANTS_INDEX_KEY);
    const registry: Record<string, OrderlyState> = registryRaw ? JSON.parse(registryRaw) : {};

    if (registry[slugOrId]) {
      return registry[slugOrId];
    }

    const found = Object.values(registry).find(
      (s) => s.restaurant.slug === slugOrId || s.restaurant.id === slugOrId
    );
    if (found) {
      return found;
    }

    const currentActive = getLocalState();
    if (currentActive.restaurant.slug === slugOrId || currentActive.restaurant.id === slugOrId) {
      return currentActive;
    }

    if (slugOrId === MOCK_RESTAURANT.slug || slugOrId === MOCK_RESTAURANT.id) {
      return defaultState;
    }

    return currentActive;
  } catch {
    return defaultState;
  }
}

export function saveLocalState(state: OrderlyState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const registryRaw = localStorage.getItem(RESTAURANTS_INDEX_KEY);
    const registry: Record<string, OrderlyState> = registryRaw ? JSON.parse(registryRaw) : {};
    registry[state.restaurant.id] = state;
    registry[state.restaurant.slug] = state;
    localStorage.setItem(RESTAURANTS_INDEX_KEY, JSON.stringify(registry));

    window.dispatchEvent(new Event("orderly_storage_change"));
  } catch (e) {
    console.error("Failed to persist state", e);
  }
}

// -------------------------------------------------------------
// RESTAURANT MANAGEMENT
// -------------------------------------------------------------
export function updateRestaurantProfile(updates: Partial<Restaurant>): Restaurant {
  const state = getLocalState();
  state.restaurant = {
    ...state.restaurant,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveLocalState(state);
  return state.restaurant;
}

// -------------------------------------------------------------
// CATEGORY MANAGEMENT
// -------------------------------------------------------------
export function addCategory(name: string): Category {
  const state = getLocalState();
  const newCat: Category = {
    id: `cat-${Date.now()}`,
    restaurant_id: state.restaurant.id,
    name: name.trim(),
    sort_order: state.categories.length + 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.categories.push(newCat);
  saveLocalState(state);
  return newCat;
}

export function updateCategory(id: string, name: string): Category | null {
  const state = getLocalState();
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return null;
  cat.name = name.trim();
  cat.updated_at = new Date().toISOString();
  saveLocalState(state);
  return cat;
}

export function deleteCategory(id: string): boolean {
  const state = getLocalState();
  const initialLen = state.categories.length;
  state.categories = state.categories.filter((c) => c.id !== id);
  // Also remove items belonging to this category or reassign them
  state.menuItems = state.menuItems.filter((item) => item.category_id !== id);
  if (state.categories.length !== initialLen) {
    saveLocalState(state);
    return true;
  }
  return false;
}

export function reorderCategories(categoryIds: string[]): Category[] {
  const state = getLocalState();
  state.categories.sort((a, b) => {
    const idxA = categoryIds.indexOf(a.id);
    const idxB = categoryIds.indexOf(b.id);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });
  state.categories.forEach((cat, index) => {
    cat.sort_order = index + 1;
    cat.updated_at = new Date().toISOString();
  });
  saveLocalState(state);
  return state.categories;
}

// -------------------------------------------------------------
// MENU ITEM MANAGEMENT
// -------------------------------------------------------------
export function addMenuItem(
  item: Omit<MenuItem, "id" | "restaurant_id" | "created_at" | "updated_at">
): MenuItem {
  const state = getLocalState();
  const newItem: MenuItem = {
    ...item,
    id: `item-${Date.now()}`,
    restaurant_id: state.restaurant.id,
    price: Number(item.price),
    tax_rate: item.tax_rate !== undefined ? Number(item.tax_rate) : state.restaurant.tax_rate,
    is_available: item.is_available !== undefined ? item.is_available : true,
    dietary_type: item.dietary_type || "VEG",
    sort_order: state.menuItems.length + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.menuItems.push(newItem);
  saveLocalState(state);
  return newItem;
}

export function updateMenuItem(
  id: string,
  updates: Partial<MenuItem>
): MenuItem | null {
  const state = getLocalState();
  const index = state.menuItems.findIndex((i) => i.id === id);
  if (index === -1) return null;

  state.menuItems[index] = {
    ...state.menuItems[index],
    ...updates,
    price: updates.price !== undefined ? Number(updates.price) : state.menuItems[index].price,
    tax_rate: updates.tax_rate !== undefined ? Number(updates.tax_rate) : state.menuItems[index].tax_rate,
    updated_at: new Date().toISOString(),
  };
  saveLocalState(state);
  return state.menuItems[index];
}

export function deleteMenuItem(id: string): boolean {
  const state = getLocalState();
  const initialLen = state.menuItems.length;
  state.menuItems = state.menuItems.filter((i) => i.id !== id);
  if (state.menuItems.length !== initialLen) {
    saveLocalState(state);
    return true;
  }
  return false;
}

export function toggleMenuItemAvailability(itemId: string): boolean {
  const state = getLocalState();
  const item = state.menuItems.find((i) => i.id === itemId);
  if (item) {
    item.is_available = !item.is_available;
    item.updated_at = new Date().toISOString();
    saveLocalState(state);
    return item.is_available;
  }
  return false;
}

export function updateMenuItemPrice(itemId: string, newPrice: number): boolean {
  const state = getLocalState();
  const item = state.menuItems.find((i) => i.id === itemId);
  if (item && newPrice >= 0) {
    item.price = Number(newPrice);
    item.updated_at = new Date().toISOString();
    saveLocalState(state);
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// TABLE MANAGEMENT
// -------------------------------------------------------------
export function addTable(tableNumber: string): RestaurantTable {
  const state = getLocalState();
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  let token = "tbl_";
  for (let i = 0; i < 7; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const newTable: RestaurantTable = {
    id: `tbl-${Date.now()}`,
    restaurant_id: state.restaurant.id,
    table_number: tableNumber.trim(),
    token: token,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  state.tables.push(newTable);
  saveLocalState(state);
  return newTable;
}

export function updateTable(id: string, tableNumber: string): RestaurantTable | null {
  const state = getLocalState();
  const table = state.tables.find((t) => t.id === id);
  if (!table) return null;
  table.table_number = tableNumber.trim();
  table.updated_at = new Date().toISOString();
  saveLocalState(state);
  return table;
}

export function deleteTable(id: string): boolean {
  const state = getLocalState();
  const prevLen = state.tables.length;
  state.tables = state.tables.filter((t) => t.id !== id);
  if (state.tables.length !== prevLen) {
    saveLocalState(state);
    return true;
  }
  return false;
}

export function toggleTableStatus(id: string): boolean {
  const state = getLocalState();
  const table = state.tables.find((t) => t.id === id);
  if (!table) return false;
  table.is_active = !table.is_active;
  table.updated_at = new Date().toISOString();
  saveLocalState(state);
  return table.is_active;
}

export function regenerateTableToken(id: string): string | null {
  const state = getLocalState();
  const table = state.tables.find((t) => t.id === id);
  if (!table) return null;
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  let token = "tbl_";
  for (let i = 0; i < 7; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  table.token = token;
  table.updated_at = new Date().toISOString();
  saveLocalState(state);
  return token;
}

// -------------------------------------------------------------
// ORDER MANAGEMENT
// -------------------------------------------------------------
export function updateOrderStatus(orderId: string, status: OrderStatus): void {
  const state = getLocalState();
  const index = state.orders.findIndex((o) => o.id === orderId);
  if (index !== -1) {
    const currentStatus = state.orders[index].status as OrderStatus;
    // Enforce state machine — throws if transition is illegal
    assertValidOrderTransition(currentStatus, status, orderId);
    state.orders[index].status = status;
    state.orders[index].updated_at = new Date().toISOString();
    saveLocalState(state);
    // Audit log
    if (typeof window !== "undefined") {
      console.info(
        `[Orderly Audit] Order ${orderId}: ${currentStatus} → ${status} at ${new Date().toISOString()}`
      );
    }
  }
}

export function createOrderFromCustomer(data: {
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items: { item: MenuItem; quantity: number }[];
}): Order & { table_number?: string; items?: any[] } {
  const state = getLocalState();
  const taxRate = state.restaurant.tax_rate !== undefined ? Number(state.restaurant.tax_rate) : 5.0;
  const subtotal = data.items.reduce(
    (sum, cur) => sum + cur.item.price * cur.quantity,
    0
  );
  const tax = Number(((subtotal * taxRate) / 100).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));
  const orderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderId = `ord-${Date.now()}`;

  const newOrder: Order & { table_number?: string; items?: any[] } = {
    id: orderId,
    restaurant_id: data.restaurantId,
    table_id: data.tableId,
    table_number: data.tableNumber,
    order_number: orderNum,
    subtotal,
    tax,
    total,
    currency: state.restaurant.currency || "INR",
    status: "PAID",
    payment_status: "SUCCESS",
    customer_name: data.customerName || "Walk-in Guest",
    customer_phone: data.customerPhone || "",
    notes: data.notes || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: data.items.map((i, idx) => {
      const itemTaxRate = i.item.tax_rate !== undefined ? Number(i.item.tax_rate) : taxRate;
      const lineSub = i.item.price * i.quantity;
      const lineTax = Number(((lineSub * itemTaxRate) / 100).toFixed(2));
      return {
        id: `oi-${orderId}-${idx}`,
        order_id: orderId,
        menu_item_id: i.item.id,
        item_name_snapshot: i.item.name,
        unit_price_snapshot: i.item.price,
        quantity: i.quantity,
        tax: lineTax,
        total: Number((lineSub + lineTax).toFixed(2)),
      };
    }),
  };

  state.orders.unshift(newOrder);

  // Also record payment conforming to payment schema
  const newPayment: Payment = {
    id: `pay-${Date.now()}`,
    order_id: orderId,
    restaurant_id: data.restaurantId,
    gateway: "Orderly Payment Engine (Verified)",
    gateway_order_id: `rzp_ord_${Date.now()}`,
    gateway_payment_id: `pay_${Date.now()}`,
    amount: total,
    currency: state.restaurant.currency || "INR",
    status: "SUCCESS",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.payments.unshift(newPayment);

  saveLocalState(state);
  return newOrder;
}
