"use client";

import { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  getLocalState,
  addTable,
  updateTable,
  deleteTable,
  toggleTableStatus,
  regenerateTableToken,
} from "@/lib/store";
import { RestaurantTable, Restaurant } from "@/types/database";
import {
  QrCode,
  Plus,
  Download,
  Printer,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export default function TablesManagementPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNum, setNewTableNum] = useState("");
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [editTableNum, setEditTableNum] = useState("");
  const [selectedQrTable, setSelectedQrTable] = useState<RestaurantTable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RestaurantTable | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);

  // Toast & Copy
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const sync = useCallback(() => {
    const state = getLocalState();
    setTables(state.tables || []);
    setRestaurant(state.restaurant);
  }, []);

  useEffect(() => {
    sync();
    setOrigin(window.location.origin);
    window.addEventListener("orderly_storage_change", sync);
    return () => window.removeEventListener("orderly_storage_change", sync);
  }, [sync]);

  // Generate real dynamic QR code data URLs for all tables
  useEffect(() => {
    if (!tables.length) return;
    const slug = restaurant?.slug || "sunrise-bistro";
    const base = origin || "http://localhost:3000";

    const generateAll = async () => {
      const entries: Record<string, string> = {};
      for (const t of tables) {
        const url = `${base}/r/${slug}/${t.token}`;
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            color: {
              dark: "#0f172a", // Slate-900
              light: "#ffffff",
            },
          });
          entries[t.id] = dataUrl;
        } catch (e) {
          console.error("Failed to generate QR for", t.table_number, e);
        }
      }
      setQrMap(entries);
    };

    generateAll();
  }, [tables, restaurant, origin]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNum.trim()) return;
    const created = addTable(newTableNum);
    setNewTableNum("");
    setShowAddModal(false);
    showToast(`"${created.table_number}" created with secure token`);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || !editTableNum.trim()) return;
    updateTable(editingTable.id, editTableNum);
    showToast(`Table renamed to "${editTableNum}"`);
    setEditingTable(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteTable(deleteTarget.id);
    showToast(`"${deleteTarget.table_number}" removed`);
    setDeleteTarget(null);
  };

  const handleRegenerate = (table: RestaurantTable) => {
    if (confirm(`Regenerate QR token for ${table.table_number}? The previous QR code will immediately stop working.`)) {
      regenerateTableToken(table.id);
      showToast(`New secure token generated for ${table.table_number}`);
    }
  };

  const handleToggle = (table: RestaurantTable) => {
    const active = toggleTableStatus(table.id);
    showToast(`${table.table_number} is now ${active ? "active" : "inactive"}`);
  };

  const copyUrl = (table: RestaurantTable) => {
    const slug = restaurant?.slug || "sunrise-bistro";
    const base = origin || "http://localhost:3000";
    const url = `${base}/r/${slug}/${table.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(table.id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast("Direct table link copied to clipboard");
  };

  const downloadQr = (table: RestaurantTable) => {
    const dataUrl = qrMap[table.id];
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `Orderly_${table.table_number.replace(/\s+/g, "_")}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloaded QR for ${table.table_number}`);
  };

  const printTableTents = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-top print:hidden">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Restaurant Tables & Permanent QRs
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Every table receives a scannable, tamper-resistant QR code with an unguessable token.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPrintView(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            Print Tent Cards
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-sm transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Table
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 print:hidden">
        {tables.map((table) => {
          const slug = restaurant?.slug || "sunrise-bistro";
          const tableUrl = `/r/${slug}/${table.token}`;
          const qrDataUrl = qrMap[table.id];

          return (
            <div
              key={table.id}
              className={`bg-white rounded-2xl border transition shadow-xs flex flex-col justify-between overflow-hidden ${
                table.is_active ? "border-slate-200 hover:border-slate-300" : "border-slate-200 bg-slate-50/50 opacity-70"
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {table.table_number}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    {table.token}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(table)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
                    table.is_active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                  }`}
                  title={table.is_active ? "Click to deactivate" : "Click to activate"}
                >
                  {table.is_active ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Paused
                    </>
                  )}
                </button>
              </div>

              {/* QR Image Viewport */}
              <div className="p-5 flex flex-col items-center justify-center text-center bg-radial from-white to-slate-50">
                <div
                  onClick={() => setSelectedQrTable(table)}
                  className="cursor-pointer group relative p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition"
                  title="Click to expand QR preview"
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for ${table.table_number}`}
                      className="h-36 w-36 object-contain"
                    />
                  ) : (
                    <div className="h-36 w-36 flex items-center justify-center">
                      <QrCode className="h-16 w-16 text-slate-300 animate-pulse" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-900/60 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold">
                    Click to Zoom
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => copyUrl(table)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                    title="Copy direct table order link"
                  >
                    {copiedId === table.id ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copiedId === table.id ? "Copied!" : "Copy Link"}
                  </button>
                  <button
                    onClick={() => downloadQr(table)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                    title="Download PNG image"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href={tableUrl}
                  target="_blank"
                  className="font-semibold text-emerald-600 hover:text-emerald-500 inline-flex items-center gap-1"
                >
                  Open Menu
                  <ExternalLink className="h-3 w-3" />
                </Link>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingTable(table);
                      setEditTableNum(table.table_number);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/60 transition"
                    title="Rename table"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleRegenerate(table)}
                    className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-amber-50 transition"
                    title="Regenerate token (invalidates old QR)"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(table)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                    title="Delete table"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* =================== ADD TABLE MODAL =================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add Restaurant Table</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Table Identifier / Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Table 05 (Patio) or Booth 2"
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Security & Isolation:</div>
                <p>
                  Orderly automatically provisions a unique cryptographic token (`tbl_...`) ensuring customers cannot modify other tables or spoof orders.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
                >
                  Create Table & Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================== EDIT TABLE MODAL =================== */}
      {editingTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Rename Table</h3>
              <button
                onClick={() => setEditingTable(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Table Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editTableNum}
                  onChange={(e) => setEditTableNum(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================== DELETE CONFIRM MODAL =================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Delete Table?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong>{deleteTarget.table_number}</strong>? Existing QR codes for this table will be immediately invalidated.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
              >
                Delete Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== QR PREVIEW ZOOM MODAL =================== */}
      {selectedQrTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-5 text-center">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  {restaurant?.name || "Orderly"}
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  {selectedQrTable.table_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedQrTable(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* High-res QR Container */}
            <div className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex flex-col items-center">
              {qrMap[selectedQrTable.id] && (
                <img
                  src={qrMap[selectedQrTable.id]}
                  alt="Big QR"
                  className="h-60 w-60 object-contain rounded-lg shadow-2xs"
                />
              )}
              <div className="mt-3 text-xs font-semibold text-slate-700">
                Scan with Smartphone Camera
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No app install required • Instant Menu & Bill Pay
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => downloadQr(selectedQrTable)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
              >
                <Download className="h-4 w-4" />
                Download High-Res PNG
              </button>
              <button
                onClick={() => copyUrl(selectedQrTable)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
              >
                <Copy className="h-4 w-4" />
                {copiedId === selectedQrTable.id ? "Link Copied!" : "Copy Table URL"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== PRINTABLE TABLE TENT CARDS MODAL / SHEET =================== */}
      {showPrintView && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 print:p-0">
          {/* Top Bar (Hidden when printed) */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200 print:hidden">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Table Tent Cards Print Preview
              </h2>
              <p className="text-xs text-slate-500">
                Ready to print on standard letter or A4 cardstock. Cut along dashed guidelines.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPrintView(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Close Preview
              </button>
              <button
                onClick={printTableTents}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition"
              >
                <Printer className="h-4 w-4" />
                Print Now
              </button>
            </div>
          </div>

          {/* Cards Layout for Print */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:grid-cols-2 print:gap-6">
            {tables.map((table) => {
              const qrDataUrl = qrMap[table.id];
              return (
                <div
                  key={table.id}
                  className="border-2 border-dashed border-slate-300 rounded-3xl p-8 bg-white flex flex-col items-center justify-between text-center space-y-4 print:border-slate-800 print:rounded-2xl print:break-inside-avoid shadow-xs"
                  style={{ minHeight: "420px" }}
                >
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-600">
                      Welcome to
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {restaurant?.name || "Orderly Restaurant"}
                    </h3>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt={`QR ${table.table_number}`}
                        className="h-44 w-44 object-contain"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="inline-block px-4 py-1 rounded-full bg-slate-900 text-white font-black text-sm tracking-wider">
                      {table.table_number.toUpperCase()}
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-2">
                      Scan to View Menu & Pay
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-[220px] mx-auto">
                      1. Open phone camera • 2. Select items • 3. Pay securely from table
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[9px] text-slate-400 uppercase tracking-wider">
                    Powered by Orderly SaaS
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
