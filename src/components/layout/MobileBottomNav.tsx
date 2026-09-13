import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  ShoppingCart,
  CalendarClock,
  CalendarCheck,
  HandCoins,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMobileMenu }) => {
  const { activeView, setActiveView, stats } = useApp();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'pos',
      label: 'Sale (POS)',
      icon: ShoppingCart,
    },
    {
      id: 'installment-new',
      label: 'New Qist',
      icon: CalendarClock,
      isSpecial: true,
    },
    {
      id: 'installments',
      label: 'Contracts',
      icon: CalendarCheck,
      badge: stats.overdueInstallmentsCount > 0 ? stats.overdueInstallmentsCount : null,
    },
    {
      id: 'payment-collection',
      label: 'Collect',
      icon: HandCoins,
    },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg px-2 py-1 flex items-center justify-around safe-bottom transition-colors"
      aria-label="Mobile Navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;

        if (item.isSpecial) {
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="relative -top-2 flex flex-col items-center justify-center p-1 group"
              aria-label="New Installment Sale"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-indigo-500/40 ring-4 ring-indigo-500/20'
                    : 'bg-indigo-600 text-white shadow-indigo-600/30'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 tracking-tight">
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all min-w-[52px] min-h-[44px] ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              {item.badge !== null && item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white min-w-[16px] text-center leading-tight">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
          </button>
        );
      })}

      {/* Menu / Drawer Toggle */}
      <button
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 min-w-[52px] min-h-[44px]"
        aria-label="Open Full Menu"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 leading-tight">Menu</span>
      </button>
    </nav>
  );
};
