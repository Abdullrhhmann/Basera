import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { FiEye, FiEyeOff, FiMail, FiLock, FiUser, FiPhone, FiArrowRight, FiHome, FiUsers, FiAward } from '../../icons/feather';
import '../../styles/Auth.css';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState('+20');
  const { register: registerUser, isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const password = watch('password');

  const onSubmit = async (data) => {
    const userData = { 
      ...data, 
      phoneCountryCode, 
      role: 'user' 
    };
    const result = await registerUser(userData);
    if (result.success) {
      // Redirect handled by effect
    }
  };

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
        <title>Register - Basira Real Estate</title>
        <meta
          name="description"
          content="Create your Basira Real Estate account to access exclusive properties, save favorites, and get personalized recommendations."
        />
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
              Back to site
              <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-12 lg:grid-cols-[1.15fr,0.85fr] lg:items-center">
            <div className="space-y-10 text-white">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#F8DB8C]">
                  Join Basira
                </span>
                <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                  Discover properties crafted around you
                </h1>
                <p className="max-w-xl text-base text-gray-200">
                  Create your Basira account to unlock curated launches, bespoke advisory, and data-driven insights across Egypt’s most coveted destinations.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: FiHome,
                    title: 'Curated matches',
                    description: 'Tailored villas, apartments, and branded residences aligned with your ambitions.',
                  },
                  {
                    icon: FiUsers,
                    title: 'Concierge advisory',
                    description: 'Dedicated specialists guiding your journey from discovery to delivery.',
                  },
                  {
                    icon: FiAward,
                    title: 'Developer priority',
                    description: 'Enjoy first access to premium releases within our partner network.',
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
                  { value: '5.0', label: 'Client rating' },
                  { value: '140+', label: 'Partner developers' },
                  { value: '72 hrs', label: 'Average match time' },
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
                to="/login"
                className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#F8DB8C] transition-colors hover:text-white"
              >
                Already onboard? Sign in
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
                    Create account
                  </span>
                  <h2 className="text-3xl font-semibold text-white">Start your Basira journey</h2>
                  <p className="text-sm text-gray-300">
                    Tell us a little about yourself to personalise your experience.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-xs uppercase tracking-[0.28em] text-gray-300">
                      Full name
                    </label>
                    <div className="relative">
                      <FiUser className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        id="name"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-white placeholder:text-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/40"
                        placeholder="Your name"
                        {...register('name', {
                          required: 'Name is required',
                          minLength: {
                            value: 2,
                            message: 'Name must be at least 2 characters'
                          },
                          maxLength: {
                            value: 50,
                            message: 'Name cannot exceed 50 characters'
                          }
                        })}
                      />
                    </div>
                    {errors.name && <p className="text-sm text-rose-300">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs uppercase tracking-[0.28em] text-gray-300">
                      Email address
                    </label>
                    <div className="relative">
                      <FiMail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        id="email"
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
                    <label htmlFor="phone" className="text-xs uppercase tracking-[0.28em] text-gray-300">
                      Phone number
                    </label>
                    <div className="flex gap-2">
                      <div className="relative w-36">
                        <select
                          value={phoneCountryCode}
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                          className="w-full h-[52px] rounded-2xl border border-white/10 bg-white/5 pl-3 pr-8 py-3 text-white text-sm font-medium cursor-pointer focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/40 appearance-none transition-all duration-200 hover:border-white/20"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%23F8DB8C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem center',
                            backgroundSize: '16px'
                          }}
                        >
                          <option value="+20" className="bg-[#1a1a2e] text-white py-2">🇪🇬 +20</option>
                          <option value="+966" className="bg-[#1a1a2e] text-white py-2">🇸🇦 +966</option>
                          <option value="+971" className="bg-[#1a1a2e] text-white py-2">🇦🇪 +971</option>
                          <option value="+965" className="bg-[#1a1a2e] text-white py-2">🇰🇼 +965</option>
                          <option value="+974" className="bg-[#1a1a2e] text-white py-2">🇶🇦 +974</option>
                          <option value="+973" className="bg-[#1a1a2e] text-white py-2">🇧🇭 +973</option>
                          <option value="+968" className="bg-[#1a1a2e] text-white py-2">🇴🇲 +968</option>
                          <option value="+962" className="bg-[#1a1a2e] text-white py-2">🇯🇴 +962</option>
                          <option value="+961" className="bg-[#1a1a2e] text-white py-2">🇱🇧 +961</option>
                          <option value="+1" className="bg-[#1a1a2e] text-white py-2">🇺🇸 +1</option>
                          <option value="+44" className="bg-[#1a1a2e] text-white py-2">🇬🇧 +44</option>
                        </select>
                      </div>
                      <div className="relative flex-1">
                        <FiPhone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          id="phone"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-white placeholder:text-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/40"
                          placeholder="01234567890"
                          {...register('phone', {
                            required: 'Phone number is required',
                            pattern: {
                              value: /^(0[1-9][\d]{7,14}|[1-9][\d]{7,14})$/,
                              message: 'Invalid phone number'
                            }
                          })}
                        />
                      </div>
                    </div>
                    {errors.phone && <p className="text-sm text-rose-300">{errors.phone.message}</p>}
                    <p className="text-xs text-gray-400">Enter your local phone number (e.g., 01234567890)</p>
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
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-white placeholder:text-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/40"
                        placeholder="Create a password"
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

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-xs uppercase tracking-[0.28em] text-gray-300">
                      Confirm password
                    </label>
                    <div className="relative">
                      <FiLock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-white placeholder:text-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/40"
                        placeholder="Repeat your password"
                        {...register('confirmPassword', {
                          required: 'Please confirm your password',
                          validate: value => value === password || 'Passwords do not match'
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-[#F8DB8C]"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-rose-300">{errors.confirmPassword.message}</p>}
                  </div>

                  <label htmlFor="terms" className="flex items-start gap-3 text-sm text-gray-300">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      required
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5"
                    />
                    <span>
                      I agree to the{' '}
                      <Link to="/legal#terms-of-service" className="font-semibold text-[#F8DB8C] hover:text-white">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/legal#privacy-policy" className="font-semibold text-[#F8DB8C] hover:text-white">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>

                  <label htmlFor="subscribeToNewsletter" className="flex items-start gap-3 text-sm text-gray-300">
                    <input
                      id="subscribeToNewsletter"
                      name="subscribeToNewsletter"
                      type="checkbox"
                      {...register('subscribeToNewsletter')}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5"
                    />
                    <span>
                      I want to receive news from newsletter
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-2xl bg-[#A88B32] px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#C09C3D] hover:shadow-2xl hover:shadow-[#A88B32]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </button>
                </form>

                <div className="pt-6 text-center text-sm text-gray-300">
                  Already with Basira?{' '}
                  <Link to="/login" className="font-semibold text-[#F8DB8C] hover:text-white">
                    Sign in instead
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

export default Register;
