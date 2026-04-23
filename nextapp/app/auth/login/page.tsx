'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Eye, EyeOff, AlertCircle, Loader, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push('/');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0d0f1a]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse"
             style={{ animation: 'float 8s ease-in-out infinite' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl animate-pulse"
             style={{ animation: 'float 10s ease-in-out infinite reverse' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl animate-pulse"
             style={{ animation: 'float 12s ease-in-out infinite', animationDelay: '2s' }} />

        {/* Mesh Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-transparent to-purple-900/10" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]"
             style={{
               backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
               backgroundSize: '60px 60px'
             }} />
      </div>

      {/* Glassmorphism Card */}
      <div
        className={`relative w-full max-w-md transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Frosted Glass Card */}
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden">

          {/* Hero Header with Animated Gradient */}
          <div className="relative px-8 py-10 overflow-hidden">
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 opacity-90"
                 style={{
                   backgroundSize: '200% 200%',
                   animation: 'gradientShift 8s ease infinite',
                 }} />

            {/* Content */}
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg">
                <Mail className="text-white" size={32} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">SalesTracker</h1>
              <p className="text-indigo-100/90 font-medium">AI-Powered Order Management</p>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3 items-start animate-shake">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-5">
              {/* Email Input - Floating Label */}
              <div className="group">
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    placeholder=" "
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full px-4 py-3.5 border border-white/10 rounded-xl bg-white/[0.02] text-white placeholder-transparent peer focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                    style={{ boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)' }}
                  />
                  <label
                    htmlFor="email"
                    className="absolute left-4 top-3.5 text-slate-400 transition-all duration-200 peer-focus:-top-2.5 peer-focus:left-3 peer-focus:bg-[#1a1d2d] peer-focus:px-2 peer-focus:text-indigo-400 peer-focus:text-xs peer-focus:font-medium peer-not-placeholder-shown:-top-2.5 peer-not-placeholder-shown:left-3 peer-not-placeholder-shown:bg-[#1a1d2d] peer-not-placeholder-shown:px-2 peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:font-medium pointer-events-none"
                  >
                    Email Address
                  </label>
                </div>
              </div>

              {/* Password Input - Floating Label with Toggle */}
              <div className="group">
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder=" "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full px-4 py-3.5 border border-white/10 rounded-xl bg-white/[0.02] text-white placeholder-transparent peer focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-4 top-3.5 text-slate-400 transition-all duration-200 peer-focus:-top-2.5 peer-focus:left-3 peer-focus:bg-[#1a1d2d] peer-focus:px-2 peer-focus:text-indigo-400 peer-focus:text-xs peer-focus:font-medium peer-not-placeholder-shown:-top-2.5 peer-not-placeholder-shown:left-3 peer-not-placeholder-shown:bg-[#1a1d2d] peer-not-placeholder-shown:px-2 peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:font-medium pointer-events-none"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-slate-400 hover:text-indigo-400 transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="group w-full relative py-3.5 px-6 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                  backgroundSize: '200% 200%',
                }}
              >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                {/* Content */}
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Sign Up Link */}
            <p className="text-center text-slate-400 text-sm">
              Don't have an account?{' '}
              <Link
                href="/auth/signup"
                className="inline-block relative font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 hover:from-indigo-300 hover:to-purple-300 transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Card Glow Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl -z-10 opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
      </div>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.05); }
          50% { transform: translate(-10px, 10px) scale(0.95); }
          75% { transform: translate(15px, 15px) scale(1.02); }
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }

        .animate-shake {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }
      `}</style>
    </div>
  );
}
