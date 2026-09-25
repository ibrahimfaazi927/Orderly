"use client";

import { useState, useEffect, use, useMemo, useRef } from "react";
import {
  getLocalState,
  saveLocalState,
  createOrderFromCustomer,
} from "@/lib/store";
import { Restaurant, RestaurantTable, MenuItem, Category, DietaryType } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { playOrderReadyRing } from "@/lib/audio-notifications";
import {
  UtensilsCrossed,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Search,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  CreditCard,
  ChefHat,
  X,
  Flame,
  CheckCircle2,
  Phone,
  User,
  MessageSquare,
  ChevronRight,
  Receipt,
  BellRing,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

interface CartItem {
  item: MenuItem;
  quantity: number;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CustomerOrderPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string; tableToken: string }>;
}) {
  const resolvedParams = use(params);
  const { restaurantSlug, tableToken } = resolvedParams;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [dietaryFilter, setDietaryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart & Customer Inputs
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");

  // Payment State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"UPI" | "CARD" | "NETBANKING">("UPI");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Post-order tracker
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [callWaiterSent, setCallWaiterSent] = useState(false);
  const previousStatusRef = useRef<string | null>(null);

  // Sync state
  const sync = () => {
    const state = getLocalState();
    setRestaurant(state.restaurant);
    const matchedTable = state.tables.find((t) => t.token === tableToken);
    setTable(
      matchedTable || {
        id: "tbl-fallback",
        restaurant_id: state.restaurant.id,
        table_number: "Table 01",
        token: tableToken,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
    setCategories(state.categories || []);
    setMenuItems(state.menuItems || []);

    // Check if active order status updated in kitchen
    if (activeOrder) {
      const refreshed = state.orders.find((o) => o.id === activeOrder.id);
      if (refreshed && refreshed.status !== activeOrder.status) {
        if (refreshed.status === "READY" && activeOrder.status !== "READY") {
          // Play resonant ring effect on customer's phone + vibration
          playOrderReadyRing();
        }
        setActiveOrder(refreshed);
      }
    }
  };

  // Watch status changes to trigger ready chime
  useEffect(() => {
    if (activeOrder?.status) {
      if (activeOrder.status === "READY" && previousStatusRef.current && previousStatusRef.current !== "READY") {
        playOrderReadyRing();
      }
      previousStatusRef.current = activeOrder.status;
    }
  }, [activeOrder?.status]);

  useEffect(() => {
    sync();
    window.addEventListener("orderly_storage_change", sync);
    const interval = setInterval(sync, 2000); // Polling for live kitchen updates
    return () => {
      window.removeEventListener("orderly_storage_change", sync);
      clearInterval(interval);
    };
  }, [tableToken, activeOrder?.id, activeOrder?.status]);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  // Cart helper functions
  const addToCart = (item: MenuItem) => {
    setPaymentIntent(null);
    setCheckoutError(null);
    setPaymentError(null);
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setPaymentIntent(null);
    setCheckoutError(null);
    setPaymentError(null);
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id === itemId) {
            const newQ = c.quantity + delta;
            return newQ > 0 ? { ...c, quantity: newQ } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const getItemQuantity = (itemId: string) => {
    return cart.find((c) => c.item.id === itemId)?.quantity || 0;
  };

  // Client calculations
  const subtotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const taxRate = restaurant?.tax_rate || 5;
  const tax = Number(((subtotal * taxRate) / 100).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));
  const totalItemsCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const currency = restaurant?.currency || "INR";

  // Filter items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.is_available) return false;
      const matchesCategory =
        selectedCategory === "ALL" || item.category_id === selectedCategory;
      const matchesDiet =
        dietaryFilter === "ALL" || item.dietary_type === dietaryFilter;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesDiet && matchesSearch;
    });
  }, [menuItems, selectedCategory, dietaryFilter, searchQuery]);

  // Verify completed payment on the backend (Zero-Trust HMAC Signature Verification)
  const verifyPaymentOnServer = async (payload: {
    orderId: string;
    orderNumber: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
  }) => {
    setIsProcessingPayment(true);
    setCheckoutError(null);
    setPaymentError(null);

    try {
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Payment verification failed. Please contact restaurant staff.");
      }

      // ONLY after verified server confirmation: synchronize in client store
      const order = createOrderFromCustomer({
        restaurantId: restaurant?.id || "",
        tableId: table?.id || "",
        tableNumber: table?.table_number || "Table",
        customerName: customerName.trim() || "Guest",
        customerPhone: customerPhone.trim(),
        notes: specialNotes.trim(),
        items: cart,
      });

      // Set order as active tracker
      setActiveOrder({
        ...order,
        id: payload.orderId || order.id,
        order_number: payload.orderNumber || order.order_number,
        status: "PAID",
      });

      setCart([]);
      setCartOpen(false);
      setShowPaymentModal(false);
      setPaymentIntent(null);
    } catch (err: any) {
      console.error("Payment verification failed:", err);
      const errMsg = err.message || "Payment verification could not be completed. Please try again.";
      setCheckoutError(errMsg);
      setPaymentError(errMsg);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Launch official Razorpay Checkout Modal
  const launchRazorpayCheckout = async (intent: any) => {
    setIsProcessingPayment(true);
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded || !(window as any).Razorpay) {
      setIsProcessingPayment(false);
      setCheckoutError("Failed to load Razorpay payment gateway. Please check your internet connection.");
      return;
    }

    const options = {
      key: intent.keyId,
      amount: Math.round(Number(intent.total) * 100),
      currency: intent.currency || "INR",
      name: restaurant?.name || intent.restaurantName || "Orderly Restaurant",
      description: `Order #${intent.orderNumber} - Table ${table?.table_number || intent.tableNumber}`,
      order_id: intent.gatewayOrderId,
      prefill: {
        name: customerName.trim() || undefined,
        contact: customerPhone.trim() || undefined,
      },
      notes: {
        orderId: intent.orderId,
        orderNumber: intent.orderNumber,
        tableToken,
        restaurantSlug,
      },
      theme: {
        color: "#059669", // emerald-600
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        await verifyPaymentOnServer({
          orderId: intent.orderId,
          orderNumber: intent.orderNumber,
          gatewayOrderId: response.razorpay_order_id,
          gatewayPaymentId: response.razorpay_payment_id,
          gatewaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          setIsProcessingPayment(false);
          setCheckoutError("Payment was cancelled or closed. You can retry paying whenever ready.");
        },
      },
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setIsProcessingPayment(false);
        const reason = resp?.error?.description || resp?.error?.reason || "Payment was declined or failed";
        setCheckoutError(`Payment failed: ${reason}. Please try again.`);
      });
      rzp.open();
    } catch (err: any) {
      setIsProcessingPayment(false);
      setCheckoutError(err.message || "Failed to open Razorpay checkout.");
    }
  };

  // Initiate dynamic payment order
  const handleInitiatePayment = async () => {
    if (cart.length === 0 || !restaurant || !table || isProcessingPayment) return;
    setIsProcessingPayment(true);
    setCheckoutError(null);
    setPaymentError(null);

    try {
      // If we already have a generated order for this cart session, reuse it on retry
      let intent = paymentIntent;
      if (!intent || !intent.gatewayOrderId) {
        // Call Server Payment Order Endpoint for Zero-Trust Recalculation
        const res = await fetch("/api/payments/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantSlug,
            tableToken,
            items: cart.map((c) => ({ itemId: c.item.id, quantity: c.quantity })),
            customerName: customerName.trim() || "Guest",
            customerPhone: customerPhone.trim(),
            notes: specialNotes.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to initiate payment session");
        }

        intent = data;
        setPaymentIntent(data);
      }

      if (intent.provider === "razorpay") {
        await launchRazorpayCheckout(intent);
      } else {
        // Fallback to Sandbox Modal for mock testing without Razorpay keys
        setShowPaymentModal(true);
        setIsProcessingPayment(false);
      }
    } catch (err: any) {
      console.warn("Initiate payment error:", err);
      setIsProcessingPayment(false);
      setCheckoutError(err.message || "Payment initiation failed. Please try again.");
    }
  };

  // Complete Payment for Mock Sandbox Simulator
  const handleCompletePayment = async () => {
    if (!paymentIntent || !restaurant || !table || isProcessingPayment) return;

    if (paymentIntent.provider === "razorpay") {
      await launchRazorpayCheckout(paymentIntent);
      return;
    }

    // Sandbox Mock Provider verification only
    await verifyPaymentOnServer({
      orderId: paymentIntent.orderId,
      orderNumber: paymentIntent.orderNumber,
      gatewayOrderId: paymentIntent.gatewayOrderId,
      gatewayPaymentId: `pay_mock_${Date.now()}`,
      gatewaySignature: "sig_mock_verified_ok",
    });
  };

  const handleCallWaiter = () => {
    setCallWaiterSent(true);
    setTimeout(() => setCallWaiterSent(false), 4000);
  };

  // -------------------------------------------------------------
  // ACTIVE ORDER TRACKING VIEW
  // -------------------------------------------------------------
  if (activeOrder) {
    const statusSteps = [
      { id: "PAID", label: "Payment Confirmed", desc: "Order sent to kitchen" },
      { id: "ACCEPTED", label: "Accepted by Chef", desc: "Ticket acknowledged" },
      { id: "PREPARING", label: "Preparing Food", desc: "Currently on the stove/grill" },
      { id: "READY", label: "Ready to Serve", desc: "Plated & headed to table" },
      { id: "COMPLETED", label: "Order Completed", desc: "Enjoy your dining experience" },
    ];

    const currentStepIndex = Math.max(
      0,
      statusSteps.findIndex((s) => s.id === activeOrder.status)
    );

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                {restaurant?.name || "Orderly Restaurant"}
              </h1>
              <span className="text-xs font-semibold text-emerald-600">
                {table?.table_number || "Table"}
              </span>
            </div>
          </div>

          <button
            onClick={handleCallWaiter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              callWaiterSent
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <BellRing className="h-3.5 w-3.5" />
            {callWaiterSent ? "Waiter Notified!" : "Call Waiter"}
          </button>
        </header>

        <main className="max-w-md mx-auto p-5 space-y-6">
          {/* Order Ready Alert Ring Banner */}
          {activeOrder.status === "READY" && (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-xl flex items-center justify-between border border-emerald-400/40 animate-in zoom-in-95">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 animate-bounce">
                  <BellRing className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                    Order Is Ready!
                  </div>
                  <div className="text-sm font-black text-white mt-0.5 truncate">
                    Food on its way to {activeOrder.table_number || table?.table_number}!
                  </div>
                  <div className="text-[11px] text-emerald-100">
                    Hot & fresh from the kitchen.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => playOrderReadyRing()}
                className="px-3 py-2 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 transition cursor-pointer shrink-0 ml-2 flex items-center gap-1"
                title="Replay ring chime"
              >
                <span>🔔 Ring</span>
              </button>
            </div>
          )}

          {/* Order Header Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs text-center space-y-3">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Payment Verified
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                {activeOrder.order_number}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assigned to <strong>{activeOrder.table_number || table?.table_number}</strong>
              </p>
            </div>
          </div>

          {/* Realtime Live Kitchen Status Tracker */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                Live Kitchen Status
              </h3>
              <span className="text-[11px] text-slate-400 font-medium animate-pulse">
                • Auto-refreshing
              </span>
            </div>

            <div className="space-y-6 pt-2">
              {statusSteps.map((step, idx) => {
                const isPassed = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isUpcoming = idx > currentStepIndex;

                return (
                  <div key={step.id} className="flex items-start gap-4 relative">
                    {/* Connecting line */}
                    {idx < statusSteps.length - 1 && (
                      <div
                        className={`absolute left-4 top-8 -bottom-6 w-0.5 transition-colors ${
                          idx < currentStepIndex ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                      />
                    )}

                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all z-10 ${
                        isPassed
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <div className="min-w-0 pt-0.5">
                      <h4
                        className={`text-sm font-bold leading-tight ${
                          isCurrent
                            ? "text-emerald-600"
                            : isPassed
                            ? "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </h4>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ordered Items Receipt Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-slate-600" />
                Order Summary
              </h3>
              <span className="text-xs font-bold text-slate-900">
                {formatCurrency(activeOrder.total, activeOrder.currency || currency)}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {activeOrder.items?.map((item: any, idx: number) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 tabular-nums">
                      {item.quantity}x
                    </span>
                    <span className="text-slate-700">
                      {item.item_name_snapshot || item.name}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(
                      (item.unit_price_snapshot || item.price) * item.quantity,
                      currency
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(activeOrder.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST / Tax ({restaurant?.tax_rate || 5}%)</span>
                <span>{formatCurrency(activeOrder.tax, currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-100">
                <span>Total Paid</span>
                <span className="text-emerald-600 font-black">
                  {formatCurrency(activeOrder.total, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => setActiveOrder(null)}
              className="w-full py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Order More Items
            </button>
          </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN MENU BROWSING VIEW
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-2xs">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {(restaurant?.name || "O").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-slate-900 truncate leading-tight">
                {restaurant?.name || "Orderly Restaurant"}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {table?.table_number || "Table 01"}
                </span>
                <span>•</span>
                <span>Scan & Pay</span>
              </div>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 bg-slate-900 text-white rounded-xl shadow-xs hover:bg-slate-800 transition shrink-0"
              title="View Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                {totalItemsCount}
              </span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mt-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search appetizing dishes, drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 text-xs rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-slate-900 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Dietary Filters */}
        <div className="max-w-md mx-auto mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
          {[
            { id: "ALL", label: "All Dishes" },
            { id: "VEG", label: "🟢 Veg" },
            { id: "NON_VEG", label: "🔴 Non-Veg" },
            { id: "VEGAN", label: "🌿 Vegan" },
            { id: "EGG", label: "🟡 Egg" },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDietaryFilter(d.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition min-h-[36px] ${
                dietaryFilter === d.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Category Tabs */}
        <div className="max-w-md mx-auto mt-2 flex items-center gap-2 overflow-x-auto pb-0.5 border-t border-slate-100 pt-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`pb-1 text-xs font-bold whitespace-nowrap transition border-b-2 min-h-[36px] ${
              selectedCategory === "ALL"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`pb-1 text-xs font-bold whitespace-nowrap transition border-b-2 min-h-[36px] ${
                selectedCategory === cat.id
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Menu List */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200">
            <UtensilsCrossed className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No dishes found</h3>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your category or dietary filter.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const qty = getItemQuantity(item.id);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition flex gap-3.5"
              >
                {/* Image */}
                <div className="relative h-24 w-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      <UtensilsCrossed className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full inline-block ring-2 ring-white ${
                        item.dietary_type === "VEG" || item.dietary_type === "VEGAN"
                          ? "bg-emerald-500"
                          : item.dietary_type === "EGG"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {item.description || "Freshly cooked to order."}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                      {formatCurrency(item.price, currency)}
                    </span>

                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition active:scale-95 min-h-[44px] min-w-[44px]"
                      >
                        <Plus className="h-3 w-3" />
                        ADD
                      </button>
                    ) : (
                      <div className="inline-flex items-center bg-slate-900 text-white rounded-lg px-1 py-0.5 shadow-xs">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1.5 hover:bg-slate-800 rounded transition min-h-[44px] min-w-[36px] flex items-center justify-center"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-black tabular-nums">
                          {qty}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1.5 hover:bg-slate-800 rounded transition min-h-[44px] min-w-[36px] flex items-center justify-center"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-slate-900 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between hover:bg-slate-800 transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                {totalItemsCount}
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400 font-medium">
                  {totalItemsCount} item{totalItemsCount !== 1 ? "s" : ""} added
                </div>
                <div className="text-sm font-black tabular-nums">
                  {formatCurrency(total, currency)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
              Review Cart
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}

      {/* =================== SLIDE-OUT CART DRAWER =================== */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Your Order Cart
                </h3>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="divide-y divide-slate-100">
                {cart.map(({ item, quantity }) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {formatCurrency(item.price, currency)} each
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-bold tabular-nums text-slate-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="text-xs font-extrabold text-slate-900 tabular-nums w-16 text-right">
                        {formatCurrency(item.price * quantity, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Cooking Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                  Kitchen Cooking Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Less spicy, dressing on the side, no onions..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Customer Contact Details */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Contact Information
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Your Name (Optional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Mobile Phone (for SMS receipt)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bill Breakdown */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(subtotal, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Tax ({taxRate}%)</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(tax, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-emerald-600 font-black tabular-nums">
                    {formatCurrency(total, currency)}
                  </span>
                </div>
              </div>
              {/* Error banner if checkout initiation fails */}
              {checkoutError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>{checkoutError}</div>
                </div>
              )}
            </div>

            {/* Drawer Footer Checkout Button */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <button
                type="button"
                onClick={handleInitiatePayment}
                disabled={isProcessingPayment || cart.length === 0}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-sm"
              >
                <CreditCard className="h-4 w-4" />
                {isProcessingPayment
                  ? "Securing Payment Session..."
                  : `Pay & Place Order • ${formatCurrency(total, currency)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== DYNAMIC PAYMENT GATEWAY MODAL =================== */}
      {showPaymentModal && paymentIntent && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-sm w-full p-5 sm:p-6 space-y-5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Orderly Secure Checkout
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {paymentIntent.orderNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center py-2">
              <div className="text-xs text-slate-500 font-medium">Amount Due</div>
              <div className="text-3xl font-black text-slate-900 mt-0.5 tabular-nums">
                {formatCurrency(paymentIntent.total, paymentIntent.currency || currency)}
              </div>
              <div className="text-[11px] text-emerald-600 font-bold mt-1">
                Zero-Trust Server Verified
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase text-slate-500">
                Select Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "UPI", label: "UPI Apps", icon: "⚡" },
                  { id: "CARD", label: "Cards", icon: "💳" },
                  { id: "NETBANKING", label: "NetBank", icon: "🏛️" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedPaymentMethod(m.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                      selectedPaymentMethod === m.id
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-base mb-1">{m.icon}</div>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Razorpay or Sandbox notice */}
            {paymentIntent.provider === "razorpay" ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Razorpay Secured Gateway
                </div>
                <p className="text-[11px] text-slate-600">
                  Official Razorpay checkout supporting UPI (GPay, PhonePe, Paytm), Netbanking, and Cards.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">
                  Sandbox Payment Simulator
                </div>
                <p className="text-[11px] text-slate-500">
                  Simulated local development mode without active Razorpay credentials.
                </p>
              </div>
            )}

            {/* Error banner if payment verification fails */}
            {paymentError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{paymentError}</div>
              </div>
            )}

            <button
              onClick={handleCompletePayment}
              disabled={isProcessingPayment}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {isProcessingPayment ? (
                "Processing..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {paymentIntent.provider === "razorpay"
                    ? `Open Razorpay • ${formatCurrency(paymentIntent.total, paymentIntent.currency || currency)}`
                    : `Confirm Simulated Payment • ${formatCurrency(paymentIntent.total, currency)}`}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
