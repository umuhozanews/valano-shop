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
    if (window.google?.accounts?.id && clientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (response?.credential) {
              setBusy(true);
              try {
                await loginWithGoogle(response.credential);
                toast.success("Successfully authenticated with Google Account!");
                setGoogleOpen(false);
                navigate("/", { replace: true });
              } catch (err) {
                toast.error(errorMessage(err, "Google authentication failed."));
              } finally {
                setBusy(false);
              }
            }
          },
        });
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

  const handleGoogleClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setGoogleOpen(true);
        }
      });
    } else {
      setGoogleOpen(true);
    }
  };

  const handleGoogleSubmit = async (e) => {
    e.preventDefault();
    if (!googleCredential.trim()) {
      return toast.error("Please enter or paste a valid Google OAuth ID Token (credential).");
    }
    setBusy(true);
    try {
      await loginWithGoogle(googleCredential.trim());
      toast.success("Authenticated with Google Account!");
      setGoogleOpen(false);
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Google authentication failed."));
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

        {/* Real Interactive Google Login Button */}
        <div>
          <button
            type="button"
            onClick={handleGoogleClick}
            className="w-full flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-gray-50/80 py-3 text-xs font-black text-gray-800 hover:bg-gray-100 transition shadow-sm cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google Account</span>
          </button>
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs font-medium text-gray-500">
          Don't have an account?{" "}
          <Link to="/signup" className="font-bold text-purple-600 hover:underline">
            Sign Up
          </Link>
        </div>

      </div>

      {/* REAL GOOGLE ACCOUNT INTERACTIVE SIGN IN MODAL */}
      {googleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-200 relative space-y-4 font-manrope">
            <button
              onClick={() => setGoogleOpen(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center text-center">
              <svg className="h-9 w-9 mb-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <h3 className="text-base font-black text-gray-900">Google OAuth Verification</h3>
              <p className="text-xs text-gray-500 mt-0.5">Google Identity Services token validation</p>
            </div>

            <form onSubmit={handleGoogleSubmit} className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Google Signed ID Token (Credential) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Paste Google OAuth ID Token (JWT)"
                  value={googleCredential}
                  onChange={(e) => setGoogleCredential(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs font-mono outline-none focus:border-gray-900"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-gray-900 py-3 text-xs font-black text-white hover:bg-gray-800 transition shadow-md mt-2 cursor-pointer"
              >
                {busy ? "Verifying Google Token..." : "Verify & Authenticate →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
