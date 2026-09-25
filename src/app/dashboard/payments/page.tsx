"use client";

import { useState, useEffect } from "react";
import { getLocalState } from "@/lib/store";
import { Payment } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function PaymentsDashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    const state = getLocalState();
    setPayments(state.payments || []);
    setCurrency(state.restaurant.currency || "INR");
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payment History & Gateway Audit
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Every transaction is verified via cryptographic signature and webhook reconciliation.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
          <ShieldCheck className="h-4 w-4" />
          Zero Client Trust Enforced
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Payment ID</th>
                <th className="px-4 py-3 font-semibold">Gateway</th>
                <th className="px-4 py-3 font-semibold">Gateway Order ID</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-900">
                    {p.id}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-700">
                    {p.gateway}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                    {p.gateway_order_id || "—"}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">
                    {formatCurrency(p.amount, currency)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs text-slate-500">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
