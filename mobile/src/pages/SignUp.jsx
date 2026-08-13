import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Eye,
  EyeOff,
  Store,
  Building2,
  Users,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

import Logomark from "../components/Logomark";

export default function SignUp() {
  const navigate = useNavigate();
  const { registerUser, loginWithGoogle } = useAuth();
  const { resetData } = useData();

  const [busy, setBusy] = useState(false);

  // Kayko Business Registration Questions State
  const [shopName, setShopName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [dailySales, setDailySales] = useState("");
  const [needEbm, setNeedEbm] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [startDate, setStartDate] = useState("Immediately");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+250");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralSource, setReferralSource] = useState("Google Search");

  useEffect(() => {
    const GOOGLE_CLIENT_ID =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      "566140797459-iaml5c6201dh0qpvs86fnm1dtd25rd30.apps.googleusercontent.com";

    const handleGoogleResponse = async (response) => {
      if (response?.credential) {
        setBusy(true);
        try {
          await loginWithGoogle(response.credential);
          resetData();
          toast.success("Successfully authenticated with Google!");
          navigate("/", { replace: true });
        } catch (err) {
          toast.error(errorMessage(err, "Google sign-up failed."));
        } finally {
          setBusy(false);
        }
      }
    };

    const initGIS = () => {
      if (!window.google?.accounts?.id || !GOOGLE_CLIENT_ID) return false;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          itp_support: true,
        });

        const btnContainer = document.getElementById("google-signup-button");
        if (btnContainer) {
          btnContainer.innerHTML = "";
          window.google.accounts.id.renderButton(btnContainer, {
            theme: "outline",
            size: "large",
            type: "standard",
            text: "signup_with",
            shape: "pill",
            width: "340",
          });
        }

        window.google.accounts.id.prompt();
        return true;
      } catch (err) {
        console.error("[GIS] Google Identity Services init error:", err);
        return false;
      }
    };

    if (initGIS()) return;

    // Poll every 200ms for up to 10 seconds if script loaded asynchronously after mount
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (initGIS() || attempts > 50) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [loginWithGoogle, navigate, resetData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!shopName.trim()) {
      return toast.error("Please enter the name of your business.");
    }
    if (!businessType) {
      return toast.error("Please select what type of business you run.");
    }
    if (!dailySales) {
      return toast.error("Please select how many sales you process per day.");
    }
    if (!needEbm) {
      return toast.error("Please select whether you need EBM integration.");
    }
    if (!teamSize) {
      return toast.error("Please select how many people work in your business.");
    }
    if (!fullName.trim()) {
      return toast.error("Please enter your full names (Enter a first name).");
    }
    if (!phone.trim()) {
      return toast.error("Please enter your phone number.");
    }
    if (!password) {
      return toast.error("Please set a password for your account.");
    }

    setBusy(true);
    try {
      // Clear out stale tokens and counters before register
      localStorage.removeItem("db_token");
      localStorage.removeItem("db_refresh");
      localStorage.removeItem("db_user");

      const sanitizedEmail = email ? sanitizeEmail(email) : "";
      const rawPhone = (countryCode + phone).trim();
      const sanitizedPhone = sanitizePhone(rawPhone);

      const payload = {
        name: fullName.trim(),
        email: sanitizedEmail,
        phone: sanitizedPhone,
        password,
        role: "sme_owner",
        shopName: shopName.trim(),
        businessType,
        dailySales,
        needEbm,
        teamSize,
        startDate,
        referralSource,
      };

      await registerUser(payload);
      resetData();
      toast.success("Welcome to INZIRA! Account created successfully.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Account registration failed. If you already have an account, please log in."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-[#F4FBE4] via-[#F9FAFB] to-[#FFFFFF] font-manrope text-gray-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[540px] rounded-[36px] bg-white p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-gray-100">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <Logomark size={56} className="shadow-md border-2 border-white ring-2 ring-[#D4F06B]" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create Business Account</h1>
          <p className="text-xs font-semibold text-gray-500 mt-1">
            Answer a few quick questions about your business to get started immediately.
          </p>
        </div>

        {/* Tab Switcher: Sign Up / Log In */}
        <div className="flex rounded-full bg-gray-100 p-1.5 border border-gray-200/60 mb-6">
          <button
            type="button"
            className="flex-1 rounded-full bg-[#D4F06B] py-2 text-xs font-extrabold text-gray-900 shadow-sm transition-all"
          >
            Sign Up
          </button>
          <Link
            to="/login"
            className="flex-1 rounded-full py-2 text-center text-xs font-bold text-gray-500 hover:text-gray-900 transition-all"
          >
            Log In
          </Link>
        </div>

        {/* Official Google Identity Services Sign Up Button Container */}
        <div className="mb-6 flex flex-col items-center">
          <div id="google-signup-button" className="w-full flex justify-center overflow-hidden rounded-full min-h-[44px]"></div>
          <div className="relative my-4 w-full flex items-center justify-center">
            <div className="w-full border-t border-gray-100" />
            <span className="absolute bg-white px-3 text-[11px] font-semibold text-gray-400">
              Or register business details manually
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. What is the name of your business?* */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              What is the name of your business?<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter the name of your business"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition"
              required
            />
          </div>

          {/* 2. What type of business do you run?* */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              What type of business do you run?<span className="text-red-500">*</span>
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition cursor-pointer"
              required
            >
              <option value="" disabled>Choose one</option>
              <option value="Retail & Grocery">Retail & Grocery Store</option>
              <option value="Boutique & Clothing">Boutique & Clothing</option>
              <option value="Electronics & Hardware">Electronics & Hardware</option>
              <option value="Pharmacy & Healthcare">Pharmacy & Healthcare</option>
              <option value="Restaurant & Cafe">Restaurant & Cafe</option>
              <option value="Supermarket">Supermarket</option>
              <option value="Wholesale">Wholesale Trade</option>
              <option value="Services & Salon">Services / Salon / Other</option>
            </select>
          </div>

          {/* 3. How many sales do you process per day?* */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              How many sales do you process per day?<span className="text-red-500">*</span>
            </label>
            <select
              value={dailySales}
              onChange={(e) => setDailySales(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition cursor-pointer"
              required
            >
              <option value="" disabled>Choose one</option>
              <option value="1 - 20 sales/day">1 – 20 sales / day</option>
              <option value="21 - 50 sales/day">21 – 50 sales / day</option>
              <option value="51 - 100 sales/day">51 – 100 sales / day</option>
              <option value="100+ sales/day">100+ sales / day</option>
            </select>
          </div>

          {/* 4. Do you need EBM integration? (For Rwandan businesses)* */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Do you need EBM integration? (For Rwandan businesses)<span className="text-red-500">*</span>
            </label>
            <select
              value={needEbm}
              onChange={(e) => setNeedEbm(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition cursor-pointer"
              required
            >
              <option value="" disabled>Choose an option.</option>
              <option value="Yes - EBM v2 Needed">Yes – I need RRA EBM v2 integration</option>
              <option value="No - Not Needed">No – I don't need EBM integration</option>
            </select>
          </div>

          {/* 5. How many people work in your business?* */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              How many people work in your business?<span className="text-red-500">*</span>
            </label>
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition cursor-pointer"
              required
            >
              <option value="" disabled>Choose an option.</option>
              <option value="Just me (1 person)">Just me (1 person)</option>
              <option value="2 - 5 employees">2 – 5 employees</option>
              <option value="6 - 10 employees">6 – 10 employees</option>
              <option value="10+ employees">10+ employees</option>
            </select>
          </div>

          {/* 6. When do you want to get started? * */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-2">
              When do you want to get started?<span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Immediately", "This month", "I am just exploring"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStartDate(opt)}
                  className={`py-2.5 px-3 rounded-full text-[11px] font-bold transition border ${
                    startDate === opt
                      ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100" />

          {/* 7. Full Names* */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Full Names<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your full names"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition"
              required
            />
          </div>

          {/* 8. Email */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition"
            />
          </div>

          {/* 9. Phone* */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Phone<span className="text-red-500">*</span>
            </label>
            <div className="flex items-center rounded-full border border-gray-200 bg-white px-3.5 py-1.5 focus-within:border-[#D4F06B] focus-within:ring-2 focus-within:ring-[#D4F06B]/30 transition">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-800 outline-none pr-1 cursor-pointer"
              >
                <option value="+250">+250 (RW)</option>
                <option value="+254">+254 (KE)</option>
                <option value="+256">+256 (UG)</option>
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+880">+880 (BD)</option>
              </select>
              <div className="mx-2 h-4 w-px bg-gray-200" />
              <input
                type="tel"
                placeholder="788 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 bg-transparent py-1.5 text-xs font-medium text-gray-900 outline-none"
                required
              />
            </div>
          </div>

          {/* Set Password* */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Set Password<span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 outline-none focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-gray-400 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* 10. How did you learn about INZIRA?* */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-2">
              How did you learn about INZIRA?<span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                "Social Media",
                "Family and Friends",
                "Street Billboard",
                "Google Search",
                "Events",
              ].map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setReferralSource(src)}
                  className={`py-2 px-3 rounded-full text-[11px] font-bold transition border ${
                    referralSource === src
                      ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button (Direct launch with no verification code required) */}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[#D4F06B] py-4 text-xs font-black text-gray-900 hover:bg-[#C5E456] active:scale-[0.98] transition shadow-sm mt-4 flex items-center justify-center gap-2"
          >
            <span>{busy ? "Settling Business Account..." : "Create Business Account & Start Now"}</span>
            <ArrowRight size={16} />
          </button>

        </form>
      </div>
    </div>
  );
}
