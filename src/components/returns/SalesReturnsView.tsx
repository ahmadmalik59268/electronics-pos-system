import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RotateCcw, Search, PlusCircle, CheckCircle2, X } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

export const SalesReturnsView: React.FC = () => {
  const { returns, sales, products, createSalesReturn, addToast } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [refundAmount, setRefundAmount] = useState(0);
  const [reason, setReason] = useState('Customer Exchange / Return');

  const selectedSale = sales.find((s) => s.id === selectedSaleId);

  const handleSaveReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) {
      addToast('error', 'Please select a product.');
      return;
    }

    createSalesReturn({
      sale_id: selectedSaleId || undefined,
      customer_id: selectedSale?.customer_id,
      customer_name: selectedSale?.customer_name || 'Walk-in Customer',
      items: [
        {
          product_id: prod.id,
          product_name: prod.name,
          quantity,
          unit_price: prod.cash_price,
          refund_amount: refundAmount || prod.cash_price * quantity,
        },
      ],
      total_refund_amount: refundAmount || prod.cash_price * quantity,
      reason,
      restock_inventory: true,
    });

    setModalOpen(false);
    setSelectedSaleId('');
    setSelectedProductId('');
    setQuantity(1);
    setRefundAmount(0);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-indigo-600" />
            Sales Returns & Customer Refunds
          </h2>
          <p className="text-xs text-slate-500">
            Process customer returns, issue cash refunds, and automatically restore item stock.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Sales Return</span>
        </button>
      </div>

      {/* Returns Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Return #</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Returned Product</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Reason</th>
                <th className="p-3.5">Refund Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {returns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {r.return_number}
                  </td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    {r.customer_name}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">
                    {r.items.map((i) => `${i.product_name} (${i.quantity} pcs)`).join(', ')}
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300">
                    {r.reason}
                  </td>
                  <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(r.total_refund_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {returns.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No sales returns recorded yet.</p>
          </div>
        )}
      </div>

      {/* Return Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Process Sales Return</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReturn} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Product Returned *</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const p = products.find((pr) => pr.id === e.target.value);
                    if (p) setRefundAmount(p.cash_price * quantity);
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrency(p.cash_price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => {
                      const q = parseInt(e.target.value) || 1;
                      setQuantity(q);
                      const p = products.find((pr) => pr.id === selectedProductId);
                      if (p) setRefundAmount(p.cash_price * q);
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Refund Amount (Rs.) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={refundAmount || ''}
                    onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Reason for Return</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Defective Screen / Customer Changed Mind"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Item will be automatically returned to store inventory stock.
              </p>

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
                  Confirm Return & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
