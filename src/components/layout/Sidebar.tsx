import React from 'react';
import { useApp } from '../../context/AppContext';
import { isOwnerAccount } from '../../lib/auth';
import {
  LayoutDashboard,
  ShoppingCart,
  CalendarClock,
  CalendarCheck,
  HandCoins,
  AlertTriangle,
  Package,
  Users,
  Truck,
  PackagePlus,
  RotateCcw,
  ReceiptText,
  BarChart3,
  Settings,
  X,
  Lock,
  Tv,
  LogOut,
  Crown,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  badgeColor?: string;
  adminOnly: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenAuthModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile, onOpenAuthModal }) => {
  const { activeView, setActiveView, currentUser, stats, settings, signOutUser, setUserRole } = useApp();
  const isAdmin = currentUser.role === 'admin';

  const navSections: NavSection[] = [
    {
      title: 'Sales & POS',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null, adminOnly: false },
        { id: 'pos', label: 'Cash Sale (POS)', icon: ShoppingCart, badge: null, adminOnly: false },
        { id: 'installment-new', label: 'Installments (Qist)', icon: CalendarClock, badge: 'New', adminOnly: false },
      ],
    },
    {
      title: 'Installment Management',
      items: [
        { id: 'installments', label: 'Active Contracts', icon: CalendarCheck, badge: null, adminOnly: false },
        { id: 'payment-collection', label: 'Collect Payment', icon: HandCoins, badge: null, adminOnly: false },
        {
          id: 'overdue',
          label: 'Overdue Payments',
          icon: AlertTriangle,
          badge: stats.overdueInstallmentsCount > 0 ? stats.overdueInstallmentsCount.toString() : null,
          badgeColor: 'bg-red-500 text-white',
          adminOnly: false,
        },
      ],
    },
    {
      title: 'Inventory & Directory',
      items: [
        {
          id: 'products',
          label: 'Inventory',
          icon: Package,
          badge: stats.lowStockCount > 0 ? `${stats.lowStockCount} Low` : null,
          badgeColor: 'bg-amber-500 text-white',
          adminOnly: false,
        },
        { id: 'customers', label: 'Customers', icon: Users, badge: null, adminOnly: false },
        { id: 'suppliers', label: 'Suppliers', icon: Truck, badge: null, adminOnly: false },
        { id: 'purchases', label: 'Stock In / Purchases', icon: PackagePlus, badge: null, adminOnly: true },
        { id: 'returns', label: 'Sales Returns', icon: RotateCcw, badge: null, adminOnly: false },
      ],
    },
    {
      title: 'Accounting & Admin',
      items: [
        { id: 'expenses', label: 'Expenses', icon: ReceiptText, badge: null, adminOnly: true },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, badge: null, adminOnly: true },
        { id: 'employees', label: 'Employees & Users', icon: Users, badge: null, adminOnly: true },
        { id: 'settings', label: 'Settings & Supabase', icon: Settings, badge: null, adminOnly: true },
      ],
    },
  ];

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const userInitials = (currentUser.name || currentUser.full_name || 'AD')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-0 left-0 z-40 h-full lg:h-screen w-60 bg-slate-900 text-white flex flex-col justify-between transition-all duration-200 ease-in-out shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => handleNavClick('dashboard')}
          >
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg text-white shadow-xs">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-base tracking-tight uppercase text-white block truncate">
                {settings.shop_name || 'Zohaib Dogar Electronics'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                POS & Qist System
              </span>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </p>

                <div className="space-y-0.5 mt-1">
                  {visibleItems.map((item) => {
                    const isActive = activeView === item.id;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-white' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                              item.badgeColor || 'bg-blue-500/30 text-blue-200'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Card at Bottom */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 space-y-2">
          {!isAdmin && isOwnerAccount(currentUser.email) && (
            <button
              onClick={() => setUserRole('admin')}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-blue-500/20 hover:from-amber-500/30 hover:to-blue-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Switch to Admin Mode</span>
            </button>
          )}

          <div
            onClick={onOpenAuthModal}
            className="flex items-center justify-between p-2 bg-slate-800 hover:bg-slate-700/80 rounded transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400">
                  {currentUser.role === 'admin' ? 'Administrator' : 'Staff Employee'}
                </p>
                <p className="text-xs font-semibold text-white truncate">
                  {currentUser.name || currentUser.full_name || 'Staff User'}
                </p>
              </div>
            </div>
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <button
            onClick={() => signOutUser()}
            className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800/50 border border-slate-700/60 text-slate-300 text-xs font-medium transition-all cursor-pointer"
            title="Sign out from Supabase"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
