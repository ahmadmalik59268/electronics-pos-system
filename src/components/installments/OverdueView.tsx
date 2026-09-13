import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  Search,
  PhoneCall,
  MessageSquare,
  HandCoins,
  Printer,
  Clock,
  ExternalLink,
  CheckCircle2,
  FileWarning,
} from 'lucide-react';
import { formatCurrency, formatDate, getDaysOverdue } from '../../lib/utils';
import { InstallmentContract, InstallmentScheduleItem } from '../../types';

export const OverdueView: React.FC = () => {
  const { contracts, recordInstallmentPayment, openPrintModal, setActiveView } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [daysFilter, setDaysFilter] = useState<'all' | '7days' | '15days' | '30days' | '60plus'>('all');

  // Collect all individual overdue schedule items across contracts
  const overdueItems = useMemo(() => {
    const list: { contract: InstallmentContract; schedule: InstallmentScheduleItem; daysOverdue: number }[] = [];
    const today = new Date();

    contracts.forEach((c) => {
      (c.schedule || []).forEach((s) => {
        if (s.status !== 'paid') {
          const dueDate = new Date(s.due_date);
          if (dueDate < today) {
            const diffTime = Math.abs(today.getTime() - dueDate.getTime());
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            list.push({
              contract: c,
              schedule: s,
              daysOverdue: days,
            });
          }
        }
      });
    });

    // Sort by most overdue first
    return list.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [contracts]);

  // Filtered
  const filteredOverdue = useMemo(() => {
    return overdueItems.filter((item) => {
      // Days filter
      if (daysFilter === '7days' && item.daysOverdue < 7) return false;
      if (daysFilter === '15days' && item.daysOverdue < 15) return false;
      if (daysFilter === '30days' && item.daysOverdue < 30) return false;
      if (daysFilter === '60plus' && item.daysOverdue < 60) return false;

      // Query filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const custName = (item.contract.customer_name || '').toLowerCase();
      const custPhone = (item.contract.customer_phone || '').toLowerCase();
      const custCnic = (item.contract.customer_cnic || '').toLowerCase();
      const contractNum = (item.contract.contract_number || '').toLowerCase();
      const prodSummary = (item.contract.product_summary || '').toLowerCase();

      return (
        custName.includes(q) ||
        custPhone.includes(q) ||
        custCnic.includes(q) ||
        contractNum.includes(q) ||
        prodSummary.includes(q)
      );
    });
  }, [overdueItems, daysFilter, searchQuery]);

  const totalOverdueAmount = filteredOverdue.reduce(
    (acc, it) => acc + (it.schedule.amount_due - it.schedule.amount_paid),
    0
  );

  // Generate WhatsApp message link
  const getWhatsAppLink = (phone: string, name: string, amount: number, contractNum: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `92${cleanPhone.slice(1)}` : cleanPhone;
    const text = encodeURIComponent(
      `Dear ${name}, this is a gentle payment reminder from our shop regarding your Installment Contract #${contractNum}. An installment of Rs. ${amount.toLocaleString()} is currently overdue. Kindly clear your dues at the earliest convenience. Thank you.`
    );
    return `https://wa.me/${formattedPhone}?text=${text}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Alert */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-white shadow-xl border border-rose-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Recovery & Collections Alert
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
            Overdue Installment Recovery Desk
          </h2>
          <p className="text-xs sm:text-sm text-rose-200 mt-0.5">
            Real-time tracking of delayed payments, days overdue, and instant WhatsApp/Call reminder tools.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-black/30 border border-rose-700/50 text-right">
          <span className="text-xs text-rose-300">Total Unrecovered Amount</span>
          <p className="text-xl sm:text-2xl font-black text-rose-300 mt-0.5">
            {formatCurrency(totalOverdueAmount)}
          </p>
          <span className="text-[11px] text-rose-300/80">{filteredOverdue.length} Delayed Installments</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search overdue customer by name, phone, CNIC or contract..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Delay Threshold Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Overdue' },
            { id: '7days', label: '> 7 Days' },
            { id: '15days', label: '> 15 Days' },
            { id: '30days', label: '> 30 Days' },
            { id: '60plus', label: '> 60 Days Critical' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setDaysFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                daysFilter === f.id
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overdue Items List & Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Mobile Overdue Cards (block md:hidden) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredOverdue.map((item, idx) => {
            const dueAmt = item.schedule.amount_due - item.schedule.amount_paid;

            return (
              <div key={idx} className="p-4 space-y-3 hover:bg-rose-50/20 dark:hover:bg-rose-950/10 transition-colors">
                {/* Header: Customer, Contract & Days Late */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.contract.customer_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {item.contract.contract_number}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Installment #{item.schedule.installment_number}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.daysOverdue >= 30
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {item.daysOverdue}d Late
                  </span>
                </div>

                {/* Due Info Pill */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60">
                  <div>
                    <span className="text-[10px] text-rose-700/80 dark:text-rose-300 block">Due Date: {formatDate(item.schedule.due_date)}</span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">{item.contract.product_summary}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-rose-700/80 dark:text-rose-300 block">Installment Due</span>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                      {formatCurrency(dueAmt)}
                    </span>
                  </div>
                </div>

                {/* Touch Recovery Actions */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <a
                    href={`tel:${item.contract.customer_phone}`}
                    className="py-2 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Call</span>
                  </a>

                  <a
                    href={getWhatsAppLink(
                      item.contract.customer_phone,
                      item.contract.customer_name,
                      dueAmt,
                      item.contract.contract_number
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={() => setActiveView('payment-collection')}
                    className="py-2 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
                  >
                    <HandCoins className="w-3.5 h-3.5" />
                    <span>Collect</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Customer & Contact</th>
                <th className="p-3.5">Contract #</th>
                <th className="p-3.5">Product Summary</th>
                <th className="p-3.5">Installment #</th>
                <th className="p-3.5">Due Date</th>
                <th className="p-3.5">Days Late</th>
                <th className="p-3.5">Due Amount</th>
                <th className="p-3.5 text-right">Recovery Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOverdue.map((item, idx) => {
                const dueAmt = item.schedule.amount_due - item.schedule.amount_paid;

                return (
                  <tr key={idx} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">{item.contract.customer_name}</p>
                      <p className="text-[11px] text-slate-500">{item.contract.customer_phone}</p>
                      <p className="text-[10px] text-slate-400 font-mono">CNIC: {item.contract.customer_cnic}</p>
                    </td>
                    <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      {item.contract.contract_number}
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-slate-900 dark:text-white line-clamp-1">
                        {item.contract.product_summary}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Remaining: {formatCurrency(item.contract.outstanding_amount)}
                      </p>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      Installment #{item.schedule.installment_number}
                    </td>
                    <td className="p-3.5 font-medium text-slate-900 dark:text-white">
                      {formatDate(item.schedule.due_date)}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.daysOverdue >= 30
                            ? 'bg-rose-600 text-white'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {item.daysOverdue} Days Late
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400 text-sm">
                      {formatCurrency(dueAmt)}
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      {/* Phone call link */}
                      <a
                        href={`tel:${item.contract.customer_phone}`}
                        className="inline-flex p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-600 dark:text-slate-300 hover:text-emerald-600"
                        title="Call Customer"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>

                      {/* WhatsApp Reminder link */}
                      <a
                        href={getWhatsAppLink(
                          item.contract.customer_phone,
                          item.contract.customer_name,
                          dueAmt,
                          item.contract.contract_number
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-600 dark:text-slate-300 hover:text-emerald-600"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>

                      {/* Collect Payment Button */}
                      <button
                        onClick={() => setActiveView('payment-collection')}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs"
                      >
                        Collect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOverdue.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="text-sm font-semibold">No overdue accounts match your filter criteria!</p>
            <p className="text-xs mt-1">All customer payments are up-to-date.</p>
          </div>
        )}
      </div>
    </div>
  );
};
