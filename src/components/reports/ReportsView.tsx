import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  DollarSign,
  CalendarCheck,
  Package,
  Printer,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const ReportsView: React.FC = () => {
  const { sales, contracts, payments, expenses, products, customers, stats, openPrintModal } = useApp();

  const [reportType, setReportType] = useState<
    'profit_loss' | 'daily_sales' | 'product_performance' | 'installment_recovery' | 'customer_balances'
  >('profit_loss');

  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year'>('month');

  // Profit & Loss Breakdown
  const pnl = useMemo(() => {
    const cashSalesRevenue = sales.reduce((acc, s) => acc + s.total_amount, 0);
    const cashSalesCost = sales.reduce((acc, s) => acc + s.total_cost, 0);
    const cashSalesProfit = sales.reduce((acc, s) => acc + s.profit, 0);

    const qistTotalRevenue = contracts.reduce((acc, c) => acc + c.total_installment_price, 0);
    const qistTotalCost = contracts.reduce((acc, c) => acc + c.total_cash_price, 0);
    const qistTotalProfit = contracts.reduce((acc, c) => acc + c.total_profit, 0);

    const grossRevenue = cashSalesRevenue + qistTotalRevenue;
    const grossCost = cashSalesCost + qistTotalCost;
    const grossProfit = cashSalesProfit + qistTotalProfit;

    const totalExpense = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = grossProfit - totalExpense;

    return {
      cashSalesRevenue,
      cashSalesCost,
      cashSalesProfit,
      qistTotalRevenue,
      qistTotalCost,
      qistTotalProfit,
      grossRevenue,
      grossCost,
      grossProfit,
      totalExpense,
      netProfit,
    };
  }, [sales, contracts, expenses]);

  // Product Wise Sales Aggregation
  const productPerformance = useMemo(() => {
    const map: { [key: string]: { name: string; brand: string; qtySold: number; revenue: number; profit: number } } = {};

    sales.forEach((s) => {
      s.items.forEach((it) => {
        if (!map[it.product_id]) {
          map[it.product_id] = {
            name: it.product_name,
            brand: it.brand || 'Electronics',
            qtySold: 0,
            revenue: 0,
            profit: 0,
          };
        }
        map[it.product_id].qtySold += it.quantity;
        map[it.product_id].revenue += it.total;
        map[it.product_id].profit += it.total - it.purchase_price * it.quantity;
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  // Printable action
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Financial Reports & Profit Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Comprehensive audit logs, Gross & Net Profit/Loss statements, and recovery ratios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'profit_loss', label: 'Profit & Loss Statement' },
          { id: 'daily_sales', label: 'Cash & POS Sales Log' },
          { id: 'product_performance', label: 'Product Performance' },
          { id: 'installment_recovery', label: 'Qist Recovery & Overdue' },
          { id: 'customer_balances', label: 'Customer Balances' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              reportType === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPORT 1: Profit & Loss Statement */}
      {reportType === 'profit_loss' && (
        <div className="space-y-6">
          {/* Big Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Gross Sales Revenue</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {formatCurrency(pnl.grossRevenue)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Cash POS + Qist Total Contracts</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Cost of Goods Sold (COGS)</span>
              <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
                {formatCurrency(pnl.grossCost)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Actual device purchase price</p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg">
              <span className="text-xs font-semibold text-emerald-100">Net Business Profit</span>
              <p className="text-3xl font-black mt-1">
                {formatCurrency(pnl.netProfit)}
              </p>
              <p className="text-[11px] text-emerald-100 mt-1">
                Gross Profit ({formatCurrency(pnl.grossProfit)}) - Expenses ({formatCurrency(pnl.totalExpense)})
              </p>
            </div>
          </div>

          {/* Detailed P&L Statement Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Income & Expense Statement Audit
            </h3>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
              <table className="w-full text-left">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold">
                    <td className="p-3 text-slate-900 dark:text-white">1. Revenue & Sales</td>
                    <td className="p-3 text-right">Amount (Rs.)</td>
                  </tr>
                  <tr>
                    <td className="p-3 pl-6 text-slate-600 dark:text-slate-300">Counter Cash Sales Invoiced</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(pnl.cashSalesRevenue)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 pl-6 text-slate-600 dark:text-slate-300">Installment (Qist) Agreements Contracted</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(pnl.qistTotalRevenue)}</td>
                  </tr>
                  <tr className="font-bold bg-slate-50/50 dark:bg-slate-800/30">
                    <td className="p-3">Total Gross Sales Volume</td>
                    <td className="p-3 text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(pnl.grossRevenue)}</td>
                  </tr>

                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold">
                    <td className="p-3 text-slate-900 dark:text-white">2. Cost of Products Sold (COGS)</td>
                    <td className="p-3 text-right">Amount (Rs.)</td>
                  </tr>
                  <tr>
                    <td className="p-3 pl-6 text-slate-600 dark:text-slate-300">Cash Items Purchase Cost</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(pnl.cashSalesCost)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 pl-6 text-slate-600 dark:text-slate-300">Qist Items Purchase Cost</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(pnl.qistTotalCost)}</td>
                  </tr>
                  <tr className="font-bold bg-slate-50/50 dark:bg-slate-800/30">
                    <td className="p-3">Gross Margin / Profit Before Expenses</td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(pnl.grossProfit)}</td>
                  </tr>

                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold">
                    <td className="p-3 text-slate-900 dark:text-white">3. Operational Expenses</td>
                    <td className="p-3 text-right">Amount (Rs.)</td>
                  </tr>
                  {expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="p-3 pl-6 text-slate-600 dark:text-slate-300">{exp.title} ({exp.category})</td>
                      <td className="p-3 text-right text-rose-600">{formatCurrency(exp.amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300">
                    <td className="p-3">Total Shop Expenses</td>
                    <td className="p-3 text-right">{formatCurrency(pnl.totalExpense)}</td>
                  </tr>

                  <tr className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-black text-sm">
                    <td className="p-4">NET BUSINESS PROFIT</td>
                    <td className="p-4 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(pnl.netProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: Daily Sales Log */}
      {reportType === 'daily_sales' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">
            Cash POS Invoices Log ({sales.length} Invoices)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items Sold</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Cost</th>
                  <th className="p-3 font-bold text-emerald-600">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-indigo-600">{s.invoice_number}</td>
                    <td className="p-3 text-slate-500">{formatDate(s.created_at)}</td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{s.customer_name}</td>
                    <td className="p-3">{s.items.map((i) => `${i.product_name} (${i.quantity})`).join(', ')}</td>
                    <td className="p-3 font-bold">{formatCurrency(s.total_amount)}</td>
                    <td className="p-3 text-slate-500">{formatCurrency(s.total_cost)}</td>
                    <td className="p-3 font-bold text-emerald-600">{formatCurrency(s.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 3: Product Performance */}
      {reportType === 'product_performance' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">
            Best Selling Products & Revenue Ranking
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Brand</th>
                  <th className="p-3 text-center">Units Sold</th>
                  <th className="p-3">Total Revenue</th>
                  <th className="p-3 font-bold text-emerald-600">Total Profit Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productPerformance.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{p.name}</td>
                    <td className="p-3 text-slate-500">{p.brand}</td>
                    <td className="p-3 text-center font-bold text-indigo-600">{p.qtySold}</td>
                    <td className="p-3 font-bold">{formatCurrency(p.revenue)}</td>
                    <td className="p-3 font-bold text-emerald-600">{formatCurrency(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 4: Installment Recovery & Overdue */}
      {reportType === 'installment_recovery' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">
            Installment Portfolio & Recovery Audit
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Contract #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Contract Value</th>
                  <th className="p-3">Recovered (Advance+Qist)</th>
                  <th className="p-3 text-rose-600">Remaining Balance</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-indigo-600">{c.contract_number}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{c.customer_name}</td>
                    <td className="p-3 font-bold">{formatCurrency(c.total_installment_price)}</td>
                    <td className="p-3 font-semibold text-emerald-600">{formatCurrency(c.down_payment + c.total_paid_installments)}</td>
                    <td className="p-3 font-bold text-rose-600">{formatCurrency(c.outstanding_amount)}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 5: Customer Balances */}
      {reportType === 'customer_balances' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">
            Customer Credit & Outstanding Ledger Summary
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">CNIC</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Lifetime Purchases</th>
                  <th className="p-3 font-bold text-rose-600">Current Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{c.full_name}</td>
                    <td className="p-3">{c.phone}</td>
                    <td className="p-3 font-mono">{c.cnic}</td>
                    <td className="p-3 text-slate-500">{c.city}</td>
                    <td className="p-3 font-bold">{formatCurrency(c.total_purchased)}</td>
                    <td className="p-3 font-bold text-rose-600">{formatCurrency(c.total_outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
