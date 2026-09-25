"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Store, Coffee, IceCream, Croissant, Truck, Beer, Pizza } from "lucide-react";
import { saveLocalState } from "@/lib/store";
import { BusinessType } from "@/types/database";
import OrderlyLogo from "@/components/OrderlyLogo";

const BUSINESS_TYPE_OPTIONS = [
  { value: "RESTAURANT", label: "🍽️ Restaurant / Fine Dining" },
  { value: "CAFE", label: "☕ Cafe & Coffee Roastery" },
  { value: "ICE_CREAM", label: "🍦 Ice Cream Parlour & Desserts" },
  { value: "BAKERY", label: "🥖 Bakery & Patisserie" },
  { value: "FOOD_TRUCK", label: "🚚 Food Truck & Pop-up" },
  { value: "BAR_PUB", label: "🍺 Bar, Pub & Brewery" },
  { value: "FAST_FOOD", label: "🍕 Fast Food & Quick Service" },
  { value: "OTHER", label: "🍴 Other Food Business" },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialName = searchParams.get("name") || "Artisan Bites";
  const initialType = (searchParams.get("type") as BusinessType) || "RESTAURANT";

  const [name, setName] = useState(initialName);
  const [businessType, setBusinessType] = useState<BusinessType>(initialType);
  const [slug, setSlug] = useState(
    initialName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "artisan-bites"
  );
  const [phone, setPhone] = useState("+91 98765 43210");
  const [currency, setCurrency] = useState("INR");
  const [taxRate, setTaxRate] = useState(5.0);
  const [address, setAddress] = useState("Indiranagar, Bengaluru, KA");
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const newRestaurantId = `rest-${Date.now()}`;

    // Create a fresh business state with selected business_type
    const freshState = {
      restaurant: {
        id: newRestaurantId,
        name,
        slug,
        business_type: businessType,
        phone,
        currency,
        tax_rate: Number(taxRate),
        address,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      categories: [
        {
          id: `cat-${Date.now()}-1`,
          restaurant_id: newRestaurantId,
          name: businessType === "ICE_CREAM" ? "Signature Scoops" : businessType === "CAFE" ? "Artisan Brews" : "Chef's Specials",
          sort_order: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ],
      menuItems: [],
      tables: [
        {
          id: `tbl-${Date.now()}-1`,
          restaurant_id: newRestaurantId,
          table_number: "01",
          token: `tbl_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          capacity: 4,
          is_active: true,
          created_at: new Date().toISOString(),
        }
      ],
      orders: [],
      payments: [],
    };

    saveLocalState(freshState as any);

    setTimeout(() => {
      router.push("/dashboard");
    }, 400);
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans"
      style={{ backgroundColor: "#f5f0e8", color: "#1a2e1f" }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10 text-center">
        <div className="flex flex-col items-center">
          <OrderlyLogo size="lg" theme="light" showTagline={true} taglineText="Business Profile Setup" />
        </div>
        <h2 className="mt-5 text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "#0f2419" }}>
          Complete Your Business Profile
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#6c7d73" }}>
          Configure your digital menu URL slug, business category, currency, and tax rate.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div
          className="rounded-3xl p-7 sm:p-9 shadow-xl"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dfd7cb",
          }}
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Business Type */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#2d6a4f" }}
              >
                Business Type
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none"
                style={{
                  backgroundColor: "#faf8f4",
                  border: "1px solid #d8d1c5",
                  color: "#0f2419",
                }}
              >
                {BUSINESS_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Name */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#2d6a4f" }}
              >
                Business Brand Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none"
                style={{
                  backgroundColor: "#faf8f4",
                  border: "1px solid #d8d1c5",
                  color: "#0f2419",
                }}
              />
            </div>

            {/* Ordering Slug */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#2d6a4f" }}
              >
                Customer Menu QR Slug
              </label>
              <div
                className="flex rounded-xl overflow-hidden"
                style={{
                  backgroundColor: "#faf8f4",
                  border: "1px solid #d8d1c5",
                }}
              >
                <span
                  className="inline-flex items-center px-3 text-xs font-medium"
                  style={{
                    backgroundColor: "#eae4d8",
                    color: "#5c6b62",
                    borderRight: "1px solid #d8d1c5",
                  }}
                >
                  orderly.app/r/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="block w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                  style={{ color: "#0f2419" }}
                />
              </div>
              <p className="mt-1 text-[11px]" style={{ color: "#6c7d73" }}>
                Customers scan table QR codes to access this URL directly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "#2d6a4f" }}
                >
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="block w-full rounded-xl px-3 py-2.5 text-sm transition focus:outline-none"
                  style={{
                    backgroundColor: "#faf8f4",
                    border: "1px solid #d8d1c5",
                    color: "#0f2419",
                  }}
                >
                  <option value="INR">INR (₹) - India</option>
                  <option value="USD">USD ($) - United States</option>
                  <option value="AED">AED (د.إ) - UAE</option>
                  <option value="GBP">GBP (£) - UK</option>
                </select>
              </div>

              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "#2d6a4f" }}
                >
                  GST / Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none"
                  style={{
                    backgroundColor: "#faf8f4",
                    border: "1px solid #d8d1c5",
                    color: "#0f2419",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#2d6a4f" }}
              >
                Contact Phone
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none"
                style={{
                  backgroundColor: "#faf8f4",
                  border: "1px solid #d8d1c5",
                  color: "#0f2419",
                }}
              />
            </div>

            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#2d6a4f" }}
              >
                Location Address
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition focus:outline-none"
                style={{
                  backgroundColor: "#faf8f4",
                  border: "1px solid #d8d1c5",
                  color: "#0f2419",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: "#0f2419" }}
            >
              {loading ? "Launching Dashboard..." : "Launch Owner Dashboard"}
              <ArrowRight className="ml-2 h-4 w-4 text-[#52b788]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-8 text-center" style={{ backgroundColor: "#f5f0e8", color: "#6c7d73" }}>
          Loading onboarding...
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
