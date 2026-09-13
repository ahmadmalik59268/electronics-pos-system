import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShoppingCart,
  HandCoins,
  CalendarPlus,
  Users,
  AlertTriangle,
  Package,
  CalendarCheck,
  Receipt,
  Printer,
  ChevronRight,
  TrendingUp,
  Clock,
  ShieldAlert,
  UserCheck,
  DollarSign,
  Search,
  Crown,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

export const EmployeeDashboardView: React.FC = () => {
  const {
    currentUser,
    stats,
    sales,
    contracts,
    payments,
    products,
    setActiveView,
    openPrintModal,
    settings,
    setUserRole,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  // Today's cash sales
  const todaySales = useMemo(() => {
    return sales.filter((s) => s.created_at.startsWith(todayStr));
  }, [sales, todayStr]);

  // Today's collections
  const todayPayments = useMemo(() => {
    return payments.filter((p) => p.payment_date.startsWith(todayStr));
  }, [payments, todayStr]);

  // Active contracts
  const activeContracts = useMemo(() => {
    return contracts
      .filter((c) => c.status === 'active' || c.status === 'overdue')
      .slice(0, 5);
  }, [contracts]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock_quantity <= p.min_stock_level).slice(0, 4);
  }, [products]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
      {/* Store Owner / Administrator Quick Switch Callout */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">
                Store Owner / Administrator (Ahmad Malik)?
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                Full Admin Controls
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Switch to Administrator Dashboard to view total store profit/loss, inventory purchase costs, expense analytics, and shop settings.
            </p>
          </div>
        </div>

        <button
          onClick={() => setUserRole('admin')}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
        >
          <Crown className="w-4 h-4 text-amber-300" />
          <span>Switch to Admin Dashboard</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Welcome & Shift Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Staff Cashier Active Shift
            </span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white flex items-center gap-2">
            Welcome back, {currentUser.full_name || currentUser.name || 'Staff Member'}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {settings.shop_name} &bull; Counter Sales & Customer Installment Collection Terminal
          </p>
        </div>

        {/* Quick Shift Summary Cards */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('pos')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New POS Sale</span>
          </button>
          <button
            onClick={() => setActiveView('payment-collection')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition-all active:scale-95"
          >
            <HandCoins className="w-4 h-4" />
            <span>Collect Payment</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Operational Metrics for Cashier */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Today's Cash Invoiced */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                Today's Cash Sales
              </p>
              <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">
                {formatCurrency(stats.todaySalesAmount)}
              </p>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{todaySales.length} invoices generated today</span>
            </span>
          </div>
        </div>

        {/* Metric 2: Today's Installments Collected */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                Qist Collected Today
              </p>
              <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                {formatCurrency(stats.todayInstallmentCollections)}
              </p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
              <HandCoins className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-[10px] font-bold text-blue-500 dark:text-blue-400">
            {todayPayments.length} installment receipts signed
          </p>
        </div>

        {/* Metric 3: Overdue Accounts Pending */}
        <div
          onClick={() => setActiveView('overdue')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between cursor-pointer hover:border-red-400 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                Overdue Customers
              </p>
              <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                {stats.overdueInstallmentsCount} Cases
              </p>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-[10px] font-bold text-red-500 dark:text-red-400">
            {formatCurrency(stats.overdueInstallmentsAmount)} recovery pending
          </p>
        </div>

        {/* Metric 4: Low Stock Alert */}
        <div
          onClick={() => setActiveView('products')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                Low Stock Warning
              </p>
              <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                {stats.lowStockCount} Items
              </p>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            {stats.lowStockCount > 0 ? 'Notify store manager for restock' : 'All items in stock'}
          </p>
        </div>
      </section>

      {/* SECTION 2: Fast Action Buttons Grid */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Fast Operational Workflows
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => setActiveView('pos')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cash Sale POS</span>
            <span className="text-[10px] text-slate-400">Barcode/Items</span>
          </button>

          <button
            onClick={() => setActiveView('installment-new')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">New Qist Sale</span>
            <span className="text-[10px] text-slate-400">Installment Wizard</span>
          </button>

          <button
            onClick={() => setActiveView('payment-collection')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <HandCoins className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Collect Qist</span>
            <span className="text-[10px] text-slate-400">Print Receipt</span>
          </button>

          <button
            onClick={() => setActiveView('customers')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Customers</span>
            <span className="text-[10px] text-slate-400">Search by CNIC/Phone</span>
          </button>

          <button
            onClick={() => setActiveView('overdue')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Overdue List</span>
            <span className="text-[10px] text-slate-400">Recovery & Calling</span>
          </button>

          <button
            onClick={() => setActiveView('products')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Inventory</span>
            <span className="text-[10px] text-slate-400">Prices & Serial Nos</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: 2-Column Split (Active Installment Contracts & Today's Shift Transactions) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Col: Active Installment Contracts for Follow-up */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-blue-600" />
              <span>Active Qist Accounts Requiring Attention</span>
            </h3>
            <button
              onClick={() => setActiveView('installments')}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Contract</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Balance</th>
                  <th className="px-4 py-2.5">Due Date</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {activeContracts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No active contracts found.
                    </td>
                  </tr>
                ) : (
                  activeContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {contract.contract_number}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                          {contract.customer_name}
                        </p>
                        <p className="text-[10px] text-slate-400">{contract.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(contract.remaining_balance)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(contract.next_due_date)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setActiveView('payment-collection')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-[11px] transition-colors"
                        >
                          Collect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Today's Shift Cash Sales */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Today's Cash Invoices ({todaySales.length})</span>
            </h3>
            <button
              onClick={() => setActiveView('pos')}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>Go to POS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Invoice #</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Total</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {todaySales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No cash sales invoiced today yet. Start a sale from Cash POS.
                    </td>
                  </tr>
                ) : (
                  todaySales.slice(0, 5).map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {sale.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px]">
                          {sale.customer_name}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openPrintModal('sale_invoice', sale)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 hover:text-blue-600 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Access Restriction Notice */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>
            You are logged in under <strong>Staff Cashier Access</strong>. Administrative modules (Business Profit/Loss, Expense Ledgers, System Backups & Settings) are restricted to Administrators.
          </span>
        </div>
      </div>
    </div>
  );
};
