import fs from "fs";
import path from "path";
import {
  MOCK_RESTAURANT,
  MOCK_CATEGORIES,
  MOCK_MENU_ITEMS,
  MOCK_TABLES,
} from "./data/mock-data";
import { Restaurant, Category, MenuItem, RestaurantTable } from "@/types/database";

interface DemoStoreData {
  restaurants: Record<string, Restaurant>;
  categories: Category[];
  menuItems: MenuItem[];
  tables: RestaurantTable[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "demo-store.json");

function getInitialData(): DemoStoreData {
  return {
    restaurants: {
      [MOCK_RESTAURANT.id]: MOCK_RESTAURANT,
      [MOCK_RESTAURANT.slug]: MOCK_RESTAURANT,
    },
    categories: [...MOCK_CATEGORIES],
    menuItems: [...MOCK_MENU_ITEMS],
    tables: [...MOCK_TABLES],
  };
}

export function readDemoStore(): DemoStoreData {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = getInitialData();
      writeDemoStore(initial);
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[Demo Store] Failed to read file, using initial data:", err);
    return getInitialData();
  }
}

export function writeDemoStore(data: DemoStoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[Demo Store] Failed to persist file:", err);
  }
}

export function findDemoRestaurant(slugOrId: string): Restaurant | null {
  const store = readDemoStore();
  const clean = slugOrId.trim().toLowerCase();
  const cleanNoHyphen = clean.replace(/-/g, "");

  // Look in restaurants map
  for (const rest of Object.values(store.restaurants)) {
    const s = (rest.slug || "").toLowerCase();
    const id = (rest.id || "").toLowerCase();
    const sNoHyphen = s.replace(/-/g, "");
    if (s === clean || sNoHyphen === cleanNoHyphen || id === clean) {
      return rest;
    }
  }

  // Also match by name if slug matches sanitized name
  for (const rest of Object.values(store.restaurants)) {
    const nameClean = (rest.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (nameClean && nameClean === cleanNoHyphen) {
      return rest;
    }
  }

  return null;
}

export function getDemoCategories(restaurantId: string): Category[] {
  const store = readDemoStore();
  return store.categories.filter((c) => c.restaurant_id === restaurantId);
}

export function getDemoMenuItems(restaurantId: string): MenuItem[] {
  const store = readDemoStore();
  return store.menuItems.filter((m) => m.restaurant_id === restaurantId);
}

export function getDemoTables(restaurantId: string): RestaurantTable[] {
  const store = readDemoStore();
  return store.tables.filter((t) => t.restaurant_id === restaurantId);
}

export function findDemoTable(restaurantId: string, token: string): RestaurantTable | null {
  const store = readDemoStore();
  return (
    store.tables.find(
      (t) => t.restaurant_id === restaurantId && (t.token === token || t.id === token)
    ) || null
  );
}

export function saveDemoRestaurant(rest: Restaurant): void {
  const store = readDemoStore();
  store.restaurants[rest.id] = rest;
  if (rest.slug) {
    store.restaurants[rest.slug] = rest;
  }
  writeDemoStore(store);
}

export function saveDemoCategory(cat: Category): void {
  const store = readDemoStore();
  const idx = store.categories.findIndex((c) => c.id === cat.id);
  if (idx >= 0) {
    store.categories[idx] = cat;
  } else {
    store.categories.push(cat);
  }
  writeDemoStore(store);
}

export function saveDemoMenuItem(item: MenuItem): void {
  const store = readDemoStore();
  const idx = store.menuItems.findIndex((m) => m.id === item.id);
  if (idx >= 0) {
    store.menuItems[idx] = item;
  } else {
    store.menuItems.push(item);
  }
  writeDemoStore(store);
}

export function saveDemoTable(table: RestaurantTable): void {
  const store = readDemoStore();
  const idx = store.tables.findIndex((t) => t.id === table.id || t.token === table.token);
  if (idx >= 0) {
    store.tables[idx] = table;
  } else {
    store.tables.push(table);
  }
  writeDemoStore(store);
}

export function syncFullDemoRestaurant(payload: {
  restaurant: Restaurant;
  categories?: Category[];
  menuItems?: MenuItem[];
  tables?: RestaurantTable[];
}): void {
  const store = readDemoStore();
  const rest = payload.restaurant;
  if (!rest) return;

  store.restaurants[rest.id] = rest;
  if (rest.slug) {
    store.restaurants[rest.slug] = rest;
  }

  if (payload.categories && payload.categories.length > 0) {
    for (const cat of payload.categories) {
      const idx = store.categories.findIndex((c) => c.id === cat.id);
      if (idx >= 0) store.categories[idx] = cat;
      else store.categories.push(cat);
    }
  }

  if (payload.menuItems && payload.menuItems.length > 0) {
    for (const item of payload.menuItems) {
      const idx = store.menuItems.findIndex((m) => m.id === item.id);
      if (idx >= 0) store.menuItems[idx] = item;
      else store.menuItems.push(item);
    }
  }

  if (payload.tables && payload.tables.length > 0) {
    for (const tbl of payload.tables) {
      const idx = store.tables.findIndex((t) => t.id === tbl.id || t.token === tbl.token);
      if (idx >= 0) store.tables[idx] = tbl;
      else store.tables.push(tbl);
    }
  }

  writeDemoStore(store);
}
