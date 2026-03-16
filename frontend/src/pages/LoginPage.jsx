// ============================================================
// pages/LoginPage.jsx — User Login (Midnight Vault)
// ============================================================

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-500">
      {/* ── Left — Brand Panel ────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        {/* Geometric background */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface-300 via-surface-400 to-surface-500" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(245,158,11,0.08) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        {/* Accent glow */}
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary-600/8 rounded-full blur-3xl" />

        {/* Brand content */}
        <div className="relative z-10 px-12 max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10 opacity-0 animate-fade-up">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <svg className="w-6 h-6 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-2xl font-display font-bold text-gradient">DocuVault</span>
          </div>

          <h2 className="text-4xl font-display font-bold text-white leading-tight mb-4 opacity-0 animate-fade-up stagger-2">
            Your documents,<br />
            <span className="text-gradient-warm">secured & organized.</span>
          </h2>
          <p className="text-muted-300 text-lg leading-relaxed opacity-0 animate-fade-up stagger-3">
            A modern vault for all your important files. Upload, preview, and manage documents with enterprise-grade security.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 mt-8 opacity-0 animate-fade-up stagger-4">
            {['Cloud Storage', 'Instant Preview', 'Secure Access'].map((f) => (
              <span key={f} className="px-4 py-1.5 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right — Login Form ────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10 opacity-0 animate-fade-up">
            <div className="inline-flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-xl font-display font-bold text-gradient">DocuVault</span>
            </div>
          </div>

          <div className="opacity-0 animate-fade-up stagger-1">
            <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome back</h1>
            <p className="text-muted-400 mb-8">Sign in to access your vault</p>
          </div>

          {/* Form card */}
          <div className="glass-card p-8 opacity-0 animate-fade-up stagger-2">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-muted-200 mb-2">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-200 mb-2">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-field"
                />
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-surface-500 border-t-transparent"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/[0.06]">
              <p className="text-center text-sm text-muted-400">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
