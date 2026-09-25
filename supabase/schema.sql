-- ==============================================================================
-- ORDERLY SAAS — MULTI-TENANT DATABASE SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('OWNER', 'MANAGER', 'KITCHEN', 'STAFF');
CREATE TYPE dietary_type AS ENUM ('VEG', 'NON_VEG', 'VEGAN', 'EGG');
CREATE TYPE order_status AS ENUM (
  'CREATED',
  'PAYMENT_PENDING',
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED'
);
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. RESTAURANTS
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  opening_hours JSONB DEFAULT '{}'::jsonb,
  currency TEXT NOT NULL DEFAULT 'INR',
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);

-- 4. RESTAURANT MEMBERS (MULTI-TENANCY RBAC)
CREATE TABLE IF NOT EXISTS public.restaurant_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'OWNER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_members_user ON public.restaurant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_members_restaurant ON public.restaurant_members(restaurant_id);

-- 5. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_restaurant_order ON public.categories(restaurant_id, sort_order);

-- 6. MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (tax_rate >= 0),
  is_available BOOLEAN NOT NULL DEFAULT true,
  dietary_type dietary_type NOT NULL DEFAULT 'VEG',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_cat ON public.menu_items(restaurant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_availability ON public.menu_items(restaurant_id, is_available);

-- 7. RESTAURANT TABLES
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_tables_token ON public.restaurant_tables(token);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON public.restaurant_tables(restaurant_id);

-- 8. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  tax NUMERIC(10, 2) NOT NULL CHECK (tax >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status order_status NOT NULL DEFAULT 'CREATED',
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_id);

-- 9. ORDER ITEMS (HISTORICAL PRICING SNAPSHOT)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name_snapshot TEXT NOT NULL,
  unit_price_snapshot NUMERIC(10, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 10. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL,
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'PENDING',
  idempotency_key TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order ON public.payments(gateway_order_id);

-- 11. PAYMENT WEBHOOKS (IDEMPOTENCY LOG)
CREATE TABLE IF NOT EXISTS public.payment_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL UNIQUE,
  gateway TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_event ON public.payment_webhooks(event_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user restaurant IDs
CREATE OR REPLACE FUNCTION public.get_user_restaurant_ids(user_uuid UUID)
RETURNS TABLE (restaurant_id UUID) 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
AS $$
  SELECT restaurant_id FROM public.restaurant_members WHERE user_id = user_uuid;
$$;

-- Helper function: Check if user is member of restaurant
CREATE OR REPLACE FUNCTION public.is_restaurant_member(rest_id UUID, user_uuid UUID)
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_members 
    WHERE restaurant_id = rest_id AND user_id = user_uuid
  );
$$;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- RESTAURANTS POLICIES
-- Authenticated members can view their restaurant
CREATE POLICY "Members can view their restaurant" 
  ON public.restaurants FOR SELECT 
  TO authenticated
  USING (id IN (SELECT get_user_restaurant_ids(auth.uid())));

-- Public anonymous can view active restaurant metadata (for customer QR browsing)
CREATE POLICY "Public can view active restaurants" 
  ON public.restaurants FOR SELECT 
  TO anon, authenticated
  USING (is_active = true);

-- Authenticated users can insert restaurants (onboarding)
CREATE POLICY "Authenticated users can create restaurants" 
  ON public.restaurants FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Only owners/managers can update restaurant
CREATE POLICY "Members can update their restaurant" 
  ON public.restaurants FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_members 
      WHERE restaurant_id = id 
        AND user_id = auth.uid() 
        AND role IN ('OWNER', 'MANAGER')
    )
  );

-- RESTAURANT MEMBERS POLICIES
CREATE POLICY "Members can view membership" 
  ON public.restaurant_members FOR SELECT 
  TO authenticated
  USING (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())));

CREATE POLICY "Owners can manage membership" 
  ON public.restaurant_members FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_members 
      WHERE restaurant_id = restaurant_members.restaurant_id 
        AND user_id = auth.uid() 
        AND role = 'OWNER'
    )
  );

-- CATEGORIES POLICIES
CREATE POLICY "Public can view active categories of active restaurants" 
  ON public.categories FOR SELECT 
  TO anon, authenticated
  USING (
    is_active = true AND 
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = categories.restaurant_id AND r.is_active = true)
  );

CREATE POLICY "Members can manage categories" 
  ON public.categories FOR ALL 
  TO authenticated
  USING (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())));

-- MENU ITEMS POLICIES
CREATE POLICY "Public can view available menu items" 
  ON public.menu_items FOR SELECT 
  TO anon, authenticated
  USING (
    is_available = true AND 
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_items.restaurant_id AND r.is_active = true)
  );

CREATE POLICY "Members can manage menu items" 
  ON public.menu_items FOR ALL 
  TO authenticated
  USING (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())));

-- RESTAURANT TABLES POLICIES
CREATE POLICY "Public can lookup active tables by token" 
  ON public.restaurant_tables FOR SELECT 
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Members can manage tables" 
  ON public.restaurant_tables FOR ALL 
  TO authenticated
  USING (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())));

-- ORDERS POLICIES
CREATE POLICY "Members can view their restaurant orders" 
  ON public.orders FOR SELECT 
  TO authenticated
  USING (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())));

CREATE POLICY "Members can update their restaurant orders" 
  ON public.orders FOR UPDATE 
  TO authenticated
  USING (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())));

-- Public anonymous customers can create an order
CREATE POLICY "Public can insert orders" 
  ON public.orders FOR INSERT 
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurant_tables t 
      WHERE t.id = orders.table_id 
        AND t.restaurant_id = orders.restaurant_id 
        AND t.is_active = true
    )
  );

-- Public can view specific order if created
CREATE POLICY "Public can read order details" 
  ON public.orders FOR SELECT 
  TO anon, authenticated
  USING (true);

-- ORDER ITEMS POLICIES
CREATE POLICY "Public and members can view order items" 
  ON public.order_items FOR SELECT 
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert order items" 
  ON public.order_items FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- PAYMENTS POLICIES
CREATE POLICY "Members can view payments" 
  ON public.payments FOR SELECT 
  TO authenticated
  USING (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())));

-- Triggers for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_restaurant_tables_updated_at BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
