import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Tv,
  Mail,
  Lock,
  User,
  UserCheck,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Cloud,
  Database,
  Sun,
  Moon,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const {
    signInWithSupabase,
    signUpWithSupabase,
    resetPasswordWithSupabase,
    isSupabaseConfigured,
    theme,
    toggleTheme,
    settings,
  } = useApp();

  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up State
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear messages when switching tabs
  const handleSwitchTab = (mode: 'signin' | 'signup' | 'forgot') => {
    setAuthMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Handle Sign In
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signInEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!signInPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signInWithSupabase(signInEmail, signInPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please check your email and password.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signUpFullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!signUpEmail.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (signUpPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const registeredEmail = signUpEmail.trim().toLowerCase();
      const res = await signUpWithSupabase(registeredEmail, signUpPassword, signUpFullName);
      if (res.success) {
        // User Requirement:
        // 5. Show a message: "Account created successfully. Please Sign In to continue."
        setSuccessMessage('Account created successfully. Please Sign In to continue.');
        setErrorMessage(null);

        // 6. Automatically switch/show the Sign In form
        setAuthMode('signin');

        // 7. User enters email/password manually; prefill email for convenience
        setSignInEmail(registeredEmail);
        setSignInPassword('');
        setSignUpFullName('');
        setSignUpPassword('');
        setSignUpConfirmPassword('');
      } else {
        setErrorMessage(res.error || 'Could not register user. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'Registration failed. Please check your input.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPasswordWithSupabase(forgotEmail);
      if (res.success) {
        setSuccessMessage('Password reset link has been dispatched to your email. Please check your inbox.');
      } else {
        setErrorMessage(res.error || 'Failed to request password reset. Check if the email is registered.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'Error sending password reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-900 text-slate-100 selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* Top Floating Navbar */}
      <header className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-blue-600/30">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base tracking-tight text-white uppercase truncate">
              {settings.shop_name || 'Zohaib Dogar Electronics'}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              POS & Installment (Qist) System
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-slate-300" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* LEFT COLUMN: Shop Branding & Overview (Visible on Large Screens) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center p-8 rounded-3xl bg-gradient-to-br from-slate-850 via-slate-900 to-indigo-950 border border-slate-800 shadow-2xl relative overflow-hidden">
            {/* Background Accent Glows */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enterprise POS & Qist</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl xl:text-3xl font-extrabold text-white leading-tight">
                  Electronics Shop Management System
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Streamlined cash counter billing, customer installment financing schedules, automated overdue recovery, and real-time inventory tracking.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Auth Form Card (Sign In, Sign Up, Forgot Password) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 sm:py-9 shadow-2xl space-y-6">
              {/* Header Title & Switch Tabs */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    {authMode === 'signin' && 'Sign In to Terminal'}
                    {authMode === 'signup' && 'Create Staff / Admin Account'}
                    {authMode === 'forgot' && 'Reset Your Password'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {authMode === 'signin' && 'Enter your Supabase email and password to access the system.'}
                    {authMode === 'signup' && 'Register a new account linked to Supabase authentication.'}
                    {authMode === 'forgot' && 'We will send a password reset link to your email.'}
                  </p>
                </div>

                {/* Tab Switcher for Sign In vs Sign Up */}
                {authMode !== 'forgot' && (
                  <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('signin')}
                      className={`py-2 text-xs font-bold rounded-xl transition-all ${
                        authMode === 'signin'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('signup')}
                      className={`py-2 text-xs font-bold rounded-xl transition-all ${
                        authMode === 'signup'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>

              {/* Alert / Feedback Banners */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start space-x-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div className="flex-1 leading-relaxed">
                    <span className="font-bold block">Authentication Error</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <div className="flex-1 leading-relaxed">
                    <span className="font-bold block">Success</span>
                    <span>{successMessage}</span>
                  </div>
                </div>
              )}

              {/* TAB 1: SIGN IN FORM */}
              {authMode === 'signin' && (
                <form onSubmit={handleSignInSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="e.g. admin@zohaibdogar.com"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('forgot')}
                        className="text-[11px] font-bold text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showSignInPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                      >
                        {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center text-[11px] text-slate-400">
                    <span>Don't have an account yet? </span>
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('signup')}
                      className="font-bold text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: SIGN UP FORM */}
              {authMode === 'signup' && (
                <form onSubmit={handleSignUpSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Zohaib Dogar or Muhammad Usman"
                        value={signUpFullName}
                        onChange={(e) => setSignUpFullName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="e.g. user@zohaibdogar.com"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Role Notice: New accounts receive employee role by default */}
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-start space-x-2.5">
                    <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs text-white">Default Role: Sales Staff</span>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                        New accounts are assigned Employee access by default. Store administrators can promote accounts from the Store Settings panel.
                      </p>
                    </div>
                  </div>

                  {/* Password & Confirm Password Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-300 block mb-1">
                        Password (min 6 chars)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showSignUpPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                        >
                          {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-300 block mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showSignUpPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          value={signUpConfirmPassword}
                          onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Registering with Supabase...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account & Profiles Record</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center text-[11px] text-slate-400">
                    <span>Already registered? </span>
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('signin')}
                      className="font-bold text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Sign In here
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: FORGOT PASSWORD FORM */}
              {authMode === 'forgot' && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">
                      Your Registered Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="e.g. user@zohaibdogar.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      A secure password reset link will be sent to this email from your Supabase project.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Sending Reset Instructions...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Link</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('signin')}
                      className="font-bold text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      &larr; Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* High Density Terminal Footer */}
      <footer className="w-full px-6 py-2.5 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <span>&copy; {new Date().getFullYear()} {settings.shop_name} &bull; Secured with Supabase PostgreSQL Auth</span>
        <span className="hidden sm:inline">Protected POS & Installment Management Portal</span>
      </footer>
    </div>
  );
};
