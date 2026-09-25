"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  IndianRupee,
  Clock,
  QrCode,
  TrendingUp,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  BookOpen,
  Printer,
  Activity,
} from "lucide-react";
import { getLocalState } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { Order, MenuItem, RestaurantTable } from "@/types/database";

export default function DashboardHomePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [currency, setCurrency] = useState("INR");
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  useEffect(() => {
    const syncData = () => {
      const state = getLocalState();
      setOrders(state.orders || []);
      setMenuItems(state.menuItems || []);
      setTables(state.tables || []);
      setRestaurant(state.restaurant);
      setCurrency(state.restaurant?.currency || "INR");
    };

    syncData();
    window.addEventListener("orderly_storage_change", syncData);
    return () => window.removeEventListener("orderly_storage_change", syncData);
  }, []);

  // Compute metrics
  const todayOrders = orders.length;
  const todayRevenue = orders
    .filter((o) => o.payment_status === "SUCCESS")
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const pendingOrders = orders.filter(
    (o) => o.status === "CREATED" || o.status === "ACCEPTED" || o.status === "PREPARING"
  ).length;
  const activeTablesCount = tables.filter((t) => t.is_active).length;
  const totalTables = tables.length || 1;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(orders.length / ordersPerPage));
  const paginatedOrders = orders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return { label: "Accepted", bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" };
      case "PREPARING":
        return { label: "Preparing", bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" };
      case "READY":
        return { label: "Ready", bg: "#d1fae5", color: "#065f46", dot: "#10b981" };
      case "COMPLETED":
        return { label: "Completed", bg: "#d1fae5", color: "#065f46", dot: "#10b981" };
      case "PAID":
        return { label: "Paid", bg: "#d1fae5", color: "#065f46", dot: "#10b981" };
      default:
        return { label: status || "New", bg: "#e0e7ff", color: "#3730a3", dot: "#6366f1" };
    }
  };

  const getPaymentBadge = (status: string) => {
    if (status === "SUCCESS") return { label: "Paid", bg: "#d1fae5", color: "#065f46", dot: "#10b981" };
    return { label: "Pending", bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" };
  };

  // Top selling items (sorted by price as proxy for popularity)
  const topItems = useMemo(() => {
    return [...menuItems].sort((a, b) => b.price - a.price).slice(0, 5);
  }, [menuItems]);

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#1a2e1f' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: '#5c6b62' }}>
            {greeting}! Here&apos;s what&apos;s happening at {restaurant?.name || "Kati House"} today.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm" style={{ color: '#5c6b62' }}>
          <div className="flex items-center gap-1.5">
            <span>📅</span>
            <span className="font-medium">{dateStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🕐</span>
            <span className="font-medium">{timeStr.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Orders */}
            <div className="rounded-2xl p-5 transition-all duration-200 hover:shadow-md" style={{ background: '#ffffff', border: '1px solid #e0d8cc' }}>
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: '#d8f3dc' }}>
                  <ShoppingBag className="h-5 w-5" style={{ color: '#1b4332' }} />
                </div>
                <span className="text-xs font-medium" style={{ color: '#8a9690' }}>Today</span>
              </div>
              <div className="mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5c6b62' }}>
                  Today&apos;s Orders
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold" style={{ color: '#1a2e1f' }}>{todayOrders}</span>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#d1fae5', color: '#065f46' }}>
                    ↑ 20%
                  </span>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#8a9690' }}>vs. yesterday</div>
              </div>
            </div>

            {/* Today's Revenue */}
            <div className="rounded-2xl p-5 transition-all duration-200 hover:shadow-md" style={{ background: '#ffffff', border: '1px solid #e0d8cc' }}>
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: '#1b4332' }}>
                  <IndianRupee className="h-5 w-5" style={{ color: '#d8f3dc' }} />
                </div>
                <span className="text-xs font-medium" style={{ color: '#8a9690' }}>Revenue</span>
              </div>
              <div className="mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5c6b62' }}>
                  Today&apos;s Revenue
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold" style={{ color: '#1a2e1f' }}>{formatCurrency(todayRevenue, currency)}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#d1fae5', color: '#065f46' }}>
                    ↑ 15%
                  </span>
                  <span className="text-[11px]" style={{ color: '#8a9690' }}>vs. yesterday</span>
                </div>
              </div>
            </div>

            {/* In-Prep Queue */}
            <div className="rounded-2xl p-5 transition-all duration-200 hover:shadow-md" style={{ background: '#ffffff', border: '1px solid #e0d8cc' }}>
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: '#fef3c7' }}>
                  <Clock className="h-5 w-5" style={{ color: '#92400e' }} />
                </div>
                <span className="text-xs font-medium" style={{ color: '#8a9690' }}>Queue</span>
              </div>
              <div className="mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5c6b62' }}>
                  In-Prep Queue
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold" style={{ color: '#1a2e1f' }}>{pendingOrders}</span>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#8a9690' }}>Orders in progress</div>
              </div>
            </div>

            {/* Active Tables */}
            <div className="rounded-2xl p-5 transition-all duration-200 hover:shadow-md" style={{ background: '#ffffff', border: '1px solid #e0d8cc' }}>
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: '#e0e7ff' }}>
                  <QrCode className="h-5 w-5" style={{ color: '#3730a3' }} />
                </div>
                <span className="text-xs font-medium" style={{ color: '#8a9690' }}>Floor</span>
              </div>
              <div className="mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5c6b62' }}>
                  Active Tables
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold" style={{ color: '#1a2e1f' }}>{activeTablesCount}</span>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#8a9690' }}>Out of {totalTables} tables</div>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e0d8cc' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e8e0d4' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#1a2e1f' }}>Recent Orders</h2>
                <p className="text-xs mt-0.5" style={{ color: '#8a9690' }}>Live feed of table orders and payment settlements</p>
              </div>
              <Link
                href="/dashboard/orders"
                className="text-xs font-semibold flex items-center gap-1 transition-colors"
                style={{ color: '#2d6a4f' }}
              >
                View all orders
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ background: '#faf7f2', borderBottom: '1px solid #e8e0d4' }}>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5c6b62' }}>Order ID</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5c6b62' }}>Table</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5c6b62' }}>Items</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5c6b62' }}>Amount</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5c6b62' }}>Payment</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5c6b62' }}>Status</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5c6b62' }}>Time</th>
                    <th className="px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <ShoppingBag className="h-8 w-8" style={{ color: '#d6cfc3' }} />
                          <p className="font-medium text-sm" style={{ color: '#5c6b62' }}>No orders recorded yet</p>
                          <p className="text-xs max-w-sm" style={{ color: '#8a9690' }}>
                            Scan any table QR code or place a test order to see live updates here.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => {
                      const statusConfig = getStatusBadge(order.status);
                      const paymentConfig = getPaymentBadge(order.payment_status);
                      const itemCount = order.items?.length || 0;

                      return (
                        <tr
                          key={order.id}
                          className="transition-colors"
                          style={{ borderBottom: '1px solid #f0ebe3' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <td className="px-6 py-3.5">
                            <div className="font-mono font-bold text-xs" style={{ color: '#1a2e1f' }}>
                              {order.order_number}
                            </div>
                            <div className="text-[11px]" style={{ color: '#8a9690' }}>
                              {order.customer_name || "Guest"}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-medium" style={{ color: '#1a2e1f' }}>
                              {order.table_number || "Table"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-medium" style={{ color: '#5c6b62' }}>
                              {itemCount} {itemCount === 1 ? "item" : "items"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-bold font-mono" style={{ color: '#1a2e1f' }}>
                              {formatCurrency(order.total, currency)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                              style={{ background: paymentConfig.bg, color: paymentConfig.color }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: paymentConfig.dot }} />
                              {paymentConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                              style={{ background: statusConfig.bg, color: statusConfig.color }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusConfig.dot }} />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[11px] font-mono" style={{ color: '#8a9690' }}>
                              {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </td>
                          <td className="px-2 py-3.5">
                            <button className="p-1 rounded hover:bg-black/5 cursor-pointer" style={{ color: '#8a9690' }}>
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {orders.length > 0 && (
              <div className="px-6 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #e8e0d4' }}>
                <span className="text-xs" style={{ color: '#8a9690' }}>
                  Showing {(currentPage - 1) * ordersPerPage + 1}-{Math.min(currentPage * ordersPerPage, orders.length)} of {orders.length} orders
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg disabled:opacity-30 cursor-pointer hover:bg-black/5"
                    style={{ color: '#5c6b62' }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className="h-8 w-8 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      style={{
                        background: page === currentPage ? '#1b4332' : 'transparent',
                        color: page === currentPage ? '#ffffff' : '#5c6b62',
                      }}
                    >
                      {page}
                    </button>
                  ))}
                  {totalPages > 5 && (
                    <>
                      <span className="px-1 text-xs" style={{ color: '#8a9690' }}>...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="h-8 w-8 rounded-lg text-xs font-semibold cursor-pointer"
                        style={{ color: '#5c6b62' }}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg disabled:opacity-30 cursor-pointer hover:bg-black/5"
                    style={{ color: '#5c6b62' }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom section: Sales Overview & Top Selling */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Sales Overview Chart Placeholder */}
            <div className="lg:col-span-3 rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid #e0d8cc' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold" style={{ color: '#1a2e1f' }}>Sales Overview</h3>
                <div className="flex rounded-lg overflow-hidden text-xs font-semibold" style={{ border: '1px solid #e0d8cc' }}>
                  <button className="px-3 py-1.5 cursor-pointer" style={{ background: '#1b4332', color: '#ffffff' }}>Today</button>
                  <button className="px-3 py-1.5 cursor-pointer hover:bg-black/5" style={{ color: '#5c6b62' }}>7 Days</button>
                  <button className="px-3 py-1.5 cursor-pointer hover:bg-black/5" style={{ color: '#5c6b62' }}>30 Days</button>
                </div>
              </div>
              {/* Simple chart representation */}
              <div className="h-48 flex items-end gap-1 px-2">
                {[1200, 1800, 2200, 2800, 3200, 2600, 3400, 2900, 3100, 2400, 3600, 3200, 2800, 3000, 3400].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${(val / 4000) * 100}%`,
                        background: i === 14 ? '#1b4332' : '#d8f3dc',
                        minHeight: 8,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 px-2">
                {['9AM', '11AM', '1PM', '3PM', '5PM', '7PM', '9PM', '11PM'].map((t, i) => (
                  <span key={i} className="text-[10px]" style={{ color: '#8a9690' }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Top Selling Items */}
            <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid #e0d8cc' }}>
              <h3 className="text-base font-bold mb-4" style={{ color: '#1a2e1f' }}>Top Selling Items</h3>
              <div className="space-y-3">
                {topItems.length === 0 ? (
                  <p className="text-xs py-6 text-center" style={{ color: '#8a9690' }}>No menu items yet</p>
                ) : (
                  topItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold w-5 text-center" style={{ color: '#8a9690' }}>{idx + 1}</span>
                      <div
                        className="h-9 w-9 rounded-lg overflow-hidden shrink-0"
                        style={{ background: '#f0ebe3' }}
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs font-bold" style={{ color: '#8a9690' }}>
                            {item.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate" style={{ color: '#1a2e1f' }}>{item.name}</div>
                        <div className="text-[11px]" style={{ color: '#8a9690' }}>
                          {Math.floor(Math.random() * 10 + 4)} orders
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono" style={{ color: '#1b4332' }}>
                        {formatCurrency(item.price, currency)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar panel */}
        <div className="space-y-6">
          {/* Table QR & Floor Management Card */}
          <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: '#1b4332' }}>
            <div className="absolute top-4 right-4">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#2d6a4f', color: '#d8f3dc' }}>
                Floor 1
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#2d6a4f' }}>
              <QrCode className="h-6 w-6" style={{ color: '#d8f3dc' }} />
            </div>
            <h3 className="text-lg font-bold text-white">Table QR & Floor Management</h3>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: '#6b8a75' }}>
              Manage table QR codes, view active tables and configure floor plans.
            </p>
            <Link
              href="/dashboard/tables"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: '#52b788', color: '#0f2419' }}
            >
              Manage Tables
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid #e0d8cc' }}>
            <h3 className="text-base font-bold mb-4" style={{ color: '#1a2e1f' }}>Quick Actions</h3>
            <div className="space-y-1">
              <Link
                href="/dashboard/menu"
                className="flex items-center gap-3.5 p-3 rounded-xl transition-colors group"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f0ebe3' }}>
                  <BookOpen className="h-5 w-5" style={{ color: '#5c6b62' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: '#1a2e1f' }}>Add Menu Item</div>
                  <div className="text-[11px]" style={{ color: '#8a9690' }}>Create new dish or update menu</div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#d6cfc3' }} />
              </Link>

              <Link
                href="/dashboard/tables"
                className="flex items-center gap-3.5 p-3 rounded-xl transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f0ebe3' }}>
                  <Printer className="h-5 w-5" style={{ color: '#5c6b62' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: '#1a2e1f' }}>Manage & Print QRs</div>
                  <div className="text-[11px]" style={{ color: '#8a9690' }}>Generate table QR codes</div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#d6cfc3' }} />
              </Link>

              <Link
                href="/dashboard/orders"
                className="flex items-center gap-3.5 p-3 rounded-xl transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f0ebe3' }}>
                  <Activity className="h-5 w-5" style={{ color: '#5c6b62' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: '#1a2e1f' }}>Live Orders Feed</div>
                  <div className="text-[11px]" style={{ color: '#8a9690' }}>View real-time kitchen orders</div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#d6cfc3' }} />
              </Link>
            </div>
          </div>

          {/* Quote Card */}
          <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid #e0d8cc' }}>
            <div className="text-3xl mb-3" style={{ color: '#1b4332' }}>&ldquo;&ldquo;</div>
            <p className="text-sm italic leading-relaxed" style={{ color: '#5c6b62' }}>
              Good food brings people together.
            </p>
            <p className="text-xs font-semibold mt-3" style={{ color: '#1a2e1f' }}>
              — {restaurant?.name || "Kati House"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
