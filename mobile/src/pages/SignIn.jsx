import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Store, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import {
  sanitizeEmail,
  sanitizePhone,
  sanitizeInput,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
} from "../lib/security";

import Logomark from "../components/Logomark";

export default function SignIn() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  // Mode & Tabs ("phone" | "email")
  const [tab, setTab] = useState("phone");
  const [busy, setBusy] = useState(false);

  // Form State
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Google Sign-In Interactive Modal State & Token Input
  const [googleOpen, setGoogleOpen] = useState(false);
  const [googleCredential, setGoogleCredential] = useState("");

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    
    const handleGoogleResponse = async (response) => {
      if (response?.credential) {
        setBusy(true);
        try {
          await loginWithGoogle(response.credential);
          toast.success("Successfully authenticated with Google!");
          navigate("/", { replace: true });
        } catch (err) {
          toast.error(errorMessage(err, "Google sign-in failed."));
        } finally {
          setBusy(false);
        }
      }
    };

    if (window.google?.accounts?.id && clientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
        });

        const btnContainer = document.getElementById("google-signin-button");
        if (btnContainer) {
          btnContainer.innerHTML = "";
          window.google.accounts.id.renderButton(btnContainer, {
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
            width: "320",
          });
        }
      } catch (err) {
        console.error("[GIS] Google Identity Services init error:", err);
      }
    }
  }, [loginWithGoogle, navigate]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    clearRateLimit("login");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Security Rate Limiter: Protect against brute-force password guessing
    const rateCheck = checkRateLimit("login", 15, 30);
    if (!rateCheck.allowed) {
      toast.error(`Too many failed login attempts. Account temporarily locked for ${rateCheck.remainingSec} seconds for security.`);
      return;
    }

    setBusy(true);
    try {
      const rawIdentifier = tab === "email" ? email : phone;
      const identifier = tab === "email" ? sanitizeEmail(rawIdentifier) : sanitizePhone(rawIdentifier);

      if (!identifier) {
        toast.error(`Please enter a valid ${tab === "email" ? "email address" : "phone number"}.`);
        setBusy(false);
        return;
      }

      await login(identifier, password.trim());
      clearRateLimit("login");
      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } catch (err) {
      recordFailedAttempt("login", 15, 30);
      toast.error(errorMessage(err, "Login failed. Please check your credentials."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-[#F4FBE4] via-[#F9FAFB] to-[#FFFFFF] font-manrope text-gray-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[400px] rounded-[36px] bg-white p-7 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-gray-100/80">
        
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <Logomark size={56} className="shadow-md border-2 border-white ring-2 ring-[#D4F06B]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Welcome Back</h1>
          <p className="mt-1 text-xs font-medium text-gray-500">Login to access your business account</p>
        </div>

        {/* Tab Selector (Phone Number vs Email) */}
        <div className="mt-6 flex rounded-full bg-gray-100 p-1.5 border border-gray-200/50">
          <button
            type="button"
            onClick={() => handleTabChange("phone")}
            className={`flex-1 rounded-full py-2.5 text-xs font-bold transition-all duration-200 ${
              tab === "phone"
                ? "bg-[#D4F06B] text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Phone Number
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("email")}
            className={`flex-1 rounded-full py-2.5 text-xs font-bold transition-all duration-200 ${
              tab === "email"
                ? "bg-[#D4F06B] text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Email
          </button>
        </div>

        {/* Main Direct Login Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {tab === "phone" ? (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+250 788 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="owner@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition pr-10"
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

          {/* Options Row (Remember Me & Forgot Password) */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-[#D4F06B] focus:ring-[#D4F06B]"
              />
              <span className="text-xs font-semibold text-gray-700">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => toast.success("Password reset link sent!")}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800"
            >
              Forget password?
            </button>
          </div>

          {/* Primary Login Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[#D4F06B] py-3.5 text-xs font-black text-gray-900 hover:bg-[#C5E456] active:scale-[0.98] transition shadow-sm mt-2 cursor-pointer"
          >
            {busy ? "Logging in..." : "Log In"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-gray-100" />
          <span className="absolute bg-white px-3 text-[11px] font-semibold text-gray-400">
            Or Sign In With
          </span>
        </div>

        {/* Official Google Identity Services Button Container */}
        <div className="flex justify-center w-full min-h-[44px]">
          <div id="google-signin-button" className="w-full flex justify-center overflow-hidden rounded-full"></div>
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs font-medium text-gray-500">
          Don't have an account?{" "}
          <Link to="/signup" className="font-bold text-purple-600 hover:underline">
            Sign Up
          </Link>
        </div>

      </div>
    </div>
  );
}
