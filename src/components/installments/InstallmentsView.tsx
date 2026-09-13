import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  CalendarCheck,
  CalendarClock,
  HandCoins,
  AlertTriangle,
  FileText,
  Printer,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
  Users,
  ShieldCheck,
  PlusCircle,
  X,
  CreditCard,
  Receipt,
  Wallet,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  Phone,
} from 'lucide-react';
import { formatCurrency, formatDate, getDaysOverdue } from '../../lib/utils';
import { InstallmentContract, InstallmentScheduleItem, PaymentRecord } from '../../types';

export const InstallmentsView: React.FC = () => {
  const {
    contracts,
    payments,
    openPrintModal,
    setActiveView,
    addToast,
    recordInstallmentPayment,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'completed'>('all');
  const [selectedContract, setSelectedContract] = useState<InstallmentContract | null>(null);
  const [modalTab, setModalTab] = useState<'schedule' | 'receipts'>('schedule');

  // Quick Payment Modal from inside details
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<InstallmentScheduleItem | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'cash' | 'bank' | 'mobile_wallet'>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync selected contract when contracts update (e.g. after payment)
  useEffect(() => {
    if (selectedContract) {
      const refreshed = contracts.find((c) => c.id === selectedContract.id);
      if (refreshed) {
        setSelectedContract(refreshed);
      }
    }
  }, [contracts]);

  // Overall Financial Portfolio Summary
  const portfolioStats = useMemo(() => {
    let totalContractVolume = 0;
    let totalAdvanceCollected = 0;
    let totalQistCollected = 0;
    let totalOutstandingBalance = 0;
    let totalPaidInstallmentsCount = 0;
    let totalScheduledInstallments = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let activeContractsCount = 0;

    const today = new Date();

    contracts.forEach((c) => {
      const sched = c.schedule || [];
      const cTotal = Number(c.total_installment_price) || 0;
      const cAdvance = Number(c.down_payment) || 0;
      const cQistPaid = sched.reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);
      const cPaid = cAdvance + cQistPaid;
      const cRemaining = Math.max(0, cTotal - cPaid);

      totalContractVolume += cTotal;
      totalAdvanceCollected += cAdvance;
      totalQistCollected += cQistPaid;
      totalOutstandingBalance += cRemaining;
      totalScheduledInstallments += (c.installment_count || sched.length || 0);

      const paidSched = sched.filter((s) => s.status === 'paid');
      totalPaidInstallmentsCount += paidSched.length;

      const hasOverdue =
        c.status === 'overdue' ||
        sched.some((s) => s.status !== 'paid' && new Date(s.due_date) < today);

      if (hasOverdue) {
        overdueCount++;
        const lateSum = sched
          .filter((s) => s.status !== 'paid' && new Date(s.due_date) < today)
          .reduce((sum, s) => sum + (s.amount_due - (s.amount_paid || 0)), 0);
        overdueAmount += lateSum;
      }

      if (c.status !== 'completed' && cRemaining > 0) {
        activeContractsCount++;
      }
    });

    const totalCollected = totalAdvanceCollected + totalQistCollected;

    return {
      totalContractVolume,
      totalAdvanceCollected,
      totalQistCollected,
      totalCollected,
      totalOutstandingBalance,
      totalPaidInstallmentsCount,
      totalScheduledInstallments,
      activeContractsCount,
      overdueCount,
      overdueAmount,
    };
  }, [contracts]);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const contractNum = (c.contract_number || '').toLowerCase();
      const custName = (c.customer_name || '').toLowerCase();
      const custPhone = (c.customer_phone || '').toLowerCase();
      const custCnic = (c.customer_cnic || '').toLowerCase();
      const prodSummary = (c.product_summary || '').toLowerCase();

      const matchesSearch =
        !q ||
        contractNum.includes(q) ||
        custName.includes(q) ||
        custPhone.includes(q) ||
        custCnic.includes(q) ||
        prodSummary.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [contracts, statusFilter, searchQuery]);

  // Receipts for the selected contract
  const contractReceipts = useMemo(() => {
    if (!selectedContract) return [];
    return payments.filter(
      (p) =>
        p.contract_id === selectedContract.id ||
        p.contract_number === selectedContract.contract_number
    );
  }, [payments, selectedContract]);

  // Handle Open Quick Payment Modal
  const handleOpenPayment = (contract: InstallmentContract, item?: InstallmentScheduleItem) => {
    setSelectedContract(contract);
    if (item) {
      setSelectedScheduleItem(item);
      setPayAmount(Math.max(0, item.amount_due - (item.amount_paid || 0)));
    } else {
      const firstUnpaid = (contract.schedule || []).find((s) => s.status !== 'paid');
      setSelectedScheduleItem(firstUnpaid || null);
      if (firstUnpaid) {
        setPayAmount(Math.max(0, firstUnpaid.amount_due - (firstUnpaid.amount_paid || 0)));
      } else {
        const remaining = contract.outstanding_amount ?? contract.remaining_balance ?? 0;
        setPayAmount(remaining);
      }
    }
    setPaymentModalOpen(true);
  };

  // Submit Payment Handler
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract || payAmount <= 0) return;

    setIsProcessing(true);
    try {
      const payment = await recordInstallmentPayment({
        contract_id: selectedContract.id,
        amount: payAmount,
        payment_method: payMethod,
        notes: payNotes,
      });

      // Update local contract preview state
      const refreshed = contracts.find((c) => c.id === selectedContract.id);
      if (refreshed) {
        setSelectedContract(refreshed);
      }

      setPaymentModalOpen(false);
      setPayNotes('');
      openPrintModal('payment_receipt', payment);
      addToast(
        'success',
        `Rs. ${payAmount.toLocaleString()} received successfully! Receipt #${payment.receipt_number} generated.`,
        'Installment Collected'
      );
    } catch (err: any) {
      addToast('error', err.message || 'Payment collection failed', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Fast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" />
            Installment (Qist) Contracts & Ledgers
          </h2>
          <p className="text-xs text-slate-500">
            Track customer installment ledgers, payment schedules, collections, and print receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('payment-collection')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all active:scale-95"
          >
            <HandCoins className="w-4 h-4" />
            <span>Collect Payment</span>
          </button>
          <button
            onClick={() => setActiveView('installment-new')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Qist Contract</span>
          </button>
        </div>
      </div>

      {/* Portfolio Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Qist Sales Booked */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Contract Volume</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1.5">
            {formatCurrency(portfolioStats.totalContractVolume)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {contracts.length} Total Contracts ({portfolioStats.activeContractsCount} Active)
          </p>
        </div>

        {/* Total Advance Collected */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Advance Collected</span>
            <Wallet className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 mt-1.5">
            {formatCurrency(portfolioStats.totalAdvanceCollected)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Initial down payment collected
          </p>
        </div>

        {/* Total Installments Received */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <span>Installments Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1.5">
            {formatCurrency(portfolioStats.totalQistCollected)}
          </p>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-1 font-semibold">
            ✓ {portfolioStats.totalPaidInstallmentsCount} of {portfolioStats.totalScheduledInstallments} Installments Cleared
          </p>
        </div>

        {/* Total Collected (Advance + Qist) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Recovered</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            {formatCurrency(portfolioStats.totalCollected)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Advance + Installments Received
          </p>
        </div>

        {/* Total Outstanding Balance */}
        <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-800 dark:text-rose-300 text-xs font-semibold">
            <span>Outstanding Balance</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-1.5">
            {formatCurrency(portfolioStats.totalOutstandingBalance)}
          </p>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400 mt-1 font-semibold">
            {portfolioStats.overdueCount > 0 ? `${portfolioStats.overdueCount} Accounts Overdue` : 'All Accounts Up to Date'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Contract #, Customer Name, Phone, CNIC, or Product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['all', 'active', 'overdue', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st} Contracts
            </button>
          ))}
        </div>
      </div>

      {/* Contracts Table & Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Mobile View: High Visibility Touch Cards (block md:hidden) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredContracts.map((cnt) => {
            const sched = cnt.schedule || [];
            const qistPaid = sched.reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);
            const advancePaid = Number(cnt.down_payment) || 0;
            const totalPaid = advancePaid + qistPaid;
            const totalDeal = Number(cnt.total_installment_price) || 0;
            const remaining = Math.max(0, totalDeal - totalPaid);
            const paidCount = sched.filter((s) => s.status === 'paid').length;
            const totalCount = cnt.installment_count || sched.length || 0;
            const remainingCount = Math.max(0, totalCount - paidCount);

            const isOverdue =
              cnt.status === 'overdue' ||
              sched.some((s) => s.status !== 'paid' && new Date(s.due_date) < new Date());
            const isCompleted = cnt.status === 'completed' || remaining <= 0;

            return (
              <div
                key={cnt.id}
                className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                onClick={() => {
                  setSelectedContract(cnt);
                  setModalTab('schedule');
                }}
              >
                {/* Header: Contract # + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                      {cnt.contract_number}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : isOverdue
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Active'}
                    </span>
                  </div>

                  {cnt.next_due_date && remaining > 0 ? (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Next Due</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {formatDate(cnt.next_due_date)}
                      </span>
                      {isOverdue && (
                        <span className="text-[9px] font-bold text-rose-600 block">
                          {getDaysOverdue(cnt.next_due_date)}d Overdue
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600">✓ Cleared</span>
                  )}
                </div>

                {/* Customer & Product */}
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {cnt.customer_name}
                    </h4>
                    {cnt.customer_phone && (
                      <a
                        href={`tel:${cnt.customer_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{cnt.customer_phone}</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {cnt.product_summary} • {cnt.installment_count} Mos ({formatCurrency(cnt.installment_amount)}/mo)
                  </p>
                </div>

                {/* 3 Metrics: Total Deal, Paid, Remaining */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Deal</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(totalDeal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Paid ({paidCount}/{totalCount})</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalPaid)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Remaining</span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {!isCompleted && (
                    <button
                      onClick={() => handleOpenPayment(cnt)}
                      className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                    >
                      <HandCoins className="w-3.5 h-3.5" />
                      <span>Collect Qist</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedContract(cnt);
                      setModalTab('schedule');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Ledger</span>
                  </button>
                  <button
                    onClick={() => openPrintModal('installment_contract', cnt)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                    title="Print Agreement"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Full High Density Data Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Contract #</th>
                <th className="p-3.5">Customer & Phone</th>
                <th className="p-3.5">Product & Duration</th>
                <th className="p-3.5">Total Deal</th>
                <th className="p-3.5">Advance</th>
                <th className="p-3.5">Installments Paid</th>
                <th className="p-3.5">Total Paid</th>
                <th className="p-3.5">Remaining Balance</th>
                <th className="p-3.5">Next Due</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredContracts.map((cnt) => {
                const sched = cnt.schedule || [];
                const qistPaid = sched.reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);
                const advancePaid = Number(cnt.down_payment) || 0;
                const totalPaid = advancePaid + qistPaid;
                const totalDeal = Number(cnt.total_installment_price) || 0;
                const remaining = Math.max(0, totalDeal - totalPaid);
                const paidCount = sched.filter((s) => s.status === 'paid').length;
                const totalCount = cnt.installment_count || sched.length || 0;
                const remainingCount = Math.max(0, totalCount - paidCount);

                const isOverdue =
                  cnt.status === 'overdue' ||
                  sched.some((s) => s.status !== 'paid' && new Date(s.due_date) < new Date());
                const isCompleted = cnt.status === 'completed' || remaining <= 0;

                return (
                  <tr
                    key={cnt.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedContract(cnt);
                      setModalTab('schedule');
                    }}
                  >
                    <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                      {cnt.contract_number}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">{cnt.customer_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{cnt.customer_phone}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-slate-900 dark:text-white line-clamp-1">
                        {cnt.product_summary}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {cnt.installment_count} Mos ({formatCurrency(cnt.installment_amount)}/mo)
                      </p>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {formatCurrency(totalDeal)}
                    </td>
                    <td className="p-3.5 font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(advancePaid)}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(qistPaid)}
                      </p>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        {paidCount} / {totalCount} Qist
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(totalPaid)}
                    </td>
                    <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">
                      <p>{formatCurrency(remaining)}</p>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {remainingCount} Qist Left
                      </span>
                    </td>
                    <td className="p-3.5">
                      {cnt.next_due_date && remaining > 0 ? (
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {formatDate(cnt.next_due_date)}
                          </p>
                          {isOverdue && (
                            <span className="text-[10px] text-rose-600 font-bold">
                              {getDaysOverdue(cnt.next_due_date)}d Overdue
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-600 font-bold">✓ Cleared</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isOverdue
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Active'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      {!isCompleted && (
                        <button
                          onClick={() => handleOpenPayment(cnt)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] shadow-xs"
                          title="Collect Next Installment"
                        >
                          Collect
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedContract(cnt);
                          setModalTab('schedule');
                        }}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="View Full Ledger / Passbook"
                      >
                        <Eye className="w-4 h-4 text-indigo-500" />
                      </button>
                      <button
                        onClick={() => openPrintModal('installment_contract', cnt)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Print Agreement"
                      >
                        <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredContracts.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No installment contracts found</p>
            <p className="text-xs mt-1">Try switching status filters or search keywords.</p>
          </div>
        )}
      </div>

      {/* Contract Detail Modal / Full Ledger Passbook */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                      {selectedContract.contract_number}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        selectedContract.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedContract.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {selectedContract.status}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      ({selectedContract.customer_name})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    Booked on {formatDate(selectedContract.created_at)} • {selectedContract.installment_count} Mo Term • {selectedContract.product_summary}
                  </p>
                </div>
                {/* Mobile Close Button */}
                <button
                  onClick={() => setSelectedContract(null)}
                  className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleOpenPayment(selectedContract)}
                  className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <HandCoins className="w-3.5 h-3.5" />
                  <span>Collect Payment</span>
                </button>
                <button
                  onClick={() => openPrintModal('installment_contract', selectedContract)}
                  className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Agreement</span>
                </button>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="hidden sm:block p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Detailed Financial Calculation Bar */}
              {(() => {
                const sched = selectedContract.schedule || [];
                const qistPaid = sched.reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);
                const advancePaid = Number(selectedContract.down_payment) || 0;
                const totalPaid = advancePaid + qistPaid;
                const totalDeal = Number(selectedContract.total_installment_price) || 0;
                const remaining = Math.max(0, totalDeal - totalPaid);
                const paidCount = sched.filter((s) => s.status === 'paid').length;
                const totalCount = selectedContract.installment_count || sched.length || 0;
                const remainingCount = Math.max(0, totalCount - paidCount);

                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Financial Breakdown
                      </span>
                      <span className="text-xs text-slate-300">
                        Monthly Due: <strong>{formatCurrency(selectedContract.installment_amount)}/month</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                        <span className="text-slate-300 text-[11px]">Total Contract Price</span>
                        <p className="text-base font-black text-white mt-0.5">
                          {formatCurrency(totalDeal)}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                        <span className="text-blue-300 text-[11px]">Advance / Down Payment</span>
                        <p className="text-base font-black text-blue-300 mt-0.5">
                          {formatCurrency(advancePaid)}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                        <span className="text-emerald-300 text-[11px]">Installments Paid</span>
                        <p className="text-base font-black text-emerald-300 mt-0.5">
                          {formatCurrency(qistPaid)}
                        </p>
                        <span className="text-[10px] text-emerald-200">
                          {paidCount} of {totalCount} Installments Cleared
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                        <span className="text-slate-300 text-[11px]">Total Paid Amount</span>
                        <p className="text-base font-black text-emerald-400 mt-0.5">
                          {formatCurrency(totalPaid)}
                        </p>
                        <span className="text-[10px] text-slate-400">Advance + Installments</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 col-span-2 sm:col-span-1">
                        <span className="text-rose-300 text-[11px]">Remaining Balance</span>
                        <p className="text-base font-black text-rose-300 mt-0.5">
                          {formatCurrency(remaining)}
                        </p>
                        <span className="text-[10px] text-rose-200 font-semibold">
                          {remainingCount} Installments Left
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Customer & Guarantor Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Customer Details
                  </h4>
                  <p><strong className="text-slate-600 dark:text-slate-300">Name:</strong> {selectedContract.customer_name}</p>
                  <p><strong className="text-slate-600 dark:text-slate-300">Phone:</strong> {selectedContract.customer_phone}</p>
                  <p><strong className="text-slate-600 dark:text-slate-300">CNIC:</strong> {selectedContract.customer_cnic || 'N/A'}</p>
                  <p><strong className="text-slate-600 dark:text-slate-300">Address:</strong> {selectedContract.customer_address || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Guarantor / Reference Details
                  </h4>
                  {selectedContract.guarantor1 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {selectedContract.guarantor1.image_url && (
                          <img
                            src={selectedContract.guarantor1.image_url}
                            alt="Guarantor 1"
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                          />
                        )}
                        <div>
                          <p><strong className="text-slate-600 dark:text-slate-300">G1:</strong> {selectedContract.guarantor1.name}</p>
                          <p><strong className="text-slate-600 dark:text-slate-300">Phone:</strong> {selectedContract.guarantor1.phone}</p>
                          <p><strong className="text-slate-600 dark:text-slate-300">CNIC:</strong> {selectedContract.guarantor1.cnic}</p>
                        </div>
                      </div>
                      {selectedContract.guarantor2?.name && (
                        <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                          {selectedContract.guarantor2.image_url && (
                            <img
                              src={selectedContract.guarantor2.image_url}
                              alt="Guarantor 2"
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                            />
                          )}
                          <div>
                            <p><strong className="text-slate-600 dark:text-slate-300">G2:</strong> {selectedContract.guarantor2.name}</p>
                            <p><strong className="text-slate-600 dark:text-slate-300">Phone:</strong> {selectedContract.guarantor2.phone}</p>
                            <p><strong className="text-slate-600 dark:text-slate-300">CNIC:</strong> {selectedContract.guarantor2.cnic}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400">No primary guarantor recorded.</p>
                  )}
                </div>
              </div>

              {/* Tabs: Schedule vs Receipts History */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <button
                    onClick={() => setModalTab('schedule')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      modalTab === 'schedule'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <CalendarClock className="w-4 h-4" />
                    <span>Installment Schedule ({selectedContract.schedule?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setModalTab('receipts')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      modalTab === 'receipts'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Payment Receipts Log ({contractReceipts.length})</span>
                  </button>
                </div>

                {/* Tab 1: Installment Repayment Schedule */}
                {modalTab === 'schedule' && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[540px]">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Due Date</th>
                          <th className="p-3">Due Amount</th>
                          <th className="p-3">Paid Amount</th>
                          <th className="p-3">Balance on Qist</th>
                          <th className="p-3">Paid Date</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(selectedContract.schedule || []).map((sch) => {
                          const isPaid = sch.status === 'paid';
                          const isSchOverdue =
                            sch.status === 'overdue' ||
                            (!isPaid && new Date(sch.due_date) < new Date());
                          const remainingOnQist = Math.max(0, sch.amount_due - (sch.amount_paid || 0));

                          return (
                            <tr key={sch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="p-3 font-bold text-slate-900 dark:text-white">
                                #{sch.installment_number}
                              </td>
                              <td className="p-3 font-medium text-slate-900 dark:text-white">
                                {formatDate(sch.due_date)}
                              </td>
                              <td className="p-3 font-bold text-slate-900 dark:text-white">
                                {formatCurrency(sch.amount_due)}
                              </td>
                              <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                {sch.amount_paid > 0 ? formatCurrency(sch.amount_paid) : '-'}
                              </td>
                              <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                                {remainingOnQist > 0 ? formatCurrency(remainingOnQist) : '✓ 0'}
                              </td>
                              <td className="p-3 text-slate-500">
                                {sch.paid_date ? formatDate(sch.paid_date) : '-'}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    isPaid
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : isSchOverdue
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      : sch.status === 'partially_paid'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  }`}
                                >
                                  {isPaid ? 'Paid' : isSchOverdue ? 'Overdue' : sch.status === 'partially_paid' ? 'Partial' : 'Pending'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                {!isPaid ? (
                                  <button
                                    onClick={() => handleOpenPayment(selectedContract, sch)}
                                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs"
                                  >
                                    Collect
                                  </button>
                                ) : (
                                  <span className="text-emerald-600 text-xs font-semibold">✓ Cleared</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}

                {/* Tab 2: Payment Receipts Log */}
                {modalTab === 'receipts' && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {contractReceipts.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No receipts issued yet. When an advance or installment payment is collected, the receipt will appear here.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[620px]">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                            <tr>
                              <th className="p-3">Receipt #</th>
                              <th className="p-3">Payment Date</th>
                              <th className="p-3">Amount Received</th>
                              <th className="p-3">Channel</th>
                              <th className="p-3">Balance After</th>
                              <th className="p-3">Collected By</th>
                              <th className="p-3">Remarks</th>
                              <th className="p-3 text-right">Print</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {contractReceipts.map((rcp) => (
                              <tr key={rcp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {rcp.receipt_number}
                                </td>
                                <td className="p-3 text-slate-900 dark:text-white font-medium">
                                  {formatDate(rcp.payment_date)}
                                </td>
                                <td className="p-3 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                  {formatCurrency(rcp.amount)}
                                </td>
                                <td className="p-3 uppercase font-semibold text-slate-600 dark:text-slate-300">
                                  {rcp.payment_method}
                                </td>
                                <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                                  {formatCurrency(rcp.remaining_balance)}
                                </td>
                                <td className="p-3 text-slate-500">
                                  {rcp.collected_by || 'Staff'}
                                </td>
                                <td className="p-3 text-slate-500 max-w-[150px] truncate">
                                  {rcp.notes || '-'}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => openPrintModal('payment_receipt', rcp)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium text-xs"
                                    title="Reprint Receipt"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Payment Modal */}
      {paymentModalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-amber-500" />
                  Collect Installment Payment
                </h3>
                <p className="text-xs text-slate-500">{selectedContract.customer_name} ({selectedContract.contract_number})</p>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Financial State */}
            {(() => {
              const currentOutstanding = selectedContract.outstanding_amount ?? selectedContract.remaining_balance ?? 0;
              const monthly = selectedContract.installment_amount || 0;
              const newBalance = Math.max(0, currentOutstanding - payAmount);

              return (
                <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Current Balance:</span>
                      <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(currentOutstanding)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Monthly Due:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">{formatCurrency(monthly)}</strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 text-slate-900 dark:text-white font-bold">
                      <span>New Balance After Payment:</span>
                      <strong className={newBalance === 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}>
                        {formatCurrency(newBalance)}
                      </strong>
                    </div>
                  </div>

                  {/* Fast Selection Buttons */}
                  <div>
                    <label className="text-slate-500 text-[11px] font-semibold block mb-1.5">
                      Quick Amount:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPayAmount(monthly)}
                        className="py-1.5 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-center hover:bg-indigo-100 text-[11px]"
                      >
                        1 Qist ({formatCurrency(monthly)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayAmount(monthly * 2)}
                        className="py-1.5 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-center hover:bg-indigo-100 text-[11px]"
                      >
                        2 Qist ({formatCurrency(monthly * 2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayAmount(currentOutstanding)}
                        className="py-1.5 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-center hover:bg-emerald-100 text-[11px]"
                      >
                        Full Clear
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Payment Amount (Rs.) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={payAmount || ''}
                      onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-lg font-black text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Payment Channel</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as any)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="cash">Cash (Counter)</option>
                      <option value="bank">Bank Deposit / Online Transfer</option>
                      <option value="mobile_wallet">JazzCash / Easypaisa</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">Remarks / Month (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Month of March Qist paid in full"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setPaymentModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing || payAmount <= 0}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Confirm & Print Receipt'}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
