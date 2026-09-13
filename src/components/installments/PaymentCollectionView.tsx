import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  HandCoins,
  CheckCircle2,
  CalendarCheck,
  CreditCard,
  Printer,
  Clock,
  AlertTriangle,
  FileText,
  User,
  Sparkles,
  Receipt,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency, formatDate, getDaysOverdue } from '../../lib/utils';
import { InstallmentContract, InstallmentScheduleItem, PaymentMethod } from '../../types';

export const PaymentCollectionView: React.FC = () => {
  const {
    contracts,
    payments,
    recordInstallmentPayment,
    openPrintModal,
    addToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Search filtered active/overdue contracts
  const matchedContracts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return contracts.filter((c) => c.status !== 'completed').slice(0, 10);
    return contracts.filter(
      (c) =>
        (c.contract_number || '').toLowerCase().includes(q) ||
        (c.customer_name || '').toLowerCase().includes(q) ||
        (c.customer_phone || '').toLowerCase().includes(q) ||
        (c.customer_cnic || '').toLowerCase().includes(q) ||
        (c.product_summary || '').toLowerCase().includes(q)
    );
  }, [contracts, searchQuery]);

  // Selected Contract
  const selectedContract = useMemo(() => {
    return contracts.find((c) => c.id === selectedContractId);
  }, [contracts, selectedContractId]);

  // Pending Schedules for selected contract
  const pendingSchedules = useMemo(() => {
    if (!selectedContract) return [];
    return (selectedContract.schedule || []).filter((s) => s.status !== 'paid');
  }, [selectedContract]);

  // Financial calculations for the selected contract
  const contractStats = useMemo(() => {
    if (!selectedContract) return null;
    const sched = selectedContract.schedule || [];
    const qistPaid = sched.reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);
    const advancePaid = Number(selectedContract.down_payment) || 0;
    const totalPaid = advancePaid + qistPaid;
    const totalDeal = Number(selectedContract.total_installment_price) || 0;
    const remaining = Math.max(0, totalDeal - totalPaid);
    const paidCount = sched.filter((s) => s.status === 'paid').length;
    const totalCount = selectedContract.installment_count || sched.length || 0;
    const remainingCount = Math.max(0, totalCount - paidCount);
    const monthlyDue = selectedContract.installment_amount || (totalCount > 0 ? Math.round(remaining / Math.max(1, remainingCount)) : 0);

    return {
      totalDeal,
      advancePaid,
      qistPaid,
      totalPaid,
      remaining,
      paidCount,
      totalCount,
      remainingCount,
      monthlyDue,
    };
  }, [selectedContract]);

  // Handle select schedule
  const handleSelectSchedule = (s: InstallmentScheduleItem) => {
    setSelectedScheduleId(s.id);
    const balance = s.amount_due - (s.amount_paid || 0);
    setAmount(balance.toString());
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmt = parseFloat(amount);
    if (!selectedContract) {
      addToast('error', 'Please select a customer contract.');
      return;
    }
    if (!payAmt || payAmt <= 0) {
      addToast('error', 'Please enter a valid payment amount.');
      return;
    }

    setIsProcessing(true);
    try {
      const payment = await recordInstallmentPayment({
        contract_id: selectedContract.id,
        amount: payAmt,
        payment_method: paymentMethod,
        notes,
      });

      // Open print receipt
      openPrintModal('payment_receipt', payment);
      addToast('success', `Rs. ${payAmt.toLocaleString()} collected! Receipt #${payment.receipt_number} generated.`, 'Payment Recorded');

      // Reset Form
      setAmount('');
      setSelectedScheduleId('');
      setNotes('');
    } catch (err: any) {
      addToast('error', err.message || 'Payment processing failed', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Recent Collections
  const recentPayments = useMemo(() => {
    return payments.slice(0, 10);
  }, [payments]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      {/* Left Column: Contract Finder & Payment Form (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Step 1: Find Customer / Contract */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-amber-500" />
              Collect Installment Payment
            </h3>
            <p className="text-xs text-slate-500">
              Search by customer name, phone number, CNIC, or contract number
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, phone, CNIC, or contract number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Quick Select Contract List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {matchedContracts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No active installment contracts found. Try searching by name or phone.
              </p>
            ) : (
              matchedContracts.map((c) => {
                const isSelected = selectedContractId === c.id;
                const isOverdue =
                  c.status === 'overdue' ||
                  (c.schedule || []).some((s) => s.status !== 'paid' && new Date(s.due_date) < new Date());

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedContractId(c.id);
                      setSelectedScheduleId('');
                      setAmount(c.installment_amount ? c.installment_amount.toString() : '');
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{c.customer_name}</span>
                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {c.contract_number}
                        </span>
                        {isOverdue && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {c.product_summary} • Phone: {c.customer_phone}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Remaining Balance</p>
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(c.outstanding_amount ?? c.remaining_balance ?? 0)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Step 2: Customer Financial Overview & Payment Entry */}
        {selectedContract && contractStats && (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 animate-fadeIn">
            {/* Customer Financial Snapshot */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {selectedContract.customer_name} - Account Overview
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Contract #{selectedContract.contract_number} • Phone: {selectedContract.customer_phone}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                  Monthly Due: {formatCurrency(contractStats.monthlyDue)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-white/10">
                  <span className="text-slate-300 text-[10px]">Total Contract</span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {formatCurrency(contractStats.totalDeal)}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/10">
                  <span className="text-blue-300 text-[10px]">Advance / Down Pay</span>
                  <p className="text-sm font-bold text-blue-300 mt-0.5">
                    {formatCurrency(contractStats.advancePaid)}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                  <span className="text-emerald-300 text-[10px]">Installments Paid</span>
                  <p className="text-sm font-bold text-emerald-300 mt-0.5">
                    {formatCurrency(contractStats.qistPaid)}
                  </p>
                  <span className="text-[10px] text-emerald-200 block">
                    ✓ {contractStats.paidCount} of {contractStats.totalCount} Cleared
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                  <span className="text-rose-300 text-[10px]">Remaining Balance</span>
                  <p className="text-sm font-bold text-rose-300 mt-0.5">
                    {formatCurrency(contractStats.remaining)}
                  </p>
                  <span className="text-[10px] text-rose-200 block">
                    {contractStats.remainingCount} Installments Left
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block mb-1.5">
                Quick Pay Shortcuts:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAmount(contractStats.monthlyDue.toString())}
                  className="py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-center hover:bg-indigo-100 text-xs"
                >
                  1 Installment ({formatCurrency(contractStats.monthlyDue)})
                </button>
                <button
                  type="button"
                  onClick={() => setAmount((contractStats.monthlyDue * 2).toString())}
                  className="py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-center hover:bg-indigo-100 text-xs"
                >
                  2 Installments ({formatCurrency(contractStats.monthlyDue * 2)})
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(contractStats.remaining.toString())}
                  className="py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-center hover:bg-emerald-100 text-xs"
                >
                  Full Balance ({formatCurrency(contractStats.remaining)})
                </button>
              </div>
            </div>

            {/* Unpaid installments list */}
            {pendingSchedules.length > 0 && (
              <div>
                <div className="pb-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Or Select Specific Month Schedule:
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pendingSchedules.map((sch) => {
                    const isSelected = selectedScheduleId === sch.id;
                    const isLate = sch.status === 'overdue' || new Date(sch.due_date) < new Date();
                    const dueAmt = sch.amount_due - (sch.amount_paid || 0);

                    return (
                      <div
                        key={sch.id}
                        onClick={() => handleSelectSchedule(sch)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Installment #{sch.installment_number}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isLate ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isLate ? 'Overdue' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700">
                          <span className="text-[11px] text-slate-500">{formatDate(sch.due_date)}</span>
                          <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(dueAmt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment Input Form */}
            <form onSubmit={handleSubmitPayment} className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Collection Amount (Rs.) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="cash">Cash (Counter)</option>
                    <option value="bank">Bank Transfer / Deposit</option>
                    <option value="mobile_wallet">JazzCash / Easypaisa</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Remarks / Month (Optional)</label>
                <input
                  type="text"
                  placeholder="Optional receipt notes (e.g. Month of March Qist paid in full)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-md shadow-amber-500/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {isProcessing ? 'Recording...' : `Receive Rs. ${Number(amount || 0).toLocaleString()} & Print Receipt`}
                </span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right Column: Recent Collections Activity (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" />
                Recent Collections Feed
              </h3>
              <p className="text-[11px] text-slate-500">Live installment payments log</p>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {payments.length} Payments
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {recentPayments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No payment transactions recorded yet.
              </div>
            ) : (
              recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs hover:border-slate-300"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white">{p.customer_name}</span>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        ({p.receipt_number})
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {formatDate(p.payment_date)} • <span className="capitalize">{p.payment_method}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      +{formatCurrency(p.amount)}
                    </span>
                    <button
                      onClick={() => openPrintModal('payment_receipt', p)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      title="Reprint Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
