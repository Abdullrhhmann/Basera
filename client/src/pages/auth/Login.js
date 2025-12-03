import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { FiEye, FiEyeOff, FiMail, FiLock, FiArrowRight, FiTrendingUp, FiShield, FiMapPin } from '../../icons/feather';
import '../../styles/Auth.css';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect all admin-type users to admin dashboard
      const adminRoles = ['admin', 'sales_manager', 'sales_team_leader', 'sales_agent'];
      if (adminRoles.includes(user.role)) {
        navigate('/admin');
      } else {
        // Redirect regular users to home page
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      // The useEffect will handle the redirect based on user role
    }
  };

  // Show loading while checking authentication or if already authenticated
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {isLoading ? 'Loading...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Login - Basira Real Estate</title>
        <meta name="description" content="Login to your Basira Real Estate account to access exclusive features and manage your property preferences." />
      </Helmet>

      <section
        className="auth-hero-section flex min-h-screen items-center justify-center bg-[#131c2b]"
        style={{ backgroundImage: "url('/HEROOOO.png')" }}
      >
        <div className="auth-hero-overlay" aria-hidden="true" />

        <div className="relative z-10 w-full max-w-6xl px-4 sm:px-8 lg:px-12 py-20 lg:py-24">
          <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-[#131c2b]/40 px-6 py-5 backdrop-blur-2xl shadow-[0_35px_70px_-45px_rgba(8,12,24,0.9)] sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className="flex items-center gap-4 text-white">
              <img
                src="/logos/basiralogo.png"
                alt="Basera Real Estate"
                className="h-12 w-auto select-none"
                draggable="false"
              />
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/80">
                  Basira Real Estate
                </span>
                <span className="text-[0.65rem] uppercase tracking-[0.4em] text-white/50">
                  Signature Developments
                </span>
              </div>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/20 px-6 py-3 font-heading text-xs uppercase tracking-[0.3em] text-white transition-all duration-300 hover:border-[#A88B32] hover:text-[#A88B32]"
            >
              Explore Basira
              <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-12 lg:grid-cols-[1.15fr,0.85fr] lg:items-center">
            <div className="space-y-10 text-white">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#F8DB8C]">
                  Returning Client
                </span>
                <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                  Welcome back to Basira Intelligence
                </h1>
                <p className="max-w-xl text-base text-gray-200">
                  Resume your personalised portfolio, track live launches, and stay aligned with our advisory team through a single, data-rich dashboard.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: FiTrendingUp,
                    title: 'Live market pulse',
                    description: 'See launch performance, resale pricing, and ROI benchmarks the moment they shift.',
                  },
                  {
                    icon: FiShield,
                    title: 'Advisory trail',
                    description: 'Pick up every conversation with full context and next-step recommendations.',
                  },
                  {
                    icon: FiMapPin,
                    title: 'Geospatial insights',
                    description: 'Evaluate neighbourhood momentum and infrastructure plans with precision mapping.',
                  },
                ].map(({ icon: Icon, title, description }) => (
                  <div
                    key={title}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 hover:border-[#A88B32]/50"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#A88B32]/40 bg-[#A88B32]/15 text-[#F8DB8C] shadow-[0_15px_30px_-20px_rgba(168,139,50,0.8)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="text-sm text-gray-300">{description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { value: '16K+', label: 'Curated listings' },
                  { value: '140+', label: 'Partner developers' },
                  { value: '24/7', label: 'Advisory support' },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
                  >
                    <span className="text-3xl font-bold text-[#F8DB8C]">{value}</span>
                    <p className="mt-1 text-xs uppercase tracking-[0.3em] text-gray-300">
                      {label}
                    </p>
                    <div className="pointer-events-none absolute inset-0 rounded-2xl border-t border-[#F8DB8C]/20 opacity-70" />
                  </div>
                ))}
              </div>

              <Link
                to="/register"
                className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#F8DB8C] transition-colors hover:text-white"
              >
                Need access? Request an account
                <FiArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative rounded-3xl border border-white/15 bg-[#131c2b]/75 p-8 shadow-[0_50px_90px_-45px_rgba(8,12,24,0.95)] backdrop-blur-3xl md:p-10">
              <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/5 opacity-70" />
              <div className="absolute -right-12 top-12 hidden h-40 w-40 rounded-full bg-[#F8DB8C]/10 blur-3xl lg:block" />
              <div className="absolute -left-14 bottom-12 hidden h-44 w-44 rounded-full bg-[#1E3A8A]/15 blur-[110px] lg:block" />

              <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#F8DB8C]">
                    Account access
                  </span>
                  <h2 className="text-3xl font-semibold text-white">Sign in to Basira</h2>
                  <p className="text-sm text-gray-300">
                    Use your registered email and password to continue.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs uppercase tracking-[0.28em] text-gray-300">
                      Email address
                    </label>
                    <div className="relative">
                      <FiMail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        id="email"
                        autoComplete="email"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-white placeholder:text-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/40"
                        placeholder="you@basira.com"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^\S+@\S+$/i,
                            message: 'Invalid email address'
                          }
                        })}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-rose-300">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-xs uppercase tracking-[0.28em] text-gray-300">
                      Password
                    </label>
                    <div className="relative">
                      <FiLock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        autoComplete="current-password"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-white placeholder:text-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/40"
                        placeholder="Enter your password"
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters'
                          }
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-[#F8DB8C]"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-rose-300">{errors.password.message}</p>}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label htmlFor="remember-me" className="inline-flex items-center gap-3 text-sm text-gray-300">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/20 bg-white/5"
                      />
                      Remember me
                    </label>
                    <button type="button" className="text-sm font-semibold text-[#F8DB8C] hover:text-white">
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-2xl bg-[#A88B32] px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#C09C3D] hover:shadow-2xl hover:shadow-[#A88B32]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>

                <div className="pt-6 text-center text-sm text-gray-300">
                  New to Basira?{' '}
                  <Link to="/register" className="font-semibold text-[#F8DB8C] hover:text-white">
                    Create an account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Login;
