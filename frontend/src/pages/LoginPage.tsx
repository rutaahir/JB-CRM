import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/common/BrandLogo';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('admin@jalarambroker.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if redirected with disabled message
  useEffect(() => {
    const disabledMsg = searchParams.get('message');
    if (disabledMsg) {
      setError(disabledMsg);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Left Brand Panel (Matches Screenshot) */}
      <div className="md:w-5/12 lg:w-9/20 bg-gradient-to-b from-[#062916] via-[#0a3821] to-[#041a0e] p-8 md:p-12 lg:p-16 flex flex-col justify-between text-white relative overflow-hidden select-none">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left mt-4 md:mt-6">
          {/* Emblem */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/40 mb-3">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-9 h-9 text-white stroke-[2.2]"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22v-9" />
              <path d="M12 13a5 5 0 0 1 5-5c0 3-2 5-5 5Z" fill="currentColor" fillOpacity="0.4" />
              <path d="M12 9a5 5 0 0 0-5-5c0 3 2 5 5 5Z" fill="currentColor" fillOpacity="0.4" />
              <path d="M12 6a3 3 0 0 1 3-3c0 2-1 3-3 3Z" fill="currentColor" fillOpacity="0.7" />
            </svg>
          </div>

          <span className="text-amber-400 font-semibold tracking-widest text-xs uppercase mb-1">
            JALARAM
          </span>
          <h1 className="text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
            Jalaram Brokers
          </h1>
          <p className="text-emerald-200/90 text-sm mt-1.5 font-medium">
            Connecting Buyers & Suppliers
          </p>

          {/* Key Value Badges */}
          <div className="mt-8 space-y-3 w-full max-w-sm">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-100">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
                🌱
              </span>
              <span>Quality Cattle Feed Products</span>
            </div>

            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-100">
              <span className="w-6 h-6 rounded-lg bg-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
                <ShieldCheck size={14} />
              </span>
              <span>Trusted Supplier & Buyer Network</span>
            </div>

            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-100">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} />
              </span>
              <span>Better Business Together</span>
            </div>
          </div>
        </div>

        {/* Bottom Livestock / Cattle Field Card (matches screenshot) */}
        <div className="relative z-10 mt-10 rounded-2xl overflow-hidden border border-emerald-500/20 shadow-2xl bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="relative h-44 w-full bg-cover bg-center flex items-end p-4"
               style={{
                 backgroundImage: `url('https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=800&q=80')`,
                 backgroundSize: 'cover',
                 backgroundPosition: 'center 40%',
               }}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#062817] via-transparent to-transparent opacity-85" />
            <div className="relative z-10">
              <p className="text-xs font-semibold text-amber-300 tracking-wide uppercase">Premier Feed Brokerage</p>
              <p className="text-sm font-medium text-white/95">Cotton Seed Oil Cake • Maize Oil Cake • Cattle Pellet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 sm:p-10 shadow-float border border-slate-100">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold font-heading text-slate-900">Welcome Back</h2>
            <p className="text-sm text-slate-500 mt-1.5">Sign in to your Jalaram Brokers account</p>
          </div>

          {/* Error / Alert notification banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm animate-in fade-in">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@jalarambroker.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-800">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-forest-800 focus:ring-forest-700 accent-forest-800 cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Please contact the System Administrator to reset your password.')}
                className="text-forest-800 hover:text-forest-900 font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#0B3B24] hover:bg-[#14532D] text-white font-semibold text-sm rounded-xl shadow-md shadow-forest-950/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials Helper Pill */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <div className="inline-block bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Demo Login: </span>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@jalarambroker.com');
                  setPassword('Admin@123');
                }}
                className="text-forest-800 hover:underline font-medium"
              >
                Admin (admin@jalarambroker.com)
              </button>
              <span className="mx-1 text-slate-300">•</span>
              <button
                type="button"
                onClick={() => {
                  setEmail('rahul@gmail.com');
                  setPassword('Staff@123');
                }}
                className="text-forest-800 hover:underline font-medium"
              >
                Staff (rahul@gmail.com)
              </button>
            </div>
          </div>

          {/* Bottom Footer in Card */}
          <div className="mt-8 pt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <BrandLogo iconOnly size="sm" />
            <span>Jalaram Brokers, Ahmedabad, Gujarat</span>
          </div>
        </div>
      </div>
    </div>
  );
};

