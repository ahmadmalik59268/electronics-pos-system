import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PackagePlus,
  Search,
  PlusCircle,
  Truck,
  CheckCircle2,
  Trash2,
  X,
  FileText,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { PurchaseItem } from '../../types';

export const PurchasesView: React.FC = () => {
  const { purchases, suppliers, products, createPurchase, addToast } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Selected product to add to cart
  const [selectedProdId, setSelectedProdId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemCost, setItemCost] = useState(0);

  const totalAmount = items.reduce((acc, it) => acc + it.total, 0);

  const handleAddItem = () => {
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) {
      addToast('error', 'Select a product first.');
      return;
    }
    const cost = itemCost || prod.purchase_price;
    const newItem: PurchaseItem = {
      product_id: prod.id,
      product_name: prod.name,
      quantity: itemQty,
      unit_cost: cost,
      total: itemQty * cost,
    };
    setItems([...items, newItem]);
    setSelectedProdId('');
    setItemQty(1);
    setItemCost(0);
  };

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      addToast('error', 'Please select a supplier.');
      return;
    }
    if (items.length === 0) {
      addToast('error', 'Please add at least one item to restock.');
      return;
    }

    const sup = suppliers.find((s) => s.id === supplierId);
    createPurchase({
      supplier_id: supplierId,
      supplier_name: sup?.name || sup?.company || 'Supplier',
      items,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      notes,
    });

    setModalOpen(false);
    setItems([]);
    setPaidAmount(0);
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-indigo-600" />
            Purchases & Wholesale Restock
          </h2>
          <p className="text-xs text-slate-500">
            Record wholesale shipments, update inventory quantities, and manage supplier payables.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Stock In / Purchase</span>
        </button>
      </div>

      {/* Purchases History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">PO Number</th>
                <th className="p-3.5">Supplier / Vendor</th>
                <th className="p-3.5">Items Restocked</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Total Bill</th>
                <th className="p-3.5">Paid</th>
                <th className="p-3.5">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {purchases.map((p) => {
                const bal = p.total_amount - p.paid_amount;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      {p.purchase_number}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {p.supplier_name}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {p.items.map((i) => `${i.product_name} (${i.quantity} pcs)`).join(', ')}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {formatCurrency(p.total_amount)}
                    </td>
                    <td className="p-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.paid_amount)}
                    </td>
                    <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(bal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {purchases.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <PackagePlus className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No purchase records found</p>
          </div>
        )}
      </div>

      {/* New Purchase Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Wholesale Restock</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Supplier *</label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.company || s.company_name || s.name} ({s.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Add item to PO */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <p className="font-bold text-slate-700 dark:text-slate-300">Add Item to Purchase</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProdId}
                      onChange={(e) => {
                        setSelectedProdId(e.target.value);
                        const p = products.find((pr) => pr.id === e.target.value);
                        if (p) setItemCost(p.purchase_price);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={itemQty}
                      onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      placeholder="Cost (Rs.)"
                      value={itemCost || ''}
                      onChange={(e) => setItemCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-bold"
                >
                  + Add Item
                </button>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Items ({items.length})</p>
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <span>{it.product_name} x {it.quantity}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{formatCurrency(it.total)}</span>
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Total Purchase Value</label>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div>
                  <label className="font-bold text-emerald-700 dark:text-emerald-400">Paid to Supplier (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
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
                  disabled={items.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Confirm Restock & Save PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
