import React from 'react';
import { useApp } from '../../context/AppContext';
import { isOwnerAccount } from '../../lib/auth';
import {
  Sun,
  Moon,
  Search,
  ShoppingCart,
  CalendarPlus,
  HandCoins,
  ShieldCheck,
  UserCheck,
  Menu,
  Lock,
  Bell,
  LogOut,
  Crown,
  User,
} from 'lucide-react';

interface NavbarProps {
  onMobileMenuToggle?: () => void;
  onOpenAuthModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle, onOpenAuthModal }) => {
  const {
    currentUser,
    setUserRole,
    theme,
    toggleTheme,
    stats,
    setGlobalSearchOpen,
    setActiveView,
    signOutUser,
  } = useApp();

  const isOwnerOrAdmin = isOwnerAccount(currentUser.email) || currentUser.role === 'admin';

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      {/* Left: Mobile Toggle & Header Title + Date */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-3">
          <h1 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white tracking-tight">
            System Overview
          </h1>
          <div className="hidden sm:block h-4 w-[1px] bg-slate-300 dark:bg-slate-700"></div>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-medium">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Center: High Density Quick Search */}
      <div className="hidden md:flex items-center max-w-sm w-full mx-4">
        <div
          onClick={() => setGlobalSearchOpen(true)}
          className="relative w-full cursor-pointer"
        >
          <input
            type="text"
            readOnly
            placeholder="Quick search IMEI, customer, or invoice..."
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-md px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            Ctrl+K
          </span>
        </div>
      </div>

      {/* Right Controls: Quick Actions + Alerts + Role Switcher + Theme Toggle */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Search Icon */}
        <button
          onClick={() => setGlobalSearchOpen(true)}
          className="md:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Quick POS Button */}
        <button
          onClick={() => setActiveView('pos')}
          className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>New Cash Sale</span>
        </button>

        {/* Quick Qist Button */}
        <button
          onClick={() => setActiveView('installment-new')}
          className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span>New Qist</span>
        </button>

        {/* Overdue Notification Bell */}
        <button
          onClick={() => setActiveView('overdue')}
          className="relative p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Overdue alerts"
        >
          <Bell className="w-4 h-4" />
          {stats.overdueInstallmentsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
          )}
        </button>



        {/* Dark/Light Mode Switcher */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-3.5 h-3.5 text-slate-700" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
        </button>

        {/* Role Switcher Pill (Admin/Owner Only) or Staff Badge */}
        {isOwnerOrAdmin ? (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setUserRole('admin')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                currentUser.role === 'admin'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700'
              }`}
              title="Switch to Administrator Dashboard"
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Admin Mode</span>
            </button>
            <button
              onClick={() => setUserRole('employee')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                currentUser.role === 'employee'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-700'
              }`}
              title="Switch to Staff Cashier mode"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Staff Mode</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Staff POS Mode</span>
          </div>
        )}

        {/* Auth / Users Switch Button */}
        {onOpenAuthModal && (
          <button
            onClick={onOpenAuthModal}
            className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            title="Switch account"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Real Logout Button */}
        <button
          onClick={() => signOutUser()}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold transition-colors cursor-pointer"
          title="Sign out from Supabase"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
