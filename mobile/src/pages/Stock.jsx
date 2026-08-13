import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, Plus, AlertTriangle, Package, DollarSign, Image, ImageOff } from "lucide-react";
import { useLang } from "../lib/i18n.jsx";
import { rwf } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import Sheet from "../components/Sheet";
import { Button, Field, TextInput } from "../components/ui";
import { getProductImage } from "../lib/productImages";
import SafeImage from "../components/SafeImage";
import { useData } from "../context/DataContext";

function statusOf(item) {
  const q = Number(item.quantity) || 0;
  const th = Number(item.low_stock_threshold) || 5;
  if (q === 0) return "out";
  if (q <= th) return "low";
  return "ok";
}

function StockCard({ item, t, showPhotos }) {
  const st = statusOf(item);
  const color = st === "out" ? "bg-red-500 text-white" : st === "low" ? "bg-amber-400 text-gray-900" : "bg-[#D4F06B] text-gray-900";
  const th = Number(item.low_stock_threshold) || 5;
  const pct = Math.max(6, Math.min(100, (Number(item.quantity) / (th * 3)) * 100));
  const photoUrl = getProductImage(item);

  return (
    <div className="flex flex-col justify-between rounded-[28px] border border-gray-200/80 bg-white overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] hover:border-gray-400 hover:shadow-md transition duration-200 group font-manrope">
      {/* Optional Product Image Header */}
      {showPhotos && (
        <div className="relative h-32 w-full overflow-hidden bg-gray-100">
          <SafeImage
            src={photoUrl}
            alt={item.name}
            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent" />
          <span
            className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm ${color}`}
          >
            {st === "out" ? "Out of Stock" : st === "low" ? "Low Stock" : "In Stock"}
          </span>
          {item.category && (
            <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-extrabold text-white uppercase tracking-wider">
              {item.category}
            </span>
          )}
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-extrabold text-gray-900 truncate group-hover:text-purple-600 transition">{item.name}</h3>
            {!showPhotos && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shrink-0 shadow-sm ${color}`}>
                {st === "out" ? "Out of Stock" : st === "low" ? "Low Stock" : "In Stock"}
              </span>
            )}
          </div>

          {!showPhotos && item.category && (
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-extrabold uppercase tracking-wider">
              {item.category}
            </span>
          )}

          <div className="flex items-baseline justify-between mt-2.5 text-xs">
            <span className="text-gray-400 font-semibold">{t("sell_price")}:</span>
            <span className="font-black tabnum text-gray-900">{rwf(item.sell_price_rwf)} RWF</span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-gray-400">{t("quantity")}:</span>
            <span className="font-black tabnum text-gray-900">
              {Number(item.quantity)} {item.unit ? `${item.unit}` : ""}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${st === "out" ? "bg-red-500" : st === "low" ? "bg-amber-400" : "bg-[#D4F06B]"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const PRESET_PRODUCTS = [
  { name: "Sugar 1kg", category: "Groceries", unit: "kg", cost_price_rwf: 1200, sell_price_rwf: 1500, low_stock_threshold: 10, default_qty: 25 },
  { name: "Rice 1kg", category: "Groceries", unit: "kg", cost_price_rwf: 1100, sell_price_rwf: 1300, low_stock_threshold: 10, default_qty: 30 },
  { name: "Cooking Oil 1L", category: "Groceries", unit: "litre", cost_price_rwf: 2200, sell_price_rwf: 2600, low_stock_threshold: 5, default_qty: 15 },
  { name: "Wheat Flour 1kg", category: "Groceries", unit: "kg", cost_price_rwf: 900, sell_price_rwf: 1200, low_stock_threshold: 10, default_qty: 20 },
  { name: "Milk 1L Box", category: "Dairy", unit: "pcs", cost_price_rwf: 800, sell_price_rwf: 1000, low_stock_threshold: 6, default_qty: 24 },
  { name: "Bread (Fresh Loaf)", category: "Bakery", unit: "pcs", cost_price_rwf: 700, sell_price_rwf: 900, low_stock_threshold: 5, default_qty: 12 },
  { name: "Soap Bar", category: "Hygiene", unit: "pcs", cost_price_rwf: 400, sell_price_rwf: 600, low_stock_threshold: 10, default_qty: 40 },
  { name: "Soda Bottle 300ml", category: "Beverages", unit: "pcs", cost_price_rwf: 350, sell_price_rwf: 500, low_stock_threshold: 12, default_qty: 48 },
  { name: "Mineral Water 0.5L", category: "Beverages", unit: "pcs", cost_price_rwf: 200, sell_price_rwf: 300, low_stock_threshold: 15, default_qty: 60 },
  { name: "Men Plain T-Shirt", category: "Apparel", unit: "pcs", cost_price_rwf: 3500, sell_price_rwf: 5000, low_stock_threshold: 3, default_qty: 10 },
  { name: "Women Floral Dress", category: "Apparel", unit: "pcs", cost_price_rwf: 7000, sell_price_rwf: 10000, low_stock_threshold: 2, default_qty: 8 },
  { name: "Men Slim Jeans", category: "Apparel", unit: "pcs", cost_price_rwf: 8000, sell_price_rwf: 12000, low_stock_threshold: 3, default_qty: 10 },
  { name: "Airtime Card 1000 RWF", category: "Telecom", unit: "pcs", cost_price_rwf: 960, sell_price_rwf: 1000, low_stock_threshold: 20, default_qty: 50 },
];

const EMPTY = {
  name: "",
  category: "",
  unit: "pcs",
  quantity: "",
  cost_price_rwf: "",
  sell_price_rwf: "",
  low_stock_threshold: "5",
};

export default function Stock() {
  const { t } = useLang();
  const [params] = useSearchParams();
  const { stock, addStockItem } = useData();

  const items = Array.isArray(stock) ? stock : [];

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(params.get("new") === "1");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [selectedPresetName, setSelectedPresetName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [showPhotos, setShowPhotos] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
  }, [params]);

  const visible = useMemo(
    () => items.filter((i) => !query || i.name?.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );
  const lowCount = items.filter((i) => statusOf(i) !== "ok").length;
  const totalValue = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.sell_price_rwf) || 0),
    0
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyPreset = (preset) => {
    if (!preset) return;
    setSelectedPresetName(preset.name);
    setForm({
      name: preset.name,
      category: preset.category,
      unit: preset.unit,
      quantity: String(preset.default_qty || 10),
      cost_price_rwf: String(preset.cost_price_rwf || 0),
      sell_price_rwf: String(preset.sell_price_rwf || 0),
      low_stock_threshold: String(preset.low_stock_threshold || 5),
    });
  };

  async function handleQuickAddPreset(preset) {
    try {
      await addStockItem({
        name: preset.name,
        category: preset.category,
        unit: preset.unit,
        quantity: preset.default_qty || 10,
        cost_price_rwf: preset.cost_price_rwf,
        sell_price_rwf: preset.sell_price_rwf,
        low_stock_threshold: preset.low_stock_threshold,
      });
      toast.success(`Added "${preset.name}" to stock!`);
    } catch {
      toast.error(`Could not add "${preset.name}"`);
    }
  }

  async function handleAddAllPresets() {
    setSaving(true);
    try {
      for (const preset of PRESET_PRODUCTS.slice(0, 6)) {
        await addStockItem({
          name: preset.name,
          category: preset.category,
          unit: preset.unit,
          quantity: preset.default_qty || 10,
          cost_price_rwf: preset.cost_price_rwf,
          sell_price_rwf: preset.sell_price_rwf,
          low_stock_threshold: preset.low_stock_threshold,
        });
      }
      toast.success("Initialized stock with standard catalog items!");
    } catch {
      toast.error("Failed to add preset catalog.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error(t("item_name"));
    setSaving(true);
    try {
      await addStockItem({
        name: form.name.trim(),
        category: form.category.trim() || null,
        unit: form.unit.trim() || null,
        quantity: Number(form.quantity) || 0,
        cost_price_rwf: Number(form.cost_price_rwf) || 0,
        sell_price_rwf: Number(form.sell_price_rwf) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 5,
      });
      toast.success("Product added to stock successfully!");
      setForm(EMPTY);
      setSelectedPresetName("");
      setOpen(false);
    } catch (err) {
      toast.error("Could not add the product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto flex h-full flex-col font-manrope pb-24 md:pb-8">
      <ScreenHeader
        title={t("my_stock")}
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPhotos(!showPhotos)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200/90 bg-white px-3.5 py-2 text-xs font-extrabold text-gray-700 shadow-sm hover:bg-gray-50 transition cursor-pointer"
            >
              {showPhotos ? <ImageOff size={15} className="text-gray-500" /> : <Image size={15} className="text-purple-600" />}
              <span>{showPhotos ? "Hide Photos" : "Show Photos"}</span>
            </button>
            <button
              onClick={() => {
                setForm(EMPTY);
                setSelectedPresetName("");
                setOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-gray-800 transition cursor-pointer"
            >
              <Plus size={16} /> <span>+ Add Stock Item</span>
            </button>
          </div>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-[28px] border border-gray-200/80 bg-white p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-900 shrink-0 shadow-sm">
            <Package size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t("all")} Products</div>
            <div className="text-lg font-black tabnum text-gray-900">{items.length}</div>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-200/80 bg-white p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-800 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t("running_low")}</div>
            <div className="text-lg font-black tabnum text-gray-900">{lowCount}</div>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-200/80 bg-white p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Stock Value</div>
            <div className="text-lg font-black tabnum text-emerald-600">{rwf(totalValue)} RWF</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {items.length > 0 && (
        <div>
          <div className="flex items-center gap-2 rounded-full border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              className="flex-1 bg-transparent text-xs md:text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
              placeholder={t("search_stock")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {lowCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-full bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-bold text-red-900">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <span>
            {lowCount} {t("running_low")}
          </span>
        </div>
      )}

      {/* Stock Cards Grid or Prominent Empty Null State with Catalog Pickers */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="mt-4 space-y-6">
            <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-[32px] border border-dashed border-gray-300 bg-white shadow-sm space-y-4 max-w-xl mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-purple-600 border border-purple-100 shadow-sm">
                <Package size={30} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Start Your Inventory Stock</h3>
                <p className="mt-1 text-xs text-gray-500 font-medium leading-relaxed max-w-sm mx-auto">
                  Choose from standard retail catalog products below to add them instantly, or create custom items manually.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <button
                  onClick={handleAddAllPresets}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-[#D4F06B] px-5 py-2.5 text-xs font-black text-gray-900 hover:bg-[#C5E456] active:scale-95 transition shadow-sm cursor-pointer"
                >
                  <Plus size={15} />
                  <span>+ Quick-Add Standard Starter Pack</span>
                </button>
                <button
                  onClick={() => {
                    setForm(EMPTY);
                    setSelectedPresetName("");
                    setOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-xs font-black text-white hover:bg-gray-800 active:scale-95 transition shadow-sm cursor-pointer"
                >
                  <Plus size={15} />
                  <span>+ Create Custom Item</span>
                </button>
              </div>
            </div>

            {/* Starter Catalog Grid */}
            <div className="space-y-3 max-w-5xl mx-auto">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                  Pick & Add Popular SME Products
                </h4>
                <span className="text-[11px] font-semibold text-purple-600">Click + to add instantly</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {PRESET_PRODUCTS.map((preset, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-200/90 bg-white shadow-sm hover:border-purple-400 transition"
                  >
                    <div>
                      <div className="text-xs font-black text-gray-900">{preset.name}</div>
                      <div className="text-[11px] text-gray-500 font-medium">
                        {preset.category} • {rwf(preset.sell_price_rwf)} RWF
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickAddPreset(preset)}
                      className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-[#D4F06B] text-gray-900 text-xs font-black transition cursor-pointer shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {visible.map((item) => (
              <StockCard key={item.id} item={item} t={t} showPhotos={showPhotos} />
            ))}
          </div>
        )}
      </div>

      {/* ADD / EDIT STOCK ITEM MODAL SHEET */}
      <Sheet open={open} onClose={() => setOpen(false)} title="New product">
        <div className="space-y-4 pt-2 font-manrope pb-6">
          {/* Product Name (Text Input) */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="Write product name (e.g. Amata, Sugar 1kg)..."
              className="w-full rounded-[20px] border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/40 transition shadow-sm placeholder:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category Dropdown */}
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={set("category")}
                className="w-full rounded-[20px] border border-gray-200 bg-white px-3.5 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/40 transition shadow-sm cursor-pointer appearance-none"
              >
                <option value="">Select Category...</option>
                <option value="Groceries">Groceries</option>
                <option value="Food & Provisions">Food & Provisions</option>
                <option value="Dairy & Bakery">Dairy & Bakery</option>
                <option value="Beverages & Drinks">Beverages & Drinks</option>
                <option value="Cosmetics & Personal Care">Cosmetics & Personal Care</option>
                <option value="Cleaning & Hygiene">Cleaning & Hygiene</option>
                <option value="Electronics & Accessories">Electronics & Accessories</option>
                <option value="Apparel & Footwear">Apparel & Footwear</option>
                <option value="Hardware & Construction">Hardware & Construction</option>
                <option value="Agricultural Supplies">Agricultural Supplies</option>
                <option value="Pharmaceuticals & Health">Pharmaceuticals & Health</option>
                <option value="General Supplies">General Supplies / Other</option>
              </select>
            </div>

            {/* Unit Dropdown */}
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-1">Unit of Measure</label>
              <select
                value={form.unit}
                onChange={set("unit")}
                className="w-full rounded-[20px] border border-gray-200 bg-white px-3.5 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/40 transition shadow-sm cursor-pointer appearance-none"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="L">Liters (L)</option>
                <option value="mL">Milliliters (mL)</option>
                <option value="box">Boxes (box)</option>
                <option value="pack">Packs / Packets (pack)</option>
                <option value="carton">Cartons (carton)</option>
                <option value="bottle">Bottles (bottle)</option>
                <option value="can">Cans / Tins (can)</option>
                <option value="bag">Sacks / Bags (bag)</option>
                <option value="crate">Crates (crate)</option>
                <option value="doz">Dozens (doz)</option>
                <option value="m">Meters (m)</option>
                <option value="pair">Pairs (pair)</option>
                <option value="set">Sets (set)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-1">Initial Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={set("quantity")}
                placeholder="0"
                className="w-full rounded-[20px] border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/40 transition shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-1">Alert me when below</label>
              <input
                type="number"
                value={form.low_stock_threshold}
                onChange={set("low_stock_threshold")}
                placeholder="5"
                className="w-full rounded-[20px] border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/40 transition shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-1">Cost price (RWF)</label>
              <input
                type="number"
                value={form.cost_price_rwf}
                onChange={set("cost_price_rwf")}
                placeholder="0"
                className="w-full rounded-[20px] border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/40 transition shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-1">Sell price (RWF)</label>
              <input
                type="number"
                value={form.sell_price_rwf}
                onChange={set("sell_price_rwf")}
                placeholder="0"
                className="w-full rounded-[20px] border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/40 transition shadow-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-3.5 px-5 rounded-full bg-[#D4F06B]/40 hover:bg-[#D4F06B]/60 text-gray-900 text-sm font-extrabold transition cursor-pointer border border-[#D4F06B]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3.5 px-5 rounded-full bg-[#D4F06B] hover:bg-[#C5E456] text-gray-900 text-sm font-black transition cursor-pointer shadow-sm active:scale-95"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
