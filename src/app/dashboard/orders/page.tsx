"use client";

import { useState, useEffect, useMemo } from "react";
import { getLocalState, updateOrderStatus } from "@/lib/store";
import { Order, OrderStatus } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  Receipt,
  User,
  Phone,
  MessageSquare,
  X,
} from "lucide-react";

export default function OrdersDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const sync = () => {
    const state = getLocalState();
    setOrders(state.orders || []);
    setCurrency(state.restaurant.currency || "INR");

    if (selectedOrder) {
      const refreshed = state.orders.find((o) => o.id === selectedOrder.id);
      if (refreshed) setSelectedOrder(refreshed);
    }
  };

  useEffect(() => {
    sync();
    window.addEventListener("orderly_storage_change", sync);
    return () => window.removeEventListener("orderly_storage_change", sync);
  }, []);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = filterStatus === "ALL" || o.status === filterStatus;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        o.order_number?.toLowerCase().includes(query) ||
        o.table_number?.toLowerCase().includes(query) ||
        o.customer_name?.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [orders, filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Restaurant Orders Feed
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor real-time table orders, guest requests, and order lifecycle states.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders, tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-900 transition"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {["ALL", "PAID", "ACCEPTED", "PREPARING", "READY", "COMPLETED"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filterStatus === st
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {st === "ALL" ? `All Orders (${orders.length})` : st}
          </button>
        ))}
      </div>

      {/* Orders List Cards */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
            No orders match the selected filter.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
            >
              <div
                onClick={() => setSelectedOrder(order)}
                className="space-y-1.5 flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 text-base">
                    {order.order_number}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                    {order.table_number || "Table"}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      order.payment_status === "SUCCESS"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    Payment: {order.payment_status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600">
                    {order.status}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Guest: {order.customer_name || "Walk-in Guest"}</span>
                  <span>•</span>
                  <span>
                    Placed at{" "}
                    {new Date(order.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="text-xs text-slate-700 font-medium pt-1">
                    {order.items
                      .map((i: any) => `${i.item_name_snapshot} × ${i.quantity}`)
                      .join(", ")}
                  </div>
                )}

                {order.notes && (
                  <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-1 inline-block">
                    Note: {order.notes}
                  </div>
                )}
              </div>

              <div className="flex flex-col md:items-end gap-3 shrink-0">
                <div className="text-lg font-black text-slate-900 tabular-nums">
                  {formatCurrency(order.total, currency)}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    Details
                  </button>

                  {order.status === "PAID" && (
                    <button
                      onClick={() => handleStatusChange(order.id, "ACCEPTED")}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Accept
                    </button>
                  )}
                  {order.status === "ACCEPTED" && (
                    <button
                      onClick={() => handleStatusChange(order.id, "PREPARING")}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Start Cooking
                    </button>
                  )}
                  {order.status === "PREPARING" && (
                    <button
                      onClick={() => handleStatusChange(order.id, "READY")}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === "READY" && (
                    <button
                      onClick={() => handleStatusChange(order.id, "COMPLETED")}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                    >
                      Complete & Serve
                    </button>
                  )}
                  {order.status === "COMPLETED" && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Served
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* =================== ORDER DETAILS DRAWER =================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                  Order Details
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedOrder.order_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Order Lifecycle</div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {selectedOrder.status}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(["ACCEPTED", "PREPARING", "READY", "COMPLETED"] as OrderStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(selectedOrder.id, st)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                          selectedOrder.status === st
                            ? "bg-slate-900 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Guest & Table info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">
                    Table Location
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedOrder.table_number || "Table"}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">
                    Guest Name
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedOrder.customer_name || "Walk-in"}
                  </div>
                </div>
              </div>

              {/* Special Note */}
              {selectedOrder.notes && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <span className="font-bold uppercase text-[10px] tracking-wider text-amber-700 block">
                    Kitchen Note:
                  </span>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}

              {/* Itemized list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase">
                  Itemized Bill
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl p-4 bg-white">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 mr-2">
                          {item.quantity}x
                        </span>
                        <span className="text-slate-700">
                          {item.item_name_snapshot}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatCurrency(item.total || item.unit_price_snapshot * item.quantity, currency)}
                      </span>
                    </div>
                  ))}

                  <div className="pt-3 mt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedOrder.subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST / Tax</span>
                      <span>{formatCurrency(selectedOrder.tax, currency)}</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-900 text-sm pt-1 border-t border-slate-100">
                      <span>Total Paid</span>
                      <span className="text-emerald-600">
                        {formatCurrency(selectedOrder.total, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-white">
              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Order Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
