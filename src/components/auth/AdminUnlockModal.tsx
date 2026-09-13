import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { isOwnerAccount } from '../../lib/auth';
import {
  ShieldCheck,
  Crown,
  KeyRound,
  X,
  Lock,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';

export const AdminUnlockModal: React.FC = () => {
  const {
    isAdminUnlockOpen,
    setIsAdminUnlockOpen,
    currentUser,
    claimAdminPrivileges,
  } = useApp();

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAdminUnlockOpen) return null;

  const isOwner = isOwnerAccount(currentUser.email);

  const handleClaim = async (overridePin?: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await claimAdminPrivileges(overridePin !== undefined ? overridePin : pin);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to verify admin access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                <span>Store Administrator Access</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-mono border border-amber-400/30">
                  ADMIN MODE
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Unlock full accounting, profit/loss, inventory costs & store settings
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAdminUnlockOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Account Card */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Active Logged-In User
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                {currentUser.full_name || currentUser.name || 'Store User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {currentUser.email || 'Signed in via Supabase'}
              </p>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                Current: Staff View
              </span>
            </div>
          </div>

          {/* Owner One-Click Promotion Notice */}
          {isOwner ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    Store Owner Account Recognized
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                    Your account email is verified as the Primary Store Administrator. Click below to immediately switch to full Admin mode.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleClaim()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>{loading ? 'Activating...' : 'Activate Administrator Privileges Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
                <Lock className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Restricted Access</p>
                  <p className="leading-relaxed text-amber-700 dark:text-amber-400">
                    Administrator privileges are strictly reserved for the primary store owner (<strong>ahmadmalik59268@gmail.com</strong>).
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    Staff accounts operate in POS, Installment (Qist), and Customer Collection mode. Contact the store administrator if you require account changes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAdminUnlockOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Continue in Staff Mode</span>
              </button>
            </div>
          )}

          {/* Features unlocked in Admin view */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Features unlocked in Administrator view:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Store Profit & Loss</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Supplier Invoices</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Inventory Cost Prices</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Store Settings & Users</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
