"use client";

import { useState, useEffect } from "react";
import { getLocalState, updateRestaurantProfile } from "@/lib/store";
import { Restaurant } from "@/types/database";
import {
  Store,
  Save,
  CheckCircle2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Clock,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  Trash2,
  Palette,
  X,
} from "lucide-react";

export default function RestaurantSettingsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [logoSourceMode, setLogoSourceMode] = useState<"upload" | "url" | "presets">("upload");
  const [isDragging, setIsDragging] = useState(false);

  const PRESET_LOGOS = [
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=200&auto=format&fit=crop&q=80",
  ];

  const handleLogoFileUpload = (file: File) => {
    if (!restaurant) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB max

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          setRestaurant({ ...restaurant, logo_url: compressed });
          setLogoPreviewError(false);
        } else {
          setRestaurant({ ...restaurant, logo_url: dataUrl });
          setLogoPreviewError(false);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoFileUpload(file);
  };

  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const sync = () => {
      const state = getLocalState();
      setRestaurant(state.restaurant);
    };
    sync();
    window.addEventListener("orderly_storage_change", sync);
    return () => window.removeEventListener("orderly_storage_change", sync);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    updateRestaurantProfile(restaurant);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!restaurant) return null;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Restaurant Profile
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure brand identity, customer-facing slug, tax rate, location, and hours of operation.
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-in slide-in-from-top">
            <CheckCircle2 className="h-4 w-4" />
            All changes saved
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand & Identity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Store className="h-4 w-4 text-slate-500" />
              Brand & Identity
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Business / Outlet Name
                </label>
                <input
                  type="text"
                  required
                  value={restaurant.name}
                  onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Business Type
                </label>
                <select
                  value={restaurant.business_type || "RESTAURANT"}
                  onChange={(e) => setRestaurant({ ...restaurant, business_type: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="RESTAURANT">🍽️ Restaurant / Fine Dining</option>
                  <option value="CAFE">☕ Cafe & Coffee Roastery</option>
                  <option value="ICE_CREAM">🍦 Ice Cream Parlour & Desserts</option>
                  <option value="BAKERY">🥖 Bakery & Patisserie</option>
                  <option value="FOOD_TRUCK">🚚 Food Truck & Pop-up</option>
                  <option value="BAR_PUB">🍺 Bar, Pub & Brewery</option>
                  <option value="FAST_FOOD">🍕 Fast Food & QSR</option>
                  <option value="OTHER">🍴 Other Food Business</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Customer URL Slug (Unique)
                </label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                  <span className="inline-flex items-center px-3 bg-slate-50 text-slate-500 text-xs border-r border-slate-300 whitespace-nowrap">
                    /r/
                  </span>
                  <input
                    type="text"
                    required
                    value={restaurant.slug}
                    onChange={(e) =>
                      setRestaurant({
                        ...restaurant,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      })
                    }
                    className="w-full px-3 py-2.5 text-sm text-slate-900 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Customers access your menu at <span className="font-mono font-medium text-slate-600">orderly.app/r/{restaurant.slug}/&lt;table&gt;</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                Restaurant Tagline / Description
              </label>
              <textarea
                rows={2}
                value={restaurant.description || ""}
                onChange={(e) =>
                  setRestaurant({ ...restaurant, description: e.target.value })
                }
                placeholder="e.g. Authentic artisanal dining & fresh coastal delicacies"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Logo Brand Asset Studio */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-emerald-600" />
                  Brand Logo
                </label>
                {restaurant.logo_url && (
                  <button
                    type="button"
                    onClick={() => {
                      setRestaurant({ ...restaurant, logo_url: "" });
                      setLogoPreviewError(false);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-700 transition cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove Logo
                  </button>
                )}
              </div>

              {/* Live Preview */}
              {restaurant.logo_url && !logoPreviewError && (
                <div className="mb-4 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                  <img
                    src={restaurant.logo_url}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-xl object-cover border-2 border-white shadow-md"
                    onError={() => setLogoPreviewError(true)}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{restaurant.name}</div>
                    <div className="text-xs text-slate-500 truncate">{restaurant.description || "Your restaurant tagline"}</div>
                    <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 mr-0.5" /> Logo Active
                    </div>
                  </div>
                </div>
              )}

              {/* Source Mode Tabs */}
              <div className="flex items-center gap-1 mb-3 bg-slate-100 p-1 rounded-lg">
                {[
                  { id: "upload" as const, label: "Upload from Device", icon: Upload },
                  { id: "url" as const, label: "Image Link", icon: LinkIcon },
                  { id: "presets" as const, label: "Presets", icon: ImageIcon },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setLogoSourceMode(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition cursor-pointer flex-1 justify-center ${
                        logoSourceMode === tab.id
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Upload from Device */}
              {logoSourceMode === "upload" && (
                <div
                  onDrop={handleLogoDrop}
                  onDragOver={handleLogoDragOver}
                  onDragLeave={() => setIsDragging(false)}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
                  }`}
                  onClick={() => {
                    const inp = document.createElement("input");
                    inp.type = "file";
                    inp.accept = "image/png,image/jpeg,image/webp,image/svg+xml";
                    inp.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoFileUpload(file);
                    };
                    inp.click();
                  }}
                >
                  <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? "text-emerald-500" : "text-slate-400"}`} />
                  <div className="text-sm font-semibold text-slate-700">
                    {isDragging ? "Drop your image here" : "Click to browse or drag & drop"}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    PNG, JPG, WebP, SVG · Max 5 MB · Auto-compressed to ≤800px
                  </div>
                </div>
              )}

              {/* Image URL */}
              {logoSourceMode === "url" && (
                <div>
                  <input
                    type="url"
                    value={restaurant.logo_url?.startsWith("data:") ? "" : restaurant.logo_url || ""}
                    onChange={(e) => {
                      setRestaurant({ ...restaurant, logo_url: e.target.value });
                      setLogoPreviewError(false);
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Paste any publicly accessible image URL.
                  </p>
                </div>
              )}

              {/* Curated Presets */}
              {logoSourceMode === "presets" && (
                <div>
                  <p className="text-[11px] text-slate-500 mb-2">Click a preset to apply instantly:</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PRESET_LOGOS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setRestaurant({ ...restaurant, logo_url: url });
                          setLogoPreviewError(false);
                        }}
                        className={`relative rounded-xl overflow-hidden border-2 transition cursor-pointer aspect-square group ${
                          restaurant.logo_url === url
                            ? "border-emerald-500 ring-2 ring-emerald-200"
                            : "border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                        {restaurant.logo_url === url && (
                          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 drop-shadow-sm" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial & Tax */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-500" />
              Financial & Tax Settings
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Currency
                </label>
                <select
                  value={restaurant.currency}
                  onChange={(e) =>
                    setRestaurant({ ...restaurant, currency: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="INR">₹ INR — Indian Rupee</option>
                  <option value="USD">$ USD — US Dollar</option>
                  <option value="AED">د.إ AED — UAE Dirham</option>
                  <option value="GBP">£ GBP — British Pound</option>
                  <option value="EUR">€ EUR — Euro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Default GST / Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={restaurant.tax_rate}
                  onChange={(e) =>
                    setRestaurant({
                      ...restaurant,
                      tax_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Restaurant Status
                </label>
                <select
                  value={restaurant.is_active ? "active" : "inactive"}
                  onChange={(e) =>
                    setRestaurant({
                      ...restaurant,
                      is_active: e.target.value === "active",
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="active">✅ Accepting Orders (Active)</option>
                  <option value="inactive">⏸ Temporarily Closed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Location */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-500" />
              Contact & Location
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Phone
                </label>
                <input
                  type="text"
                  value={restaurant.phone || ""}
                  onChange={(e) =>
                    setRestaurant({ ...restaurant, phone: e.target.value })
                  }
                  placeholder="+91 98765 43210"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> Support Email
                </label>
                <input
                  type="email"
                  value={restaurant.email || ""}
                  onChange={(e) =>
                    setRestaurant({ ...restaurant, email: e.target.value })
                  }
                  placeholder="hello@restaurant.com"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Full Address
              </label>
              <input
                type="text"
                value={restaurant.address || ""}
                onChange={(e) =>
                  setRestaurant({ ...restaurant, address: e.target.value })
                }
                placeholder="104 Promenade Road, Indiranagar, Bengaluru, KA 560038"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button Footer */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Changes apply immediately to customer-facing menus and QR experiences.
          </p>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            <Save className="h-4 w-4" />
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}
