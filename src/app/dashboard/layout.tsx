"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  QrCode,
  ShoppingBag,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu as MenuIcon,
  X,
  ExternalLink,
  ChefHat,
  Search,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import { getLocalState } from "@/lib/store";
import { Restaurant } from "@/types/database";
import { getCurrentLocalUser, logoutBusiness } from "@/lib/auth-service";
import { playOrderReceivedBell } from "@/lib/audio-notifications";
import OrderlyLogo from "@/components/OrderlyLogo";

const navSections = [
  {
    label: null,
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
      { name: "Kitchen", href: "/kitchen", icon: ChefHat },
    ],
  },
  {
    label: "RESTAURANT",
    items: [
      { name: "Menu", href: "/dashboard/menu", icon: BookOpen },
      { name: "Tables & QR", href: "/dashboard/tables", icon: QrCode },
      { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
    ],
  },
  {
    label: "BUSINESS",
    items: [
      { name: "Staff", href: "/dashboard/settings", icon: Users },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
      { name: "Log Out", href: "#logout", icon: LogOut, isLogout: true },
    ],
  },
];

function formatBusinessType(type?: string | null): string {
  if (!type) return "Restaurant";
  switch (type.toUpperCase()) {
    case "ICE_CREAM":
      return "Ice Cream Parlour";
    case "CAFE":
      return "Cafe & Roastery";
    case "BAKERY":
      return "Bakery & Patisserie";
    case "FOOD_TRUCK":
      return "Food Truck";
    case "BAR_PUB":
      return "Bar & Brewery";
    case "FAST_FOOD":
      return "Fast Food QSR";
    case "RESTAURANT":
      return "Restaurant";
    default:
      return type;
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [previewToken, setPreviewToken] = useState<string>("tbl_7H8K29X");
  const [userName, setUserName] = useState<string>("Ibrahim Faazi");
  const [userEmail, setUserEmail] = useState<string>("owner@orderly.io");
  const [userInitials, setUserInitials] = useState<string>("IF");
  const [userRole, setUserRole] = useState<string>("Admin");
  const previousOrdersCount = useRef<number>(-1);
  const [newOrderToast, setNewOrderToast] = useState<any | null>(null);

  useEffect(() => {
    const syncState = () => {
      const state = getLocalState();
      setRestaurant(state.restaurant);
      if (state.tables && state.tables.length > 0) {
        setPreviewToken(state.tables[0].token);
      }

      // Check for incoming orders & ring the service bell chime
      const currentOrders = state.orders || [];
      if (previousOrdersCount.current >= 0 && currentOrders.length > previousOrdersCount.current) {
        playOrderReceivedBell();
        const latest = currentOrders[currentOrders.length - 1];
        setNewOrderToast(latest);
        setTimeout(() => setNewOrderToast(null), 6000);
      }
      previousOrdersCount.current = currentOrders.length;
    };

    syncState();

    // Check current local or Supabase user
    const localUser = getCurrentLocalUser();
    if (localUser) {
      setUserEmail(localUser.email);
      setUserName(localUser.fullName || localUser.email.split("@")[0]);
      const name = localUser.fullName || localUser.email.split("@")[0];
      const parts = name.trim().split(" ");
      const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
      setUserInitials(initials);
    }

    window.addEventListener("orderly_storage_change", syncState);
    return () => window.removeEventListener("orderly_storage_change", syncState);
  }, []);

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleLogout = async () => {
    await logoutBusiness();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#f5f0e8' }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: '#0f2419' }}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5" style={{ borderBottom: '1px solid #1e3a2a' }}>
          <Link href="/dashboard" className="flex items-center group">
            <OrderlyLogo size="sm" theme="dark" showTagline={true} taglineText="Restaurant OS" />
          </Link>
          <button
            type="button"
            className="lg:hidden p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            style={{ color: '#8a9690' }}
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Restaurant Card */}
        <div className="mx-3 mt-3 rounded-xl p-3" style={{ background: '#1a3d28', border: '1px solid #245236' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{ background: '#2d6a4f', color: '#d8f3dc' }}>
              {restaurant?.name?.[0] || "S"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">{restaurant?.name || "Kati House"}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: '#52b788' }} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#52b788' }} />
                <span className="text-[11px] font-medium" style={{ color: '#52b788' }}>Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 pt-4 pb-3 overflow-y-auto sidebar-scroll">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className={sIdx > 0 ? "mt-5" : ""}>
              {section.label && (
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#5c7a66' }}>
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  const Icon = item.icon;

                  if ((item as any).isLogout) {
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setSidebarOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 cursor-pointer"
                        style={{
                          background: 'transparent',
                          color: '#f87171',
                          borderLeft: '3px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                          e.currentTarget.style.color = '#fca5a5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#f87171';
                        }}
                      >
                        <Icon className="h-[18px] w-[18px]" style={{ color: '#ef4444' }} />
                        {item.name}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150"
                      style={{
                        background: isActive ? '#1a3d28' : 'transparent',
                        color: isActive ? '#ffffff' : '#9cb0a3',
                        borderLeft: isActive ? '3px solid #52b788' : '3px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = '#162e20';
                          e.currentTarget.style.color = '#d8f3dc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#9cb0a3';
                        }
                      }}
                    >
                      <Icon className="h-[18px] w-[18px]" style={{ color: isActive ? '#52b788' : '#6b8a75' }} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer - Restaurant Info */}
        <div className="p-3" style={{ borderTop: '1px solid #1e3a2a' }}>
          <Link
            href={`/r/${restaurant?.slug || "sunrise-bistro"}/${previewToken}`}
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
            style={{ background: '#1a3d28', border: '1px solid #245236' }}
          >
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: '#2d6a4f' }}>
              {restaurant?.logo_url ? (
                <img src={restaurant.logo_url} alt="" className="h-full w-full object-cover rounded-xl" />
              ) : (
                <span className="text-xs font-bold" style={{ color: '#d8f3dc' }}>{restaurant?.name?.[0] || "G"}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{restaurant?.name || "Sunrise Bistro"}</div>
              <div className="text-[11px] font-medium" style={{ color: '#6b8a75' }}>View Customer Menu</div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" style={{ color: '#52b788' }} />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-w-0">
        {/* Top Navbar */}
        <header
          className="h-16 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8"
          style={{ background: '#f5f0e8', borderBottom: '1px solid #e0d8cc' }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl hover:bg-white/60 cursor-pointer"
              style={{ color: '#1a2e1f' }}
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: '#1a2e1f' }}>
                {restaurant?.name || "Kati House"}
              </span>
              <ChevronDown className="h-4 w-4" style={{ color: '#5c6b62' }} />
            </div>
          </div>

          {/* Center Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#8a9690' }} />
              <input
                type="text"
                placeholder="Search orders, tables, or menu items..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm placeholder:text-[#8a9690] focus:outline-none focus:ring-2"
                style={{
                  background: '#ede6da',
                  color: '#1a2e1f',
                  border: '1px solid #d6cfc3',
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => {
                playOrderReceivedBell();
                setNewOrderToast({
                  order_number: "DEMO-BELL",
                  table_number: "01",
                  total_amount: 550,
                  items: [{ name: "Paneer Tikka Roll" }],
                });
                setTimeout(() => setNewOrderToast(null), 5000);
              }}
              className="p-2.5 relative rounded-xl hover:bg-white/50 transition-colors cursor-pointer group"
              style={{ color: '#5c6b62' }}
              title="Test Order Service Bell Sound"
            >
              <Bell className="h-[18px] w-[18px] group-hover:rotate-12 transition-transform" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full" style={{ background: '#10b981' }} />
            </button>

            <div className="h-6 w-px" style={{ background: '#d6cfc3' }} />

            {/* User Profile & Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-black/5 transition cursor-pointer border border-transparent hover:border-[#d6cfc3]"
                aria-expanded={userMenuOpen}
              >
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm"
                  style={{ background: '#1a3d28', color: '#d8f3dc' }}
                >
                  {userInitials}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-bold leading-tight" style={{ color: '#1a2e1f' }}>{userName}</div>
                  <div className="text-[11px] leading-tight" style={{ color: '#8a9690' }}>{userRole}</div>
                </div>
                <ChevronDown
                  className={`hidden sm:block h-3.5 w-3.5 transition-transform duration-200 ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                  style={{ color: '#8a9690' }}
                />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl shadow-xl z-50 p-2 border animate-in fade-in slide-in-from-top-1"
                  style={{ background: '#ffffff', borderColor: '#e0d8cc' }}
                >
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Signed in as</p>
                    <p className="text-sm font-bold text-gray-900 truncate mt-0.5">{userName}</p>
                    <p className="text-xs text-gray-500 truncate font-mono mt-0.5">{userEmail}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {restaurant?.name || "Orderly Business"}
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-[#faf7f2] transition"
                    >
                      <Settings className="h-4 w-4 text-gray-500" />
                      Account & Settings
                    </Link>
                    <Link
                      href={`/r/${restaurant?.slug || "sunrise-bistro"}/${previewToken}`}
                      target="_blank"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-[#faf7f2] transition"
                    >
                      <ExternalLink className="h-4 w-4 text-gray-500" />
                      Live Customer Menu
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-red-600" />
                      Log Out of Business
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Real-time Order Bell Notification Toast */}
        {newOrderToast && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-[#0f2419] border border-[#2d6a4f] text-white px-4 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 animate-bounce" />
            </div>
            <div className="min-w-0 pr-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Service Bell • Order Received
              </div>
              <div className="text-sm font-black text-white truncate">
                {newOrderToast.order_number} • Table {newOrderToast.table_number || "01"}
              </div>
              <div className="text-xs text-gray-300">
                ₹{newOrderToast.total_amount?.toFixed(2) || "0.00"} • Placed just now
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewOrderToast(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
