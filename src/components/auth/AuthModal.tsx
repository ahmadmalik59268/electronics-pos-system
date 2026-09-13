import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, UserCheck, Lock, LogOut, CheckCircle2, X, Mail, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, signOutUser } = useApp();

  if (!isOpen) return null;

  const handleSignOut = async () => {
    onClose();
    await signOutUser();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Active Supabase Account
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Authenticated via Supabase Cloud Auth
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-md ${
                currentUser.role === 'admin'
                  ? 'bg-blue-600 shadow-blue-600/30'
                  : 'bg-emerald-600 shadow-emerald-600/30'
              }`}
            >
              {currentUser.role === 'admin' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <UserCheck className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                {currentUser.full_name || currentUser.name || 'Staff User'}
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    currentUser.role === 'admin'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {currentUser.role === 'admin' ? 'Administrator' : 'Staff Cashier'}
                </span>
                <span className="text-[11px] text-slate-400">• Active Session</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {currentUser.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] text-slate-400 font-mono truncate">
                ID: {currentUser.id}
              </span>
            </div>
          </div>
        </div>

        {/* Real Sign Out Action */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out from Terminal</span>
          </button>
          <p className="text-[11px] text-slate-400 text-center">
            To switch between Admin and Staff accounts, please sign out and sign in with the appropriate Supabase user credentials.
          </p>
        </div>
      </div>
    </div>
  );
};
