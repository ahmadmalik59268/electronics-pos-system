import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ReceiptText,
  Search,
  PlusCircle,
  Trash2,
  X,
  PieChart as PieChartIcon,
  TrendingDown,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Expense } from '../../types';

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense, deleteExpense, addToast } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electricity');
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [notes, setNotes] = useState('');

  const categories = [
    'Electricity',
    'Shop Rent',
    'Staff Salary',
    'Tea & Refreshment',
    'Internet & Utilities',
    'Maintenance & Repair',
    'Marketing & Ads',
    'Other',
  ];

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQ = !q || e.title.toLowerCase().includes(q) || (e.notes && e.notes.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [expenses, categoryFilter, searchQuery]);

  const totalExpenseSum = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || amount <= 0) {
      addToast('error', 'Please provide a valid title and amount.');
      return;
    }

    addExpense({
      title,
      category: category as any,
      amount,
      date: expenseDate,
      expense_date: expenseDate,
      description: notes,
      notes,
      payment_method: paymentMethod,
    });

    setModalOpen(false);
    setTitle('');
    setAmount(0);
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-indigo-600" />
            Shop Expenses & Operational Costs
          </h2>
          <p className="text-xs text-slate-500">
            Log shop rent, utilities, salaries, and maintenance to accurately calculate net business profit.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Expense Summary & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses by title or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
            Total: {formatCurrency(totalExpenseSum)}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Expense Title</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Notes</th>
                <th className="p-3.5 font-bold">Amount</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">{exp.title}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500">{formatDate(exp.expense_date)}</td>
                  <td className="p-3.5 capitalize text-slate-600 dark:text-slate-400">{exp.payment_method}</td>
                  <td className="p-3.5 text-slate-500">{exp.notes || '-'}</td>
                  <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400 text-sm">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredExpenses.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <ReceiptText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No expenses found</p>
          </div>
        )}
      </div>

      {/* Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Shop Expense</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shop Electricity Bill - March"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Amount (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-base font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Paid Via</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="bank">Bank Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Notes / Bill #</label>
                <input
                  type="text"
                  placeholder="Optional reference / invoice number"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
