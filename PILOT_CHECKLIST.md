# 🚀 Orderly Pilot Checklist — Restaurant Onboarding Guide

> Complete this checklist before going live with Orderly in your restaurant.

---

## 1. Restaurant Profile Setup

- [ ] Log in to the Orderly Dashboard at `https://your-domain.com/login`
- [ ] Navigate to **Settings** → **Restaurant Profile**
- [ ] Enter your restaurant's full legal name
- [ ] Set the correct **slug** (URL-friendly name, e.g., `spice-route`)
- [ ] Set your **currency** (INR, USD, etc.)
- [ ] Set your **GST/Tax Rate** (e.g., 5%, 18%)
- [ ] Save and verify changes are reflected in the dashboard header

---

## 2. Menu & Categories Setup

### Categories
- [ ] Navigate to **Menu** in the dashboard sidebar
- [ ] Create your food categories (e.g., "Starters", "Main Course", "Beverages", "Desserts")
- [ ] Reorder categories by priority (most popular first)

### Menu Items
- [ ] Add all menu items with:
  - **Name** — Dish name as customers will see it
  - **Price** — Accurate selling price (this is the authoritative source — customers cannot manipulate)
  - **Category** — Assign to the correct category
  - **Dietary Type** — VEG / NON_VEG / VEGAN / EGG
  - **Description** — Short, appetizing description (visible to customers)
  - **Tax Rate** — Per-item override if different from restaurant default (optional)
- [ ] Toggle **availability** off for items that are temporarily unavailable
- [ ] Preview the menu from a customer's perspective by scanning a QR code

---

## 3. Table Management & QR Codes

- [ ] Navigate to **Tables** in the dashboard sidebar
- [ ] Add all tables with their physical table numbers (e.g., "T1", "Patio 3", "VIP-1")
- [ ] Each table automatically gets a **permanent unique QR token**
- [ ] Print QR codes for each table using the built-in QR generator
- [ ] **Recommended QR placement**: laminated tent cards, table stickers, or acrylic stands
- [ ] Test each QR code on a mobile phone — verify it opens the correct table menu:
  - URL format: `https://your-domain.com/r/{restaurant-slug}/{table-token}`
- [ ] If a QR code is compromised, use **Regenerate Token** (old QR becomes invalid)
- [ ] Deactivate tables that are temporarily out of service

---

## 4. Payment Gateway (Razorpay) Onboarding

### Test Mode (Sandbox)
- [ ] Create a Razorpay account at [dashboard.razorpay.com](https://dashboard.razorpay.com)
- [ ] Generate **Test Mode API Keys** (Key ID starts with `rzp_test_`)
- [ ] Set environment variables:
  ```
  PAYMENT_PROVIDER=razorpay
  RAZORPAY_KEY_ID=rzp_test_your_key_id
  RAZORPAY_KEY_SECRET=your_test_secret
  ```
- [ ] Test the full payment flow end-to-end using Razorpay test card numbers

### Live Mode (Production)
- [ ] Complete Razorpay KYC verification (bank account, PAN, business docs)
- [ ] Activate **Live Mode** in Razorpay Dashboard
- [ ] Generate **Live Mode API Keys** (Key ID starts with `rzp_live_`)
- [ ] Configure **Webhook** in Razorpay Dashboard:
  - **URL**: `https://your-domain.com/api/payments/webhook`
  - **Events**: `payment.captured`, `payment.failed`, `order.paid`
  - Copy the **Webhook Secret** into `RAZORPAY_WEBHOOK_SECRET`
- [ ] Update environment variables to Live keys
- [ ] Set `PAYMENT_PROVIDER=razorpay` (never `sandbox` in production)

---

## 5. Environment Configuration

- [ ] Copy `.env.example` to `.env.local` (or set in hosting dashboard)
- [ ] Configure all required Supabase variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```
- [ ] Set `NEXT_PUBLIC_ENABLE_DEMO_MODE=false` in production
- [ ] Set `NODE_ENV=production` on your hosting platform
- [ ] Verify no secret keys use `NEXT_PUBLIC_` prefix

---

## 6. Kitchen Display System (KDS)

- [ ] Open the Kitchen Display on a tablet or dedicated screen: `https://your-domain.com/kitchen`
- [ ] Log in with staff credentials (or use demo mode during testing)
- [ ] Verify the 4-column workflow:
  1. **New Orders** — Incoming paid orders with audio chime
  2. **Accepted** — Chef acknowledges the ticket
  3. **Cooking** — Currently being prepared
  4. **Ready to Serve** — Plated and waiting for runner
- [ ] Test the audio chime (toggle on/off)
- [ ] Test the table filter dropdown
- [ ] Test the item checklist (tap items to mark as prepared)
- [ ] Verify overdue orders (>15 min) show red pulse warning
- [ ] **Recommended**: Mount the tablet near the kitchen pass/expo station

---

## 7. Staff Access (RBAC)

- [ ] Create Supabase Auth accounts for each staff member
- [ ] Assign roles in the `restaurant_members` table:
  - **OWNER** — Full access to all features
  - **MANAGER** — Menu, tables, orders, reports
  - **STAFF** — Kitchen display, order status updates
- [ ] Test that staff can log in and see only authorized features

---

## 8. Pre-Launch Testing Checklist

### Customer Flow
- [ ] Scan QR code, verify menu loads correctly
- [ ] Add items to cart, check prices match dashboard
- [ ] Apply dietary filters, verify items filter correctly
- [ ] Complete checkout, payment processes correctly
- [ ] Verify order appears in Kitchen Display within 3 seconds
- [ ] Track order status live from customer phone
- [ ] Complete the order in KDS, verify customer sees "Completed"

### Edge Cases
- [ ] Try scanning a deactivated table's QR — should show error
- [ ] Try ordering an unavailable item — should be rejected
- [ ] Try manipulating the price — server recalculates from database (zero-trust)
- [ ] Test with poor network — verify graceful error messages
- [ ] Test on multiple devices simultaneously

### Reports
- [ ] Navigate to **Reports** in dashboard
- [ ] Verify revenue, order count, and top items reflect test orders
- [ ] Test date range filters (Today, 7 Days, 30 Days)

---

## 9. Go-Live Checklist

- [ ] All menu items are accurate and priced correctly
- [ ] All tables have printed QR codes
- [ ] Razorpay Live keys are configured
- [ ] Webhook is configured and verified
- [ ] Demo mode is disabled (`NEXT_PUBLIC_ENABLE_DEMO_MODE=false`)
- [ ] KDS tablet is mounted and connected
- [ ] Staff are trained on the KDS workflow
- [ ] Test a full end-to-end order with a real payment
- [ ] Verify the payment appears in Razorpay Dashboard
- [ ] Monitor the first 10 orders closely

---

## 10. Support & Troubleshooting

| Issue | Solution |
|-------|----------|
| QR code shows wrong table | Regenerate token in Tables dashboard |
| Payment fails | Check Razorpay API keys, verify webhook secret |
| Order doesn't appear in KDS | Check browser tab is open, verify payment completed |
| Customer sees wrong menu | Ensure table token belongs to correct restaurant |
| Reports show zero | Ensure orders have been created after the selected date range |
