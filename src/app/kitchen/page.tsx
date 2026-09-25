"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getLocalState, updateOrderStatus } from "@/lib/store";
import { isValidOrderTransition } from "@/lib/order-state-machine";
import { Order, OrderStatus } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { playOrderReceivedBell } from "@/lib/audio-notifications";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Bell,
  RefreshCw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Flame,
  AlertTriangle,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currency, setCurrency] = useState("INR");
  const [completedItemsMap, setCompletedItemsMap] = useState<Record<string, boolean>>({});
  const [filterTable, setFilterTable] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const previousOrderCount = useRef<number>(0);

  // Play authentic restaurant service bell chime
  const playChime = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    playOrderReceivedBell();
  };

  const sync = () => {
    const state = getLocalState();
    const currentOrders = state.orders || [];
    setOrders(currentOrders);
    setCurrency(state.restaurant.currency || "INR");

    // Play chime if new orders arrived
    if (previousOrderCount.current > 0 && currentOrders.length > previousOrderCount.current) {
      playChime();
    }
    previousOrderCount.current = currentOrders.length;
  };

  useEffect(() => {
    sync();
    window.addEventListener("orderly_storage_change", sync);
    const interval = setInterval(sync, 3000);
    return () => {
      window.removeEventListener("orderly_storage_change", sync);
      clearInterval(interval);
    };
  }, [soundEnabled]);

  const handleStatus = (orderId: string, status: OrderStatus) => {
    // Pre-validate before calling store to provide UX feedback
    const order = orders.find((o) => o.id === orderId);
    if (order && !isValidOrderTransition(order.status, status)) {
      setToastMessage(`Cannot move from ${order.status} to ${status}`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    try {
      updateOrderStatus(orderId, status);
      sync();
    } catch (err: any) {
      setToastMessage(err.message || "Invalid status transition");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const toggleItemChecked = (orderId: string, itemId: string) => {
    const key = `${orderId}-${itemId}`;
    setCompletedItemsMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper for elapsed time in minutes
  const getElapsedMinutes = (dateStr: string) => {
    const created = new Date(dateStr).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - created) / (1000 * 60)));
  };

  // Filter orders
  const activeOrders = orders.filter(
    (o) =>
      filterTable === "ALL" ||
      (o.table_number && o.table_number.toLowerCase() === filterTable.toLowerCase())
  );

  const newOrders = activeOrders.filter((o) => o.status === "PAID" || o.status === "CREATED");
  const acceptedOrders = activeOrders.filter((o) => o.status === "ACCEPTED");
  const preparingOrders = activeOrders.filter((o) => o.status === "PREPARING");
  const readyOrders = activeOrders.filter((o) => o.status === "READY");

  // Get unique tables
  const tablesList = Array.from(new Set(orders.map((o) => o.table_number).filter(Boolean)));

  // Ticket Card Component
  const renderTicket = (order: any, nextStatus?: OrderStatus, prevStatus?: OrderStatus, actionText?: string) => {
    const elapsed = getElapsedMinutes(order.created_at);
    const isOverdue = elapsed >= 15;

    return (
      <div
        key={order.id}
        className={`bg-slate-900 rounded-2xl border transition shadow-lg flex flex-col justify-between overflow-hidden ${
          isOverdue
            ? "border-rose-500/80 ring-1 ring-rose-500/50"
            : "border-slate-800 hover:border-slate-700"
        }`}
        style={{ minHeight: '220px' }}
      >
        {/* Ticket Header */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-black text-white">
              {order.order_number}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold text-xs">
              {order.table_number || "Table"}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isOverdue
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            <Clock className="h-3 w-3" />
            {isOverdue ? `⚠️ ${elapsed}m OVERDUE` : `${elapsed}m ago`}
          </div>
        </div>

        {/* Special Instructions Note */}
        {order.notes && (
          <div className="mx-3.5 mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-bold uppercase text-[10px] tracking-wider block text-amber-400">
                Cooking Instruction:
              </span>
              <span>{order.notes}</span>
            </div>
          </div>
        )}

        {/* Dish Items Checklist */}
        <div className="p-4 space-y-2.5 flex-1">
          {order.items?.map((item: any, idx: number) => {
            const itemKey = `${order.id}-${item.id || idx}`;
            const isDone = !!completedItemsMap[itemKey];

            return (
              <div
                key={idx}
                onClick={() => toggleItemChecked(order.id, item.id || idx)}
                className={`flex items-start justify-between gap-3 p-2 rounded-xl cursor-pointer transition select-none ${
                  isDone
                    ? "bg-slate-950/40 text-slate-500 line-through"
                    : "hover:bg-slate-800/60 text-slate-200"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5">
                    {isDone ? (
                      <CheckSquare className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white mr-2">
                      {item.quantity}x
                    </span>
                    <span className="text-xs font-semibold">
                      {item.item_name_snapshot || item.name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ticket Footer / Action */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {prevStatus ? (
            <button
              onClick={() => handleStatus(order.id, prevStatus)}
              className="p-2 md:p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs md:text-sm transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Move Back"
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 font-medium px-2">
              Guest: {order.customer_name || "Guest"}
            </div>
          )}

          {nextStatus && (
            <button
              onClick={() => handleStatus(order.id, nextStatus)}
              className="flex-1 py-3 px-4 md:py-4 md:px-5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs md:text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm min-h-[44px]"
            >
              <span>{actionText}</span>
              <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Kitchen Header Bar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight">
                KITCHEN DISPLAY SYSTEM (KDS)
              </span>
              <span className="block text-[11px] text-emerald-400 font-semibold">
                Live Interactive Order Tickets
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Audio Controls */}
        <div className="flex items-center gap-3">
          {/* Table filter */}
          {tablesList.length > 0 && (
            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl px-3 py-1.5 border border-slate-700 focus:outline-none"
            >
              <option value="ALL">All Tables ({orders.length})</option>
              {tablesList.map((tbl) => (
                <option key={tbl} value={tbl}>
                  {tbl}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChime();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              soundEnabled
                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            {soundEnabled ? "Audio Bell ON" : "Bell Muted"}
          </button>

          <button
            onClick={() => {
              sync();
              playChime();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition"
            title="Refresh & Test Chime"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main KDS Columns */}
      {/* Toast notification for invalid transitions */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top duration-200">
          {toastMessage}
        </div>
      )}

      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 overflow-x-auto">
        {/* 1. NEW PAID ORDERS */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-rose-500">
            <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              NEW ORDERS ({newOrders.length})
            </span>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
            {newOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-600 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                No new incoming orders
              </div>
            ) : (
              newOrders.map((o) =>
                renderTicket(o, "ACCEPTED", undefined, "Accept Order")
              )
            )}
          </div>
        </div>

        {/* 2. ACCEPTED */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              ACCEPTED ({acceptedOrders.length})
            </span>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
            {acceptedOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-600 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                No accepted tickets
              </div>
            ) : (
              acceptedOrders.map((o) =>
                renderTicket(o, "PREPARING", "PAID", "Start Cooking")
              )
            )}
          </div>
        </div>

        {/* 3. COOKING / PREPARING */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 animate-bounce" />
              COOKING ({preparingOrders.length})
            </span>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
            {preparingOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-600 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                Stoves & ovens idle
              </div>
            ) : (
              preparingOrders.map((o) =>
                renderTicket(o, "READY", "ACCEPTED", "Mark Ready")
              )
            )}
          </div>
        </div>

        {/* 4. READY TO SERVE */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              READY TO SERVE ({readyOrders.length})
            </span>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
            {readyOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-600 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                No orders waiting on counter
              </div>
            ) : (
              readyOrders.map((o) =>
                renderTicket(o, "COMPLETED", "PREPARING", "Complete Order")
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
