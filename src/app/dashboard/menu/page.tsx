"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getLocalState,
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "@/lib/store";
import { MenuItem, Category, DietaryType } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Leaf,
  Drumstick,
  Egg,
  Upload,
  Link as LinkIcon,
} from "lucide-react";

// --------------- TYPES ---------------
interface MenuItemFormData {
  name: string;
  description: string;
  image_url: string;
  price: string;
  tax_rate: string;
  category_id: string;
  dietary_type: DietaryType;
  is_available: boolean;
}

const emptyItemForm: MenuItemFormData = {
  name: "",
  description: "",
  image_url: "",
  price: "",
  tax_rate: "5",
  category_id: "",
  dietary_type: "VEG",
  is_available: true,
};

// --------------- DIETARY ICON COMPONENT ---------------
function DietaryBadge({ type }: { type: DietaryType }) {
  const config: Record<DietaryType, { label: string; bg: string; text: string; border: string }> = {
    VEG: { label: "Veg", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    NON_VEG: { label: "Non-Veg", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    VEGAN: { label: "Vegan", bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200" },
    EGG: { label: "Egg", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  };
  const c = config[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${type === "VEG" || type === "VEGAN" ? "bg-emerald-500" : type === "EGG" ? "bg-amber-500" : "bg-rose-500"}`} />
      {c.label}
    </span>
  );
}

// ========================================================================
// MAIN PAGE COMPONENT
// ========================================================================
export default function MenuManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [taxRate, setTaxRate] = useState(5);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");

  // Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState<MenuItemFormData>(emptyItemForm);
  const [itemError, setItemError] = useState("");
  const [imageSourceMode, setImageSourceMode] = useState<"file" | "url">("file");

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setItemError("Please select a valid image file (PNG, JPG, WEBP, etc.)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
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
          setItemForm((prev) => ({ ...prev, image_url: compressed }));
        } else {
          setItemForm((prev) => ({ ...prev, image_url: dataUrl }));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "item"; id: string; name: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const sync = useCallback(() => {
    const state = getLocalState();
    setCategories(state.categories || []);
    setMenuItems(state.menuItems || []);
    setCurrency(state.restaurant.currency || "INR");
    setTaxRate(state.restaurant.tax_rate || 5);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("orderly_storage_change", sync);
    return () => window.removeEventListener("orderly_storage_change", sync);
  }, [sync]);

  // --------------- CATEGORY ACTIONS ---------------
  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryError("");
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryError("");
    setShowCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      setCategoryError("Category name is required.");
      return;
    }
    if (editingCategory) {
      updateCategory(editingCategory.id, categoryName);
      showToast(`Category "${categoryName}" updated`);
    } else {
      addCategory(categoryName);
      showToast(`Category "${categoryName}" created`);
    }
    setShowCategoryModal(false);
  };

  const handleMoveCategoryUp = (index: number) => {
    if (index === 0) return;
    const ids = categories.map((c) => c.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    reorderCategories(ids);
  };

  const handleMoveCategoryDown = (index: number) => {
    if (index >= categories.length - 1) return;
    const ids = categories.map((c) => c.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    reorderCategories(ids);
  };

  // --------------- ITEM ACTIONS ---------------
  const openAddItem = (categoryId?: string) => {
    setEditingItem(null);
    setItemForm({
      ...emptyItemForm,
      category_id: categoryId || (categories.length > 0 ? categories[0].id : ""),
      tax_rate: String(taxRate),
    });
    setImageSourceMode("file");
    setItemError("");
    setShowItemModal(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || "",
      image_url: item.image_url || "",
      price: String(item.price),
      tax_rate: String(item.tax_rate),
      category_id: item.category_id,
      dietary_type: item.dietary_type,
      is_available: item.is_available,
    });
    setImageSourceMode(item.image_url && item.image_url.startsWith("http") ? "url" : "file");
    setItemError("");
    setShowItemModal(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.name.trim()) {
      setItemError("Item name is required.");
      return;
    }
    if (!itemForm.price || Number(itemForm.price) < 0) {
      setItemError("A valid price is required.");
      return;
    }
    if (!itemForm.category_id) {
      setItemError("Please select a category.");
      return;
    }

    if (editingItem) {
      updateMenuItem(editingItem.id, {
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || null,
        image_url: itemForm.image_url.trim() || null,
        price: Number(itemForm.price),
        tax_rate: Number(itemForm.tax_rate),
        category_id: itemForm.category_id,
        dietary_type: itemForm.dietary_type,
        is_available: itemForm.is_available,
      });
      showToast(`"${itemForm.name}" updated`);
    } else {
      addMenuItem({
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || null,
        image_url: itemForm.image_url.trim() || null,
        price: Number(itemForm.price),
        tax_rate: Number(itemForm.tax_rate),
        category_id: itemForm.category_id,
        dietary_type: itemForm.dietary_type,
        is_available: itemForm.is_available,
        sort_order: menuItems.length + 1,
      });
      showToast(`"${itemForm.name}" added to menu`);
    }
    setShowItemModal(false);
  };

  const handleToggle = (id: string) => {
    const newState = toggleMenuItemAvailability(id);
    showToast(newState ? "Item marked available" : "Item marked sold out");
  };

  // --------------- DELETE ACTIONS ---------------
  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "category") {
      deleteCategory(deleteTarget.id);
      if (selectedCategory === deleteTarget.id) setSelectedCategory("ALL");
      showToast(`Category "${deleteTarget.name}" deleted`);
    } else {
      deleteMenuItem(deleteTarget.id);
      showToast(`"${deleteTarget.name}" removed from menu`);
    }
    setDeleteTarget(null);
  };

  // --------------- FILTERING ---------------
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "ALL" || item.category_id === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || "Uncategorized";

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-top">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Menu Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Organize food categories, prices, vegetarian indicators, and live stock availability.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openAddCategory}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            New Category
          </button>
          <button
            type="button"
            onClick={() => openAddItem()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Menu Item
          </button>
        </div>
      </div>

      {/* Category Manager Row */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Categories ({categories.length})
          </h2>
          <button
            onClick={openAddCategory}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-500"
          >
            + Add Category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">
            No categories yet. Create your first food category to start adding menu items.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((cat, idx) => {
              const itemCount = menuItems.filter((i) => i.category_id === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between py-2.5 group hover:bg-slate-50/80 px-2 rounded-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleMoveCategoryUp(idx)}
                        disabled={idx === 0}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleMoveCategoryDown(idx)}
                        disabled={idx >= categories.length - 1}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-900">
                        {cat.name}
                      </span>
                      <span className="ml-2 text-[11px] text-slate-400">
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEditCategory(cat)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteTarget({ type: "category", id: cat.id, name: cat.name })
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map((cat) => {
            const count = menuItems.filter((i) => i.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Menu Item Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-slate-400 mb-3">
              <ImageIcon className="h-10 w-10 mx-auto" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">
              {searchQuery ? "No items match your search" : "No menu items yet"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery
                ? `Try a different search term.`
                : "Add your first dish to start building your restaurant menu."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => openAddItem()}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Your First Item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Dish</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Diet</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Tax</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate max-w-xs">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">
                            {item.description || "No description"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {getCategoryName(item.category_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <DietaryBadge type={item.dietary_type} />
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(item.price, currency)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">
                      {item.tax_rate}%
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          item.is_available
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {item.is_available ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        {item.is_available ? "In Stock" : "Sold Out"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditItem(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition"
                          title="Edit item"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({ type: "item", id: item.id, name: item.name })
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition"
                          title="Delete item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================== CATEGORY MODAL =================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCategory ? "Rename Category" : "Create Category"}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {categoryError && (
              <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {categoryError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                Category Name
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Starters, Mains, Desserts, Beverages"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveCategory()}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCategory}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
              >
                {editingCategory ? "Save Changes" : "Create Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== MENU ITEM MODAL =================== */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingItem ? "Edit Menu Item" : "Add Menu Item"}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {itemError && (
              <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {itemError}
              </div>
            )}

            {/* Image Preview */}
            {itemForm.image_url && (
              <div className="rounded-xl overflow-hidden border border-slate-200 h-40 bg-slate-50">
                <img
                  src={itemForm.image_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Dish Name *
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Tandoori Paneer Tikka"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Cottage cheese marinated in Kashmiri chili, hung curd, roasted in clay oven..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Item Image (Device Upload or URL) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase text-slate-700">
                    Item Image
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setImageSourceMode("file")}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition cursor-pointer ${
                        imageSourceMode === "file"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Upload className="h-3 w-3 inline mr-1" />
                      Device Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceMode("url")}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition cursor-pointer ${
                        imageSourceMode === "url"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <LinkIcon className="h-3 w-3 inline mr-1" />
                      Image URL
                    </button>
                  </div>
                </div>

                {/* Active Image Preview if exists */}
                {itemForm.image_url ? (
                  <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center gap-3">
                    <img
                      src={itemForm.image_url}
                      alt="Preview"
                      className="h-14 w-14 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {itemForm.image_url.startsWith("data:")
                          ? "Custom Device Image"
                          : itemForm.image_url}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {itemForm.image_url.startsWith("data:")
                          ? "Saved directly from your device"
                          : "Loaded from web URL"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setItemForm((prev) => ({ ...prev, image_url: "" }))}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    {imageSourceMode === "file" ? (
                      <div>
                        <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/70 hover:bg-slate-50">
                          <Upload className="h-5 w-5 text-slate-500 mb-1" />
                          <span className="text-xs font-bold text-slate-800">
                            Upload image from device
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            Select PNG, JPG, or WEBP photo from your computer/phone
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageFileUpload}
                          />
                        </label>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={itemForm.image_url}
                          onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Category + Dietary Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={itemForm.category_id}
                    onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                    Dietary Type
                  </label>
                  <select
                    value={itemForm.dietary_type}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        dietary_type: e.target.value as DietaryType,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="VEG">🟢 Vegetarian</option>
                    <option value="NON_VEG">🔴 Non-Vegetarian</option>
                    <option value="VEGAN">🌿 Vegan</option>
                    <option value="EGG">🟡 Egg / Eggetarian</option>
                  </select>
                </div>
              </div>

              {/* Price + Tax */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                    Price ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="320.00"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="5.0"
                    value={itemForm.tax_rate}
                    onChange={(e) => setItemForm({ ...itemForm, tax_rate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 tabular-nums"
                  />
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Available for Ordering
                  </div>
                  <div className="text-xs text-slate-500">
                    Customers will see this item when enabled
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setItemForm({ ...itemForm, is_available: !itemForm.is_available })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    itemForm.is_available ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      itemForm.is_available ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition inline-flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {editingItem ? "Save Changes" : "Add to Menu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== DELETE CONFIRMATION MODAL =================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {deleteTarget.type === "category" ? "Category" : "Menu Item"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {deleteTarget.type === "category"
                    ? `This will also remove all menu items in "${deleteTarget.name}".`
                    : `"${deleteTarget.name}" will be permanently removed from the menu.`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
