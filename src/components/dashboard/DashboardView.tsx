import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Package,
  CalendarCheck,
  AlertTriangle,
  ShoppingCart,
  HandCoins,
  CalendarPlus,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  CalendarClock,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency, formatDate, getDaysOverdue } from '../../lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { stats, sales, payments, contracts, products, setActiveView, openPrintModal, currentUser } = useApp();
  const isAdmin = currentUser.role === 'admin';
  const [salesTimeframe, setSalesTimeframe] = useState<'7days' | '30days'>('7days');

  // Sales Trend Chart Data (Last 7 or 30 days)
  const salesChartData = useMemo(() => {
    const daysCount = salesTimeframe === '7days' ? 7 : 30;
    const data = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      // Calculate Cash sales for that day
      const daySales = sales.filter((s) => s.created_at.startsWith(dateKey));
      const cashSales = daySales.reduce((acc, s) => acc + s.total_amount, 0);

      // Calculate Installment contract sales for that day
      const dayContracts = contracts.filter((c) => c.created_at.startsWith(dateKey));
      const installmentSales = dayContracts.reduce((acc, c) => acc + c.total_installment_price, 0);

      // Calculate Installment payments collected
      const dayPayments = payments.filter((p) => p.payment_date.startsWith(dateKey));
      const collections = dayPayments.reduce((acc, p) => acc + p.amount, 0);

      data.push({
        date: formattedDate,
        cashSales,
        installmentSales,
        collections,
        totalVolume: cashSales + installmentSales,
      });
    }

    return data;
  }, [sales, contracts, payments, salesTimeframe]);

  // Cash vs Installment Donut Chart Data
  const salesDistributionData = useMemo(() => {
    const totalCash = sales.reduce((acc, s) => acc + s.total_amount, 0);
    const totalQist = contracts.reduce((acc, c) => acc + c.total_installment_price, 0);

    return [
      { name: 'Cash Sales', value: totalCash || 1, color: '#10b981' },
      { name: 'Installment (Qist)', value: totalQist || 1, color: '#3b82f6' },
    ];
  }, [sales, contracts]);

  // Active & Overdue contracts list
  const activeContracts = useMemo(() => {
    return contracts.slice(0, 5);
  }, [contracts]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock_quantity <= p.min_stock_level).slice(0, 3);
  }, [products]);

  // Recent Sales Activity
  const recentSales = useMemo(() => {
    return sales.slice(0, 5);
  }, [sales]);

  // Target calculations
  const targetAmount = 1500000;
  const currentTotalVolume = stats.totalSalesAmount + stats.todayInstallmentCollections;
  const targetPercentage = Math.min(100, Math.round((currentTotalVolume / targetAmount) * 100)) || 65;

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      {/* SECTION 1: High Density 4-Card Hero Metric Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Today's Cash Sales */}
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
              <span>Invoiced today ({sales.filter(s => s.created_at.startsWith(new Date().toISOString().split('T')[0])).length} sales)</span>
            </span>
          </div>
        </div>

        {/* Metric 2: Monthly Qist Target / Active Receivables */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                Total Outstanding Qist
              </p>
              <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">
                {formatCurrency(stats.totalOutstandingInstallments)}
              </p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
              <CalendarClock className="w-5 h-5" />
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${targetPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 3: Overdue Payments */}
        <div
          onClick={() => setActiveView('overdue')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between cursor-pointer hover:border-red-400 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                Overdue Payments
              </p>
              <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                {stats.overdueInstallmentsCount} <span className="text-xs font-medium text-slate-400">Cases</span>
              </p>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-[10px] font-bold text-red-500 dark:text-red-400 italic">
            {stats.overdueInstallmentsCount > 0
              ? `Due: ${formatCurrency(stats.overdueInstallmentsAmount)} (Action needed)`
              : 'All accounts up-to-date'}
          </p>
        </div>

        {/* Metric 4: Net Profit (MTD) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                Net Profit (MTD)
              </p>
              <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">
                {isAdmin ? formatCurrency(stats.netProfit) : '••••••'}
              </p>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-[10px] font-bold text-slate-400">
            {isAdmin ? `After ${formatCurrency(stats.totalExpenses)} expenses` : 'Admin access required'}
          </div>
        </div>
      </section>

      {/* SECTION 2: 3-Column Split (2 cols: Active Installment Contracts Table, 1 col: Quick Actions & Stock Alerts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Active Installment Contracts High Density Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Active Installment Contracts
            </h3>
            <button
              onClick={() => setActiveView('installments')}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <span>View All Contracts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Contract #</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Customer</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Product</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Balance</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Next Due</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800/60">
                {activeContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No installment contracts found. Start a new Qist sale.
                    </td>
                  </tr>
                ) : (
                  activeContracts.map((contract) => {
                    const isOverdue = contract.status === 'overdue' || (contract.status === 'active' && (contract.schedule || []).some((s) => s.status === 'overdue'));
                    const isCompleted = contract.status === 'completed' || contract.remaining_balance <= 0;

                    return (
                      <tr
                        key={contract.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => setActiveView('installments')}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {contract.contract_number}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900 dark:text-white">{contract.customer_name}</p>
                          <p className="text-[10px] text-slate-400">{contract.customer_phone}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[160px] truncate">
                          {contract.product_summary}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {formatCurrency(contract.remaining_balance)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {isOverdue ? (
                            <span className="text-red-500 font-bold">Overdue</span>
                          ) : (
                            formatDate(contract.next_due_date)
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isCompleted ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-full text-[9px] font-bold uppercase">
                              Completed
                            </span>
                          ) : isOverdue ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-full text-[9px] font-bold uppercase">
                              Overdue
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 rounded-full text-[9px] font-bold uppercase">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Quick Sale Actions + Stock Alerts + Collection Progress */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col p-4">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            Quick Sale Actions
          </h3>

          <div className="space-y-2.5">
            <button
              onClick={() => setActiveView('pos')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>New Cash Sale</span>
            </button>

            <button
              onClick={() => setActiveView('installment-new')}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition-colors"
            >
              <CalendarClock className="w-4 h-4" />
              <span>New Installment Plan</span>
            </button>

            <button
              onClick={() => setActiveView('payment-collection')}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition-colors"
            >
              <HandCoins className="w-4 h-4" />
              <span>Collect Qist Payment</span>
            </button>
          </div>

          {/* Stock Alerts Widget */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest">
                Stock Alerts
              </h4>
              <button
                onClick={() => setActiveView('products')}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Inventory
              </button>
            </div>

            <div className="space-y-2">
              {lowStockProducts.length === 0 ? (
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  ✓ All stock levels optimal.
                </div>
              ) : (
                lowStockProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-2 bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/60 rounded-lg flex justify-between items-center"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-orange-800 dark:text-orange-200 truncate">{prod.name}</p>
                      <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                        {prod.stock_quantity === 0 ? 'Out of stock' : `Only ${prod.stock_quantity} units left`}
                      </p>
                    </div>
                    {isAdmin ? (
                      <button
                        onClick={() => setActiveView('purchases')}
                        className="text-[10px] bg-white dark:bg-slate-800 px-2 py-1 rounded border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 font-bold shrink-0 hover:bg-orange-50"
                      >
                        Order
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300">Min {prod.min_stock_level}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Collection Progress */}
          <div className="mt-auto pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Collection Progress</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {formatCurrency(stats.todayCashReceived)}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(15, (stats.todayCashReceived / 250000) * 100))}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Analytical Charts (Volume trends & Cash vs Qist Ratio) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales & Collections Trends (2 cols) */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">Sales & Qist Volume Trends</h3>
              <p className="text-[11px] text-slate-400">Daily Cash sales, Qist contracts & payments collected</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg self-start sm:self-auto">
              <button
                onClick={() => setSalesTimeframe('7days')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  salesTimeframe === '7days'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setSalesTimeframe('30days')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  salesTimeframe === '30days'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInstallment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `Rs.${v >= 1000 ? `${v / 1000}k` : v}`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    borderColor: '#334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Area type="monotone" dataKey="cashSales" name="Cash Sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCash)" />
                <Area type="monotone" dataKey="installmentSales" name="Qist Volume" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorInstallment)" />
                <Area type="monotone" dataKey="collections" name="Qist Collected" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorCollection)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Distribution Donut Chart (1 col) */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">Cash vs. Qist Ratio</h3>
            <p className="text-[11px] text-slate-400">Sales volume distribution</p>
          </div>

          <div className="h-44 sm:h-48 w-full flex items-center justify-center my-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {salesDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Total']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    borderColor: '#334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {salesDistributionData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-[11px]">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
