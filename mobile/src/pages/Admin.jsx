import { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Users,
  Store,
  ShieldCheck,
  Search,
  Plus,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Building,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Award,
} from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import Sheet from "../components/Sheet";
import { Button, Field, TextInput } from "../components/ui";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ALL_ACCOUNTS_KEY, DEFAULT_ACCOUNTS, saveAccountToRegistry } from "../context/AuthContext";
import { rwf, formatDate } from "../lib/format";

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "pulse_admin" || (user?.email && user.email.toLowerCase().includes("creator"));

  const [accounts, setAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem(ALL_ACCOUNTS_KEY);
      const parsed = saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ACCOUNTS;
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  });

  // Fetch real-time backend registered users and activity
  useEffect(() => {
    api.get("/admin/smes")
      .then((res) => {
        const data = res.data?.smes || res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) {
          setAccounts(data);
        }
      })
      .catch(() => {});
  }, []);

  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  // New Merchant Form State for Admin
  const [newAccForm, setNewAccForm] = useState({
    name: "",
    shop_name: "",
    email: "",
    phone: "",
    sector: "Retail & Supermarket",
    dailySales: "20-50",
    needEbm: "Yes",
    teamSize: "2-5",
    role: "Merchant",
  });

  if (!isAdmin) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] space-y-4 font-manrope">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-xl font-black text-gray-900">Access Restricted</h2>
        <p className="text-sm font-medium text-gray-500 max-w-md">
          The Creator & Admin Management Portal is reserved exclusively for platform administrators. Normal SME merchant accounts cannot view or access this portal.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2.5 rounded-full bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Re-save to localStorage whenever accounts change
  useEffect(() => {
    try {
      localStorage.setItem(ALL_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error(e);
    }
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !query ||
        acc.name?.toLowerCase().includes(q) ||
        acc.shop_name?.toLowerCase().includes(q) ||
        acc.email?.toLowerCase().includes(q) ||
        acc.phone?.includes(q) ||
        acc.referralSource?.toLowerCase().includes(q);

      const matchesSector =
        sectorFilter === "all" ||
        acc.sector?.toLowerCase().includes(sectorFilter.toLowerCase());

      return matchesQuery && matchesSector;
    });
  }, [accounts, query, sectorFilter]);

  const toggleAccountStatus = (id) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          const nextStatus = acc.status === "Suspended" ? "Active" : "Suspended";
          toast.success(`Account "${acc.shop_name}" is now ${nextStatus}`);
          return { ...acc, status: nextStatus };
        }
        return acc;
      })
    );
  };

  const handleCreateAccount = (e) => {
    e.preventDefault();
    if (!newAccForm.name.trim() || !newAccForm.shop_name.trim()) {
      return toast.error("Please fill in Owner Name and Business Name.");
    }

    const created = {
      id: "usr_" + Date.now(),
      name: newAccForm.name.trim(),
      shop_name: newAccForm.shop_name.trim(),
      sector: newAccForm.sector,
      email: newAccForm.email.trim() || `${Date.now()}@inzira.rw`,
      phone: newAccForm.phone.trim() || "+250 788 000 000",
      dailySales: newAccForm.dailySales,
      needEbm: newAccForm.needEbm,
      teamSize: newAccForm.teamSize,
      startDate: "Immediately",
      referralSource: "Created by Admin Creator",
      status: "Active",
      role: newAccForm.role,
      createdAt: new Date().toISOString(),
    };

    saveAccountToRegistry(created);
    setAccounts((prev) => [created, ...prev]);
    toast.success(`Account "${created.shop_name}" settled & created!`);
    setCreateOpen(false);
    setNewAccForm({
      name: "",
      shop_name: "",
      email: "",
      phone: "",
      sector: "Retail & Supermarket",
      dailySales: "20-50",
      needEbm: "Yes",
      teamSize: "2-5",
      role: "Merchant",
    });
  };

  const ebmCount = accounts.filter((a) => a.needEbm === "Yes" || a.needEbm === "y").length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-manrope pb-24 md:pb-8">
      {/* Header */}
      <ScreenHeader
        title="INZIRA Creator & Admin Control Portal"
        right={
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-gray-800 transition cursor-pointer"
          >
            <Plus size={16} /> <span>+ Settle New Account</span>
          </button>
        }
      />

      {/* Creator Platform Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-[28px] border border-gray-200/80 bg-white p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 shrink-0">
            <Store size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Registered Accounts</div>
            <div className="text-2xl font-black text-gray-900 mt-0.5">{accounts.length}</div>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-200/80 bg-white p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Merchants</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              {accounts.filter((a) => a.status !== "Suspended").length}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-200/80 bg-white p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-800 shrink-0">
            <Building size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">EBM Integrated</div>
            <div className="text-2xl font-black text-blue-900 mt-0.5">{ebmCount}</div>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-200/80 bg-white p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Platform Health</div>
            <div className="text-2xl font-black text-amber-900 mt-0.5">99.8%</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full border border-gray-200/80 bg-white px-4 py-3 shadow-sm flex-1">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-xs md:text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
            placeholder="Search accounts by owner name, shop name, phone, email or referral source..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Account Registry Table & Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-gray-900">
            All Business Accounts ({filteredAccounts.length})
          </h2>
          <span className="text-xs font-semibold text-gray-400">Creator Master Registry</span>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-[28px] border border-gray-200 text-xs font-semibold text-gray-400">
            No business accounts match your search query.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredAccounts.map((acc) => {
              const isSuspended = acc.status === "Suspended";

              return (
                <div
                  key={acc.id}
                  className="rounded-[28px] border border-gray-200/80 bg-white p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] flex flex-col justify-between space-y-4 hover:border-gray-400 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-white font-black text-base shadow-sm">
                        {acc.shop_name?.charAt(0)?.toUpperCase() || "S"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                            {acc.shop_name}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              acc.role === "Admin"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {acc.role || "Merchant"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-500 mt-0.5">
                          Owner: <span className="text-gray-900">{acc.name}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        isSuspended ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {acc.status || "Active"}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-gray-100 py-3">
                    <div>
                      <span className="text-gray-400 font-semibold block text-[11px]">Sector</span>
                      <span className="font-extrabold text-gray-900 truncate block">{acc.sector || "Retail"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block text-[11px]">Contact</span>
                      <span className="font-extrabold text-gray-900 truncate block">{acc.phone || acc.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block text-[11px]">Daily Sales</span>
                      <span className="font-extrabold text-gray-900 block">{acc.dailySales || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block text-[11px]">EBM Status</span>
                      <span className="font-extrabold text-blue-700 block">
                        {acc.needEbm === "Yes" ? "EBM Enabled" : "Standard"}
                      </span>
                    </div>
                  </div>

                  {/* Referral Source & Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] font-semibold text-gray-400 truncate max-w-[180px]">
                      Source: <strong className="text-gray-700">{acc.referralSource || "Direct"}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAcc(acc)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-bold text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                      >
                        <Eye size={13} /> View
                      </button>

                      <button
                        onClick={() => toggleAccountStatus(acc.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                          isSuspended
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        }`}
                      >
                        {isSuspended ? (
                          <>
                            <CheckCircle size={13} /> Activate
                          </>
                        ) : (
                          <>
                            <XCircle size={13} /> Suspend
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INSPECT ACCOUNT MODAL SHEET */}
      <Sheet open={!!selectedAcc} onClose={() => setSelectedAcc(null)} title="Merchant Account Details">
        {selectedAcc && (
          <div className="space-y-4 pt-2 font-manrope pb-6">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white font-black text-lg">
                {selectedAcc.shop_name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">{selectedAcc.shop_name}</h3>
                <p className="text-xs font-bold text-gray-500">ID: {selectedAcc.id}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400 font-semibold">Owner Full Name</span>
                <span className="font-extrabold text-gray-900">{selectedAcc.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400 font-semibold">Business Sector</span>
                <span className="font-extrabold text-gray-900">{selectedAcc.sector}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400 font-semibold">Email Address</span>
                <span className="font-extrabold text-gray-900">{selectedAcc.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400 font-semibold">Phone Number</span>
                <span className="font-extrabold text-gray-900">{selectedAcc.phone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400 font-semibold">Daily Sales Volume</span>
                <span className="font-extrabold text-gray-900">{selectedAcc.dailySales}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400 font-semibold">Team Size</span>
                <span className="font-extrabold text-gray-900">{selectedAcc.teamSize}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400 font-semibold">Referral Source</span>
                <span className="font-extrabold text-gray-900">{selectedAcc.referralSource}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400 font-semibold">Registration Date</span>
                <span className="font-extrabold text-gray-900">{formatDate(selectedAcc.createdAt)}</span>
              </div>
            </div>

            <Button variant="paper" onClick={() => setSelectedAcc(null)} className="w-full font-bold">
              Close Inspection
            </Button>
          </div>
        )}
      </Sheet>

      {/* CREATE NEW ACCOUNT MODAL SHEET FOR ADMIN */}
      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="Settle & Create New Merchant Account">
        <form onSubmit={handleCreateAccount} className="space-y-4 pt-2 font-manrope pb-6">
          <Field label="Business / Shop Name">
            <TextInput
              required
              placeholder="e.g. Kigali Wholesale Mart"
              value={newAccForm.shop_name}
              onChange={(e) => setNewAccForm({ ...newAccForm, shop_name: e.target.value })}
            />
          </Field>

          <Field label="Owner Full Name">
            <TextInput
              required
              placeholder="e.g. Jean Paul Ndayisaba"
              value={newAccForm.name}
              onChange={(e) => setNewAccForm({ ...newAccForm, name: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email Address">
              <TextInput
                type="email"
                placeholder="owner@gmail.com"
                value={newAccForm.email}
                onChange={(e) => setNewAccForm({ ...newAccForm, email: e.target.value })}
              />
            </Field>

            <Field label="Phone Number">
              <TextInput
                type="tel"
                placeholder="+250 788 123 456"
                value={newAccForm.phone}
                onChange={(e) => setNewAccForm({ ...newAccForm, phone: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Business Sector">
              <select
                value={newAccForm.sector}
                onChange={(e) => setNewAccForm({ ...newAccForm, sector: e.target.value })}
                className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs font-semibold outline-none"
              >
                <option>Retail & Supermarket</option>
                <option>Wholesale & Distribution</option>
                <option>Electronics & Phones</option>
                <option>Pharmacy & Health</option>
                <option>Clothing & Fashion</option>
                <option>Hardware & Construction</option>
                <option>Services & Salon</option>
                <option>Restaurant & Café</option>
              </select>
            </Field>

            <Field label="Need EBM Integration?">
              <select
                value={newAccForm.needEbm}
                onChange={(e) => setNewAccForm({ ...newAccForm, needEbm: e.target.value })}
                className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs font-semibold outline-none"
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </Field>
          </div>

          <div className="pt-2 flex gap-2">
            <Button type="button" variant="paper" onClick={() => setCreateOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="green" className="flex-1 font-bold shadow-sm">
              Settle Account
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
