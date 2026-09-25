export type UserRole = 'OWNER' | 'MANAGER' | 'KITCHEN' | 'STAFF';

export type BusinessType =
  | 'RESTAURANT'
  | 'CAFE'
  | 'ICE_CREAM'
  | 'BAKERY'
  | 'FOOD_TRUCK'
  | 'BAR_PUB'
  | 'FAST_FOOD'
  | 'OTHER';

export type DietaryType = 'VEG' | 'NON_VEG' | 'VEGAN' | 'EGG';

export type OrderStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface Profile {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  business_type?: BusinessType | string | null;
  logo_url?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  opening_hours?: Record<string, string> | null;
  currency: string;
  tax_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantMember {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  tax_rate: number;
  is_available: boolean;
  dietary_type: DietaryType;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  order_number: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  customer_name?: string | null;
  customer_phone?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id?: string | null;
  item_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  tax: number;
  total: number;
  notes?: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  restaurant_id: string;
  gateway: string;
  gateway_order_id?: string | null;
  gateway_payment_id?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotency_key?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}
