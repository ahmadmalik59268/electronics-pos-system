import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { ToastContainer } from './components/common/ToastContainer';
import { PrintModal } from './components/print/PrintModal';
import { AuthModal } from './components/auth/AuthModal';
import { AuthPage } from './components/auth/AuthPage';
import { AdminUnlockModal } from './components/auth/AdminUnlockModal';
import { IS_SUPABASE_CONFIGURED } from './lib/supabase';
import { initCapacitorNativeFeatures, setupAndroidBackButton } from './lib/capacitor';
import { Tv, RefreshCw } from 'lucide-react';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { EmployeeDashboardView } from './components/dashboard/EmployeeDashboardView';
import { POSView } from './components/pos/POSView';
import { InstallmentsView } from './components/installments/InstallmentsView';
import { InstallmentSaleWizard } from './components/installments/InstallmentSaleWizard';
import { PaymentCollectionView } from './components/installments/PaymentCollectionView';
import { OverdueView } from './components/installments/OverdueView';
import { ProductsView } from './components/inventory/ProductsView';
import { CustomersView } from './components/customers/CustomersView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { SalesReturnsView } from './components/returns/SalesReturnsView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ReportsView } from './components/reports/ReportsView';
import { EmployeesView } from './components/employees/EmployeesView';
import { SettingsView } from './components/settings/SettingsView';

const MainLayout: React.FC = () => {
  const {
    activeView,
    setActiveView,
    currentUser,
    isAuthenticated,
    authLoading,
    theme,
    printModalOpen,
    setPrintModalOpen,
    globalSearchOpen,
    setGlobalSearchOpen,
    isAdminUnlockOpen,
    setIsAdminUnlockOpen,
    addToast,
  } = useApp();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize native Capacitor Android features (Status Bar, Splash Screen, Keyboard)
  useEffect(() => {
    initCapacitorNativeFeatures(theme);
  }, [theme]);

  // Setup Android Hardware Back Button listener
  useEffect(() => {
    const cleanup = setupAndroidBackButton(
      () => {
        // 1. Close active modals first
        if (printModalOpen) {
          setPrintModalOpen(false);
          return true;
        }
        if (globalSearchOpen) {
          setGlobalSearchOpen(false);
          return true;
        }
        if (isAdminUnlockOpen) {
          setIsAdminUnlockOpen(false);
          return true;
        }
        if (authModalOpen) {
          setAuthModalOpen(false);
          return true;
        }
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
          return true;
        }

        // 2. Navigate back to home dashboard if inside a sub-screen
        const defaultHome = currentUser.role === 'admin' ? 'dashboard' : 'employee-dashboard';
        if (activeView !== defaultHome) {
          setActiveView(defaultHome);
          return true;
        }

        return false;
      },
      () => {
        addToast('info', 'Press back again to exit app', 'Exit App');
      }
    );

    return () => {
      cleanup();
    };
  }, [
    printModalOpen,
    globalSearchOpen,
    isAdminUnlockOpen,
    authModalOpen,
    mobileMenuOpen,
    activeView,
    currentUser.role,
    setPrintModalOpen,
    setGlobalSearchOpen,
    setIsAdminUnlockOpen,
    setActiveView,
    addToast,
  ]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-sm font-medium text-slate-300">Authenticating with Supabase...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        <ToastContainer />
      </>
    );
  }

  // Render view corresponding to current activeView
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
      case 'employee-dashboard':
        return currentUser.role === 'admin' ? <DashboardView /> : <EmployeeDashboardView />;
      case 'pos':
        return <POSView />;
      case 'installments':
        return <InstallmentsView />;
      case 'installment-new':
        return <InstallmentSaleWizard />;
      case 'payment-collection':
        return <PaymentCollectionView />;
      case 'overdue':
        return <OverdueView />;
      case 'products':
        return <ProductsView />;
      case 'customers':
        return <CustomersView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'purchases':
        return currentUser.role === 'admin' ? <PurchasesView /> : <ProductsView />;
      case 'returns':
        return <SalesReturnsView />;
      case 'expenses':
        return currentUser.role === 'admin' ? <ExpensesView /> : <POSView />;
      case 'reports':
        return currentUser.role === 'admin' ? <ReportsView /> : <POSView />;
      case 'employees':
        return currentUser.role === 'admin' ? <EmployeesView /> : <POSView />;
      case 'settings':
        return currentUser.role === 'admin' ? <SettingsView /> : <POSView />;
      default:
        return currentUser.role === 'admin' ? <DashboardView /> : <EmployeeDashboardView />;
    }
  };

  return (
    <div className="h-screen w-screen flex bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden antialiased selection:bg-blue-600 selection:text-white">
      {/* Navigation Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Global High Density Navbar */}
        <Navbar
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 pb-20 lg:pb-5">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>

        {/* High Density Status Bar Footer (Desktop) */}
        <footer className="hidden lg:flex h-8 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 items-center justify-between px-6 shrink-0 transition-colors">
          <div className="flex space-x-4">
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
              Database: {IS_SUPABASE_CONFIGURED ? 'Connected (PostgreSQL)' : 'Connected (Local Persistence)'}
            </span>
            <span className="hidden sm:inline-block text-[10px] text-slate-500 font-medium uppercase tracking-widest">
              Role: {currentUser.role === 'admin' ? 'Admin Access' : 'Staff Access'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-bold">
            v1.4.0-Production
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav onOpenMobileMenu={() => setMobileMenuOpen(true)} />

      {/* Global Interactive Modals and Portals */}
      <GlobalSearchModal />
      <ToastContainer />
      <PrintModal />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <AdminUnlockModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
